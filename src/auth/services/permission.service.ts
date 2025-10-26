import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DiscordApiService } from '../../discord/discord-api.service';
import { TokenManagementService } from './token-management.service';

interface AccessInfo {
  isMember: boolean;
  isAdmin: boolean;
  permissions: string[];
}

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(
    private prisma: PrismaService,
    private discordApiService: DiscordApiService,
    private tokenManagementService: TokenManagementService,
  ) {}

  /**
   * Check if user has access to a specific guild
   * Single Responsibility: Guild access validation
   */
  async checkGuildAccess(userId: string, guildId: string): Promise<AccessInfo> {
    try {
      // Check database membership first
      const membership = await this.prisma.guildMember.findUnique({
        where: {
          userId_guildId: {
            userId,
            guildId,
          },
        },
        include: {
          guild: {
            include: {
              settings: true,
            },
          },
        },
      });

      if (!membership) {
        return { isMember: false, isAdmin: false, permissions: [] };
      }

      // Get guild settings for permission configuration
      const settings = membership.guild.settings?.settings as any;
      const adminRoles = settings?.roles?.admin || [];

      // Check if user has admin role
      const isAdmin = membership.roles.some(role => adminRoles.includes(role));

      // Calculate permissions based on roles
      const permissions = this.calculatePermissions(membership.roles, settings);

      return {
        isMember: true,
        isAdmin,
        permissions,
      };
    } catch (error) {
      this.logger.error(`Error checking guild access for user ${userId} in guild ${guildId}:`, error);
      return { isMember: false, isAdmin: false, permissions: [] };
    }
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
   * Calculate user permissions based on roles and guild settings
   * Single Responsibility: Permission calculation logic
   */
  private calculatePermissions(userRoles: string[], guildSettings: any): string[] {
    const permissions: string[] = [];

    if (!guildSettings?.roles) {
      return permissions;
    }

    const rolePermissions = guildSettings.roles;
    
    // Check each role for permissions
    for (const role of userRoles) {
      if (rolePermissions[role]) {
        permissions.push(...rolePermissions[role]);
      }
    }

    // Remove duplicates
    return [...new Set(permissions)];
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

      // Get permissions from Discord API
      const discordPermissions = await this.discordApiService.checkGuildPermissions(accessToken, guildId);
      
      if (!discordPermissions.isMember) {
        // User is no longer a member, remove from database
        await this.prisma.guildMember.deleteMany({
          where: {
            userId,
            guildId,
          },
        });
        this.logger.log(`Removed user ${userId} from guild ${guildId} - no longer a member`);
        return;
      }

      // Update user's roles in database
      await this.prisma.guildMember.updateMany({
        where: {
          userId,
          guildId,
        },
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
}
