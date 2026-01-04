import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PermissionCheckService } from '../../permissions/modules/permission-check/permission-check.service';
import { GuildAccessValidationService } from './guild-access-validation.service';
import { GuildMembersService } from '../../guild-members/guild-members.service';
import { GuildSettingsService } from '../guild-settings.service';
import { TokenManagementService } from '../../auth/services/token-management.service';
import { DiscordApiService } from '../../discord/discord-api.service';
import { GuildSettings } from '../interfaces/settings.interface';
import type { AuthenticatedUser } from '../../common/interfaces/user.interface';
import type { Request } from 'express';
import type { AuditMetadata } from '../../common/interfaces/audit-metadata.interface';

/**
 * GuildAuthorizationService - Single Responsibility: Guild authorization logic
 *
 * Handles all guild-level authorization checks including admin permissions
 * with Discord validation and configured roles.
 *
 * Responsibilities:
 * - Check guild admin permissions (with Discord validation)
 * - Check guild admin access (simplified version)
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
  ) {}

  /**
   * Check if user has admin permissions in the specified guild
   * Handles Discord validation and configured roles
   *
   * @param user - Authenticated user
   * @param guildId - Guild ID to check permissions for
   * @param request - Express request object (audit metadata set by guard)
   * @returns true if user has admin access
   * @throws ForbiddenException if user doesn't have admin access
   *
   * Audit logging is handled automatically via AuthorizationAuditInterceptor
   * and AuthorizationAuditExceptionFilter based on request metadata set by guard.
   */
  async checkGuildAdmin(
    user: AuthenticatedUser | { type: 'bot'; id: string },
    guildId: string,
    request: Request & { _auditMetadata?: AuditMetadata },
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

        // Update audit metadata with reason
        if (request._auditMetadata) {
          request._auditMetadata.metadata = {
            ...request._auditMetadata.metadata,
            reason: 'discord_administrator_permission',
          };
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

        // Update audit metadata with reason
        if (request._auditMetadata) {
          request._auditMetadata.metadata = {
            ...request._auditMetadata.metadata,
            reason: 'no_admin_roles_configured',
          };
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

      // Update audit metadata with reason
      if (request._auditMetadata) {
        request._auditMetadata.metadata = {
          ...request._auditMetadata.metadata,
          reason: isAdmin ? 'configured_admin_role' : 'no_admin_access',
        };
      }

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
}
