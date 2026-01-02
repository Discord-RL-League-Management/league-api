import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditLogService } from '../../audit/services/audit-log.service';
import { PermissionCheckService } from '../../permissions/modules/permission-check/permission-check.service';
import { GuildAccessValidationService } from '../../guilds/services/guild-access-validation.service';
import { GuildMembersService } from '../../guild-members/guild-members.service';
import { GuildSettingsService } from '../../guilds/guild-settings.service';
import { TokenManagementService } from './token-management.service';
import { DiscordApiService } from '../../discord/discord-api.service';
import { AuditAction } from '../../audit/interfaces/audit-event.interface';
import { GuildSettings } from '../../guilds/interfaces/settings.interface';
import type { AuthenticatedUser } from '../../common/interfaces/user.interface';
import type { Request } from 'express';

/**
 * AuthorizationService - Single Responsibility: Centralized authorization logic
 *
 * This service extracts all authorization business logic from guards, allowing
 * guards to be thin wrappers that delegate to this service. This service can
 * depend on domain modules without creating circular dependencies because it's
 * not a cross-cutting concern like guards.
 *
 * Responsibilities:
 * - Check guild admin permissions (with Discord validation)
 * - Check guild admin access (simplified version)
 * - Check system admin permissions
 * - All authorization business logic previously in guards
 */
@Injectable()
export class AuthorizationService {
  private readonly logger = new Logger(AuthorizationService.name);

  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly permissionCheckService: PermissionCheckService,
    private readonly guildAccessValidationService: GuildAccessValidationService,
    private readonly guildMembersService: GuildMembersService,
    private readonly guildSettingsService: GuildSettingsService,
    private readonly tokenManagementService: TokenManagementService,
    private readonly discordApiService: DiscordApiService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Check if user has admin permissions in the specified guild
   * Extracted from AdminGuard - handles Discord validation and configured roles
   *
   * @param user - Authenticated user
   * @param guildId - Guild ID to check permissions for
   * @param request - Express request object for audit logging
   * @returns true if user has admin access
   * @throws ForbiddenException if user doesn't have admin access
   */
  async checkGuildAdmin(
    user: AuthenticatedUser | { type: 'bot'; id: string },
    guildId: string,
    request: Request,
  ): Promise<boolean> {
    if (!user || !guildId) {
      this.logger.warn('AuthorizationService: Missing user or guildId');
      throw new ForbiddenException('Authentication and guild ID required');
    }

    try {
      const accessToken = await this.tokenManagementService.getValidAccessToken(
        user.id,
      );
      if (!accessToken) {
        this.logger.warn(
          `AuthorizationService: No access token available for user ${user.id}`,
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
          `AuthorizationService: User ${user.id} has Discord Administrator permission in guild ${guildId}`,
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
      const settings = await this.guildSettingsService.getSettings(guildId);

      const settingsTyped = settings;
      const adminRoles = settingsTyped?.roles?.admin || [];
      const hasNoAdminRolesConfigured = !adminRoles || adminRoles.length === 0;

      // If no admin roles are configured, allow access for initial setup
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

      const isAdmin = await this.permissionCheckService.checkAdminRoles(
        membership.roles,
        guildId,
        settings as GuildSettings | Record<string, unknown>,
        true,
      );

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
        `AuthorizationService error for user ${user.id} in guild ${guildId}:`,
        error,
      );
      throw new ForbiddenException('Error checking permissions');
    }
  }

  /**
   * Check if user has guild admin access (simplified version)
   * Extracted from GuildAdminGuard - validates access and checks admin roles
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
      this.logger.warn('AuthorizationService: Missing user or guildId');
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
          `AuthorizationService: User ${user.id} is not an admin in guild ${guildId}`,
        );
        throw new ForbiddenException('Admin access required');
      }

      this.logger.log(
        `AuthorizationService: User ${user.id} granted admin access to guild ${guildId}`,
      );

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(
        `AuthorizationService error for user ${user.id} in guild ${guildId}:`,
        error,
      );
      throw new ForbiddenException('Error checking admin permissions');
    }
  }

  /**
   * Check if user has system admin permissions
   * Extracted from SystemAdminGuard - checks against configured system admin user IDs
   *
   * @param user - Authenticated user
   * @param request - Express request object for audit logging
   * @returns true if user has system admin access
   * @throws ForbiddenException if user doesn't have system admin access
   */
  async checkSystemAdmin(
    user: AuthenticatedUser,
    request: Request,
  ): Promise<boolean> {
    if (!user) {
      this.logger.warn('AuthorizationService: Missing user');
      throw new ForbiddenException('Authentication required');
    }

    try {
      const systemAdminUserIds =
        this.configService.get<string[]>('systemAdmin.userIds') || [];

      const isSystemAdmin = systemAdminUserIds.includes(user.id);

      await this.auditLogService.logAdminAction(
        {
          userId: user.id,
          action: AuditAction.ADMIN_CHECK,
          resource: request.url || request.path,
          result: isSystemAdmin ? 'allowed' : 'denied',
          metadata: {
            method: request.method,
            reason: isSystemAdmin ? 'system_admin_user_id' : 'not_system_admin',
            guardType: 'SystemAdminGuard',
          },
        },
        request,
      );

      if (!isSystemAdmin) {
        this.logger.warn(
          `AuthorizationService: User ${user.id} is not a system admin`,
        );
        throw new ForbiddenException(
          'System admin access required - your user ID must be configured as a system administrator',
        );
      }

      this.logger.log(
        `AuthorizationService: User ${user.id} granted system admin access`,
      );

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(
        `AuthorizationService error for user ${user.id}:`,
        error,
      );
      throw new ForbiddenException('Error checking system admin permissions');
    }
  }
}
