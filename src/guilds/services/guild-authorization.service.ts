import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PermissionCheckService } from '../../permissions/modules/permission-check/permission-check.service';
import { GuildAccessValidationService } from './guild-access-validation.service';
import { GuildMembersService } from '../../guild-members/guild-members.service';
import { GuildSettingsService } from '../guild-settings.service';
import { TokenManagementService } from '../../auth/services/token-management.service';
import { DiscordApiService } from '../../discord/discord-api.service';
import { ActivityLogService } from '../../infrastructure/activity-log/services/activity-log.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestContextService } from '../../common/request-context/services/request-context/request-context.service';
import { GuildSettings } from '../interfaces/settings.interface';
import type { AuthenticatedUser } from '../../common/interfaces/user.interface';
import type { Request } from 'express';

/**
 * GuildAuthorizationService - Single Responsibility: Guild authorization logic
 *
 * Handles all guild-level authorization checks including admin permissions
 * with Discord validation and configured roles.
 *
 * Responsibilities:
 * - Check guild admin permissions (with Discord validation)
 * - Check guild admin access (simplified version)
 * - Log authorization decisions for audit purposes
 */
@Injectable()
export class GuildAuthorizationService {
  private readonly logger = new Logger(GuildAuthorizationService.name);

  constructor(
    private readonly permissionCheckService: PermissionCheckService,
    private readonly guildAccessValidationService: GuildAccessValidationService,
    private readonly guildMembersService: GuildMembersService,
    private readonly guildSettingsService: GuildSettingsService,
    private readonly tokenManagementService: TokenManagementService,
    private readonly discordApiService: DiscordApiService,
    private readonly activityLogService: ActivityLogService,
    private readonly prisma: PrismaService,
    private readonly contextService: RequestContextService,
  ) {}

  /**
   * Check if user has admin permissions in the specified guild
   * Handles Discord validation and configured roles
   *
   * @param user - Authenticated user
   * @param guildId - Guild ID to check permissions for
   * @param request - Express request object
   * @returns true if user has admin access
   * @throws ForbiddenException if user doesn't have admin access
   */
  async checkGuildAdmin(
    user: AuthenticatedUser | { type: 'bot'; id: string },
    guildId: string,
    request: Request,
  ): Promise<boolean> {
    if (!user || !guildId) {
      this.logger.warn('GuildAuthorizationService: Missing user or guildId');
      throw new ForbiddenException('Authentication and guild ID required');
    }

    try {
      const accessToken = await this.tokenManagementService.getValidAccessToken(
        user.id,
      );
      if (!accessToken) {
        this.logger.warn(
          `GuildAuthorizationService: No access token available for user ${user.id}`,
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

      if (guildPermissions.hasAdministratorPermission) {
        this.logger.log(
          `GuildAuthorizationService: User ${user.id} has Discord Administrator permission in guild ${guildId}`,
        );

        // Log allowed authorization (fire-and-forget, skip for bots)
        if (!('type' in user)) {
          this.logAuthorizationAllowed(
            user,
            guildId,
            request,
            'discord_administrator_permission',
          ).catch((error) => {
            this.logger.error('Failed to log authorization audit:', error);
          });
        }

        return true;
      }

      // Ensure settings exist before checking configured roles (auto-creates if missing)
      const settings = await this.guildSettingsService.getSettings(guildId);

      const adminRoles = settings?.roles?.admin || [];
      const hasNoAdminRolesConfigured = !adminRoles || adminRoles.length === 0;

      // If no admin roles are configured, allow access for initial setup
      if (hasNoAdminRolesConfigured) {
        this.logger.warn(
          `No admin roles configured for guild ${guildId}. Allowing access for initial setup.`,
        );

        // Log allowed authorization (fire-and-forget, skip for bots)
        if (!('type' in user)) {
          this.logAuthorizationAllowed(
            user,
            guildId,
            request,
            'no_admin_roles_configured',
          ).catch((error) => {
            this.logger.error('Failed to log authorization audit:', error);
          });
        }

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

      const isAdmin = await this.permissionCheckService.checkAdminRoles(
        membership.roles,
        guildId,
        settings as GuildSettings | Record<string, unknown>,
        true,
      );

      const reason = isAdmin ? 'configured_admin_role' : 'no_admin_access';

      if (!isAdmin) {
        // Log denied authorization (fire-and-forget, skip for bots)
        if (!('type' in user)) {
          this.logAuthorizationDenied(
            user,
            guildId,
            request,
            'Admin access required - Discord Administrator permission or configured admin role needed',
            reason,
          ).catch((error) => {
            this.logger.error('Failed to log authorization audit:', error);
          });
        }

        throw new ForbiddenException(
          'Admin access required - Discord Administrator permission or configured admin role needed',
        );
      }

      // Log allowed authorization (fire-and-forget, skip for bots)
      if (!('type' in user)) {
        this.logAuthorizationAllowed(user, guildId, request, reason).catch(
          (error) => {
            this.logger.error('Failed to log authorization audit:', error);
          },
        );
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(
        `GuildAuthorizationService error for user ${user.id} in guild ${guildId}:`,
        error,
      );
      throw new ForbiddenException('Error checking permissions');
    }
  }

  /**
   * Check if user has guild admin access (simplified version)
   * Validates access and checks admin roles
   *
   * @param user - Authenticated user
   * @param guildId - Guild ID to check permissions for
   * @returns true if user has admin access
   * @throws ForbiddenException if user doesn't have admin access
   */
  async checkGuildAdminAccess(
    user: AuthenticatedUser,
    guildId: string,
  ): Promise<boolean> {
    if (!user || !guildId) {
      this.logger.warn('GuildAuthorizationService: Missing user or guildId');
      throw new ForbiddenException('Authentication and guild ID required');
    }

    try {
      // Validate user and bot have access to guild (security first)
      await this.guildAccessValidationService.validateUserGuildAccess(
        user.id,
        guildId,
      );

      const membership = await this.guildMembersService.findOne(
        user.id,
        guildId,
      );

      if (!membership) {
        throw new ForbiddenException('You are not a member of this guild');
      }

      // Ensure settings exist before permission check (auto-creates if missing)
      const settings = await this.guildSettingsService.getSettings(guildId);

      const isAdmin = await this.permissionCheckService.checkAdminRoles(
        membership.roles,
        guildId,
        settings as GuildSettings | Record<string, unknown>,
        true,
      );

      if (!isAdmin) {
        this.logger.warn(
          `GuildAuthorizationService: User ${user.id} is not an admin in guild ${guildId}`,
        );
        throw new ForbiddenException('Admin access required');
      }

      this.logger.log(
        `GuildAuthorizationService: User ${user.id} granted admin access to guild ${guildId}`,
      );

      // Note: checkGuildAdminAccess doesn't have request parameter, so we can't log with full context
      // This is a simplified version, so audit logging is optional here

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(
        `GuildAuthorizationService error for user ${user.id} in guild ${guildId}:`,
        error,
      );
      throw new ForbiddenException('Error checking admin permissions');
    }
  }

  /**
   * Log allowed authorization decision
   */
  private async logAuthorizationAllowed(
    user: AuthenticatedUser,
    guildId: string,
    request: Request,
    reason: string,
  ): Promise<void> {
    const resource = request.url || request.path || 'unknown';

    try {
      await this.prisma.$transaction(async (tx) => {
        await this.activityLogService.logActivity(
          tx,
          'guild',
          resource,
          'GUILD_ACCESS',
          'admin.check',
          user.id,
          guildId,
          { result: 'allowed' },
          {
            guardType: 'GuildAdminGuard',
            method: request.method,
            resource,
            ipAddress: this.contextService.getIpAddress(request),
            userAgent: this.contextService.getUserAgent(request),
            requestId: this.contextService.getRequestId(request),
            reason,
          },
        );
      });
    } catch (error) {
      this.logger.error('Failed to log authorization audit:', error);
      // Don't throw - audit logging failure shouldn't break the request
    }
  }

  /**
   * Log denied authorization decision
   */
  private async logAuthorizationDenied(
    user: AuthenticatedUser,
    guildId: string,
    request: Request,
    reason: string,
    reasonCode: string,
  ): Promise<void> {
    const resource = request.url || request.path || 'unknown';

    try {
      await this.prisma.$transaction(async (tx) => {
        await this.activityLogService.logActivity(
          tx,
          'guild',
          resource,
          'GUILD_ACCESS',
          'admin.check',
          user.id,
          guildId,
          { result: 'denied', reason },
          {
            guardType: 'GuildAdminGuard',
            method: request.method,
            resource,
            ipAddress: this.contextService.getIpAddress(request),
            userAgent: this.contextService.getUserAgent(request),
            requestId: this.contextService.getRequestId(request),
            reason: reasonCode,
          },
        );
      });
    } catch (error) {
      this.logger.error('Failed to log authorization audit:', error);
      // Don't throw - audit logging failure shouldn't break the request
    }
  }
}
