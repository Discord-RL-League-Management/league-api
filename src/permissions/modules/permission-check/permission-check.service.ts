import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { DiscordValidationService } from '../../../discord/discord-validation.service';
import { RoleParserService } from '../role-parser/role-parser.service';
import { AccessInfo } from '../../interfaces/permission.interface';

@Injectable()
export class PermissionCheckService {
  private readonly logger = new Logger(PermissionCheckService.name);

  constructor(
    private prisma: PrismaService,
    private discordValidation: DiscordValidationService,
    private roleParser: RoleParserService,
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
      const adminRoles = this.roleParser.getAdminRolesFromSettings(settings);
      const isAdmin = adminRoles.some(adminRole => 
        membership.roles.includes(adminRole.id)
      );

      const permissions = this.roleParser.calculatePermissions(membership.roles, settings);

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
    const adminRoles = this.roleParser.getAdminRolesFromSettings(guildSettings);

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
}

