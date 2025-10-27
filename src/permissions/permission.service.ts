import { Injectable, Logger, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PermissionCheckService } from './modules/permission-check/permission-check.service';
import { PermissionSyncService } from './modules/permission-sync/permission-sync.service';
import { RoleParserService } from './modules/role-parser/role-parser.service';
import { AccessInfo, RoleConfig } from './interfaces/permission.interface';

/**
 * @deprecated PermissionService is a facade for backward compatibility.
 * Use the new modular services directly:
 * - PermissionCheckService for access validation
 * - PermissionSyncService for Discord synchronization
 * - RoleParserService for settings parsing
 * 
 * This service will be removed in a future version.
 */
@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(
    @Inject(forwardRef(() => PermissionCheckService))
    private permissionCheck: PermissionCheckService,
    @Inject(forwardRef(() => PermissionSyncService))
    private permissionSync: PermissionSyncService,
    @Inject(forwardRef(() => RoleParserService))
    private roleParser: RoleParserService,
  ) {}

  /**
   * Check if user has access to a specific guild
   * Single Responsibility: Guild access validation
   */
  async checkGuildAccess(userId: string, guildId: string): Promise<AccessInfo> {
    return this.permissionCheck.checkGuildAccess(userId, guildId);
  }

  /**
   * Check if user has admin role in guild with Discord API validation
   * Single Responsibility: Admin permission checking with Discord verification
   */
  async hasAdminRole(
    userId: string,
    guildId: string,
    validateWithDiscord: boolean = true
  ): Promise<boolean> {
    return this.permissionCheck.hasAdminRole(userId, guildId, validateWithDiscord);
  }

  /**
   * Check if user roles include admin roles from guild settings
   * Single Responsibility: Role matching logic with optional Discord validation
   */
  async checkAdminRoles(
    userRoles: string[],
    guildId: string,
    guildSettings: any,
    validateWithDiscord: boolean = true
  ): Promise<boolean> {
    return this.permissionCheck.checkAdminRoles(userRoles, guildId, guildSettings, validateWithDiscord);
  }

  /**
   * Require guild access or throw ForbiddenException
   * Single Responsibility: Access enforcement
   */
  async requireGuildAccess(userId: string, guildId: string): Promise<void> {
    return this.permissionCheck.requireGuildAccess(userId, guildId);
  }

  /**
   * Require admin access or throw ForbiddenException
   * Single Responsibility: Admin access enforcement
   */
  async requireAdminAccess(userId: string, guildId: string): Promise<void> {
    return this.permissionCheck.requireAdminAccess(userId, guildId);
  }

  /**
   * Sync user permissions with Discord API
   * Single Responsibility: Permission synchronization
   */
  async syncUserPermissions(userId: string, guildId: string): Promise<void> {
    return this.permissionSync.syncUserPermissions(userId, guildId);
  }

  /**
   * Calculate user permissions based on roles and guild settings
   * Single Responsibility: Permission calculation logic
   */
  calculatePermissions(userRoles: string[], guildSettings: any): string[] {
    return this.roleParser.calculatePermissions(userRoles, guildSettings);
  }

  /**
   * Extract admin roles from guild settings
   * Single Responsibility: Settings parsing
   *
   * Supports both legacy (array of strings) and new (array of objects) formats
   */
  getAdminRolesFromSettings(guildSettings: any): RoleConfig[] {
    return this.roleParser.getAdminRolesFromSettings(guildSettings);
  }
}
