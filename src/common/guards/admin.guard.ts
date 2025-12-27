import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
  Inject,
} from '@nestjs/common';
import { AuditAction } from '../../audit/interfaces/audit-event.interface';
import { GuildSettings } from '../../guilds/interfaces/settings.interface';
import type { AuthenticatedUser } from '../interfaces/user.interface';
import type { Request } from 'express';
import type { IPermissionProvider } from '../interfaces/permission-provider.interface';
import type { IAuditProvider } from '../interfaces/audit-provider.interface';
import type { IDiscordProvider } from '../interfaces/discord-provider.interface';
import type { ITokenProvider } from '../interfaces/token-provider.interface';
import type { IGuildAccessProvider } from '../interfaces/guild-access-provider.interface';

interface RequestWithUser extends Request {
  user: AuthenticatedUser | { type: 'bot'; id: string };
  params: Record<string, string>;
}

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);

  /**
   * AdminGuard Constructor - Dependencies
   *
   * Uses dependency inversion with interfaces to break cross-boundary coupling.
   * All dependencies are injected via interfaces, allowing CommonModule to
   * depend on abstractions rather than concrete domain implementations.
   *
   * Interface providers are implemented by adapters in their respective modules
   * and registered in CommonModule via dependency injection tokens.
   */
  constructor(
    @Inject('IPermissionProvider')
    private permissionProvider: IPermissionProvider,
    @Inject('IAuditProvider')
    private auditProvider: IAuditProvider,
    @Inject('IDiscordProvider')
    private discordProvider: IDiscordProvider,
    @Inject('ITokenProvider')
    private tokenProvider: ITokenProvider,
    @Inject('IGuildAccessProvider')
    private guildAccessProvider: IGuildAccessProvider,
  ) {}

  /**
   * Check if user has admin permissions in the specified guild
   * Single Responsibility: Admin permission checking with Discord validation
   * Separation of Concerns: Handles only permission logic, no HTTP concerns
   *
   * Ensures settings exist before checking permissions (auto-creates if missing).
   * Settings are independent of user validation - they exist regardless of who accesses them.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    const guildId = request.params.guildId || request.params.id;

    if (!user || !guildId) {
      this.logger.warn('AdminGuard: Missing user or guildId');
      throw new ForbiddenException('Authentication and guild ID required');
    }

    try {
      const accessToken = await this.tokenProvider.getValidAccessToken(user.id);
      if (!accessToken) {
        this.logger.warn(
          `AdminGuard: No access token available for user ${user.id}`,
        );
        throw new ForbiddenException('Access token not available');
      }

      // Check Discord permissions first (primary check for Discord admins)
      const guildPermissions = await this.discordProvider.checkGuildPermissions(
        accessToken,
        guildId,
      );

      if (!guildPermissions.isMember) {
        throw new ForbiddenException('You are not a member of this guild');
      }

      // Primary check: Discord Administrator permission
      if (guildPermissions.hasAdministratorPermission) {
        this.logger.log(
          `AdminGuard: User ${user.id} has Discord Administrator permission in guild ${guildId}`,
        );

        await this.auditProvider.logAdminAction(
          {
            userId: user.id,
            guildId,
            action: AuditAction.ADMIN_CHECK,
            resource: request.url || request.path,
            result: 'allowed',
            metadata: {
              method: request.method,
              reason: 'discord_administrator_permission',
            },
          },
          request,
        );

        return true;
      }

      // Ensure settings exist before checking configured roles (auto-creates if missing)
      // This ensures settings are always available for permission checks
      const settings = await this.guildAccessProvider.getSettings(guildId);

      const settingsTyped = settings;
      const adminRoles = settingsTyped?.roles?.admin || [];
      const hasNoAdminRolesConfigured = !adminRoles || adminRoles.length === 0;

      // If no admin roles are configured, allow access for initial setup
      // This allows the first user to configure admin roles
      if (hasNoAdminRolesConfigured) {
        this.logger.warn(
          `No admin roles configured for guild ${guildId}. Allowing access for initial setup.`,
        );

        await this.auditProvider.logAdminAction(
          {
            userId: user.id,
            guildId,
            action: AuditAction.ADMIN_CHECK,
            resource: request.url || request.path,
            result: 'allowed',
            metadata: {
              method: request.method,
              reason: 'no_admin_roles_configured',
            },
          },
          request,
        );

        return true;
      }

      // Get membership from DB for stored roles (single source of truth for roles)
      const membership = await this.guildAccessProvider.findOne(
        user.id,
        guildId,
      );
      if (!membership) {
        this.logger.warn(
          `User ${user.id} is not a member of guild ${guildId} in database`,
        );
        throw new ForbiddenException('You are not a member of this guild');
      }

      // Validate with Discord for final authorization check
      const isAdmin = await this.permissionProvider.checkAdminRoles(
        membership.roles,
        guildId,
        settings as GuildSettings | Record<string, unknown>,
        true, // Validate with Discord for authorization
      );

      await this.auditProvider.logAdminAction(
        {
          userId: user.id,
          guildId,
          action: AuditAction.ADMIN_CHECK,
          resource: request.url || request.path,
          result: isAdmin ? 'allowed' : 'denied',
          metadata: {
            method: request.method,
            reason: isAdmin ? 'configured_admin_role' : 'no_admin_access',
          },
        },
        request,
      );

      if (!isAdmin) {
        throw new ForbiddenException(
          'Admin access required - Discord Administrator permission or configured admin role needed',
        );
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(
        `AdminGuard error for user ${user.id} in guild ${guildId}:`,
        error,
      );
      throw new ForbiddenException('Error checking permissions');
    }
  }
}
