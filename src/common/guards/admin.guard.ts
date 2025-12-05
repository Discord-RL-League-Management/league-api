import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PermissionCheckService } from '../../permissions/modules/permission-check/permission-check.service';
import { AuditLogService } from '../../audit/services/audit-log.service';
import { AuditAction } from '../../audit/interfaces/audit-event.interface';
import { DiscordApiService } from '../../discord/discord-api.service';
import { TokenManagementService } from '../../auth/services/token-management.service';
import { GuildSettingsService } from '../../guilds/guild-settings.service';
import { GuildMembersService } from '../../guild-members/guild-members.service';
import { GuildSettings } from '../../guilds/interfaces/settings.interface';
import type { AuthenticatedUser } from '../interfaces/user.interface';
import type { Request } from 'express';

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
   * Required services and their source modules:
   * - PermissionCheckService: From PermissionCheckModule (imported via CommonModule)
   * - AuditLogService: From AuditModule (imported via CommonModule)
   * - DiscordApiService: From DiscordModule (imported in CommonModule and AuditModule)
   * - TokenManagementService: From TokenManagementModule (imported in CommonModule and AuditModule)
   * - GuildSettingsService: From GuildsModule (imported via CommonModule)
   *
   * Note: All required modules must be imported in both CommonModule (where AdminGuard is provided)
   * and any module that uses AdminGuard (like AuditModule) due to circular dependencies.
   */
  constructor(
    private permissionCheckService: PermissionCheckService,
    private auditLogService: AuditLogService,
    private discordApiService: DiscordApiService,
    private tokenManagementService: TokenManagementService,
    private guildSettingsService: GuildSettingsService,
    private guildMembersService: GuildMembersService,
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
      // Get user's access token for Discord API calls
      const accessToken = await this.tokenManagementService.getValidAccessToken(
        user.id,
      );
      if (!accessToken) {
        this.logger.warn(
          `AdminGuard: No access token available for user ${user.id}`,
        );
        throw new ForbiddenException('Access token not available');
      }

      // Check Discord permissions first (primary check for Discord admins)
      const guildPermissions =
        await this.discordApiService.checkGuildPermissions(
          accessToken,
          guildId,
        );

      if (!guildPermissions.isMember) {
        throw new ForbiddenException('You are not a member of this guild');
      }

      // Check if user has Discord Administrator permission (primary check)
      if (guildPermissions.hasAdministratorPermission) {
        this.logger.log(
          `AdminGuard: User ${user.id} has Discord Administrator permission in guild ${guildId}`,
        );

        await this.auditLogService.logAdminAction(
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
      const settings = await this.guildSettingsService.getSettings(guildId);

      // Check if any admin roles are configured
      const settingsTyped = settings;
      const adminRoles = settingsTyped?.roles?.admin || [];
      const hasNoAdminRolesConfigured = !adminRoles || adminRoles.length === 0;

      // If no admin roles are configured, allow access for initial setup
      // This allows the first user to configure admin roles
      if (hasNoAdminRolesConfigured) {
        this.logger.warn(
          `No admin roles configured for guild ${guildId}. Allowing access for initial setup.`,
        );

        await this.auditLogService.logAdminAction(
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
      const membership = await this.guildMembersService.findOne(
        user.id,
        guildId,
      );
      if (!membership) {
        this.logger.warn(
          `User ${user.id} is not a member of guild ${guildId} in database`,
        );
        throw new ForbiddenException('You are not a member of this guild');
      }

      // Check configured admin roles using stored roles (validate with Discord for final check)
      const isAdmin = await this.permissionCheckService.checkAdminRoles(
        membership.roles,
        guildId,
        settings as GuildSettings | Record<string, unknown>,
        true, // Validate with Discord for authorization
      );

      // Log audit event
      await this.auditLogService.logAdminAction(
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
