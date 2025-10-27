import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DiscordValidationService } from '../discord/discord-validation.service';
import { DiscordApiService } from '../discord/discord-api.service';
import { TokenManagementService } from '../auth/services/token-management.service';
import { AccessInfo, RoleConfig } from './interfaces/permission.interface';

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(
    private prisma: PrismaService,
    private discordValidation: DiscordValidationService,
    private discordApiService: DiscordApiService,
    private tokenManagementService: TokenManagementService,
  ) {}

  /**
   * Check if user has access to a specific guild
   * Single Responsibility: Guild access validation
   */
  async checkGuildAccess(userId: string, guildId: string): Promise<AccessInfo> {
    try {
      const membership = await this.prisma.guildMember.findUnique({
        where: {
          userId_guildId: { userId, guildId },
        },
        include: {
          guild: {
            include: { settings: true },
          },
        },
      });

      if (!membership) {
        return { isMember: false, isAdmin: false, permissions: [] };
      }

      const settings = membership.guild.settings?.settings as any;
      const adminRoles = this.getAdminRolesFromSettings(settings);
      const isAdmin = adminRoles.some(adminRole => 
        membership.roles.includes(adminRole.id)
      );

      const permissions = this.calculatePermissions(membership.roles, settings);

      return { isMember: true, isAdmin, permissions };
    } catch (error) {
      this.logger.error(`Error checking guild access for user ${userId} in guild ${guildId}:`, error);
      return { isMember: false, isAdmin: false, permissions: [] };
    }
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
    try {
      const membership = await this.prisma.guildMember.findUnique({
        where: {
          userId_guildId: { userId, guildId },
        },
        include: {
          guild: {
            include: { settings: true },
          },
        },
      });

      if (!membership) {
        this.logger.warn(`User ${userId} is not a member of guild ${guildId}`);
        return false;
      }

      return this.checkAdminRoles(
        membership.roles,
        guildId,
        membership.guild.settings?.settings,
        validateWithDiscord
      );
    } catch (error) {
      this.logger.error(`Error checking admin role for user ${userId} in guild ${guildId}:`, error);
      return false;
    }
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
    const adminRoles = this.getAdminRolesFromSettings(guildSettings);

    if (adminRoles.length === 0) {
      this.logger.warn(`No admin roles configured for guild ${guildId}`);
      return false;
    }

    const hasRole = userRoles.some(userRole =>
      adminRoles.some(adminRole => adminRole.id === userRole)
    );

    if (!hasRole) {
      return false;
    }

    if (validateWithDiscord) {
      const userAdminRole = adminRoles.find(adminRole =>
        userRoles.includes(adminRole.id)
      );

      if (userAdminRole) {
        const isValid = await this.discordValidation.validateRoleId(
          guildId,
          userAdminRole.id
        );

        if (!isValid) {
          this.logger.warn(
            `Admin role ${userAdminRole.id} does not exist in Discord guild ${guildId}`
          );
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Require guild access or throw ForbiddenException
   * Single Responsibility: Access enforcement
   */
  async requireGuildAccess(userId: string, guildId: string): Promise<void> {
    const access = await this.checkGuildAccess(userId, guildId);
    if (!access.isMember) {
      throw new ForbiddenException('Access denied: User is not a member of this guild');
    }
  }

  /**
   * Require admin access or throw ForbiddenException
   * Single Responsibility: Admin access enforcement
   */
  async requireAdminAccess(userId: string, guildId: string): Promise<void> {
    const access = await this.checkGuildAccess(userId, guildId);
    if (!access.isAdmin) {
      throw new ForbiddenException('Access denied: Admin privileges required');
    }
  }

  /**
   * Sync user permissions with Discord API
   * Single Responsibility: Permission synchronization
   */
  async syncUserPermissions(userId: string, guildId: string): Promise<void> {
    try {
      const accessToken = await this.tokenManagementService.getValidAccessToken(userId);
      if (!accessToken) {
        this.logger.warn(`No valid access token for user ${userId}, skipping permission sync`);
        return;
      }

      const discordPermissions = await this.discordApiService.checkGuildPermissions(accessToken, guildId);

      if (!discordPermissions.isMember) {
        await this.prisma.guildMember.deleteMany({
          where: { userId, guildId },
        });
        this.logger.log(`Removed user ${userId} from guild ${guildId} - no longer a member`);
        return;
      }

      await this.prisma.guildMember.updateMany({
        where: { userId, guildId },
        data: {
          roles: discordPermissions.permissions,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Synced permissions for user ${userId} in guild ${guildId}`);
    } catch (error) {
      this.logger.error(`Error syncing user permissions for user ${userId} in guild ${guildId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate user permissions based on roles and guild settings
   * Single Responsibility: Permission calculation logic
   */
  private calculatePermissions(userRoles: string[], guildSettings: any): string[] {
    const permissions: string[] = [];

    if (!guildSettings?.roles) {
      return permissions;
    }

    const rolePermissions = guildSettings.roles;

    for (const role of userRoles) {
      if (rolePermissions[role]) {
        permissions.push(...rolePermissions[role]);
      }
    }

    return [...new Set(permissions)];
  }

  /**
   * Extract admin roles from guild settings
   * Single Responsibility: Settings parsing
   *
   * Supports both legacy (array of strings) and new (array of objects) formats
   */
  private getAdminRolesFromSettings(guildSettings: any): RoleConfig[] {
    if (!guildSettings?.roles?.admin) {
      return [];
    }

    const adminRoles = guildSettings.roles.admin;

    if (Array.isArray(adminRoles) && adminRoles.length > 0) {
      if (typeof adminRoles[0] === 'object' && 'id' in adminRoles[0]) {
        return adminRoles.map((role: any) => ({
          id: role.id,
          name: role.name || 'Admin'
        }));
      }

      if (typeof adminRoles[0] === 'string') {
        return adminRoles.map((id: string) => ({ id, name: 'Admin' }));
      }
    }

    return [];
  }
}
