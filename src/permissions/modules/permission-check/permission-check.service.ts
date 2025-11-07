import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { DiscordBotService } from '../../../discord/discord-bot.service';
import { RoleParserService } from '../role-parser/role-parser.service';
import { AccessInfo } from '../../interfaces/permission.interface';
import { GuildMembersService } from '../../../guild-members/guild-members.service';

@Injectable()
export class PermissionCheckService {
  private readonly logger = new Logger(PermissionCheckService.name);

  constructor(
    private guildMembersService: GuildMembersService,
    private discordValidation: DiscordBotService,
    private roleParser: RoleParserService,
  ) {}

  /**
   * Check if user has access to a specific guild
   * Single Responsibility: Guild access validation
   * 
   * Note: Settings are NOT a Prisma relation and cannot be accessed from membership.guild.
   * Settings must be provided by caller via GuildSettingsService.getSettings(guildId).
   * If settings are not provided, admin checks will fail (return false) but user will
   * still be considered a member if membership exists.
   */
  async checkGuildAccess(
    userId: string,
    guildId: string,
    guildSettings?: any,
  ): Promise<AccessInfo> {
    try {
      const membership =
        await this.guildMembersService.findMemberWithGuildSettings(
          userId,
          guildId,
        );

      if (!membership) {
        return { isMember: false, isAdmin: false, permissions: [] };
      }

      // Settings must be provided by caller - they cannot be accessed from Prisma relations
      if (!guildSettings) {
        this.logger.warn(
          `No settings provided for guild ${guildId}. Admin checks will fail. Caller should fetch settings using GuildSettingsService.getSettings(guildId).`,
        );
        return { isMember: true, isAdmin: false, permissions: [] };
      }

      const adminRoles = this.roleParser.getAdminRolesFromSettings(guildSettings);
      const isAdmin = adminRoles.some((adminRole) =>
        membership.roles.includes(adminRole.id),
      );

      const permissions = this.roleParser.calculatePermissions(
        membership.roles,
        guildSettings,
      );

      return { isMember: true, isAdmin, permissions };
    } catch (error) {
      this.logger.error(
        `Error checking guild access for user ${userId} in guild ${guildId}:`,
        error,
      );
      return { isMember: false, isAdmin: false, permissions: [] };
    }
  }

  /**
   * Check if user has admin role in guild with Discord API validation
   * Single Responsibility: Admin permission checking with Discord verification
   * 
   * Note: Settings are NOT a Prisma relation and cannot be accessed from membership.guild.
   * Settings must be provided by caller via GuildSettingsService.getSettings(guildId).
   * If settings are not provided, this method will return false.
   */
  async hasAdminRole(
    userId: string,
    guildId: string,
    validateWithDiscord: boolean = true,
    guildSettings?: any,
  ): Promise<boolean> {
    try {
      const membership =
        await this.guildMembersService.findMemberWithGuildSettings(
          userId,
          guildId,
        );

      if (!membership) {
        this.logger.warn(`User ${userId} is not a member of guild ${guildId}`);
        return false;
      }

      // Settings must be provided by caller - they cannot be accessed from Prisma relations
      if (!guildSettings) {
        this.logger.warn(
          `No settings provided for guild ${guildId}. Admin check will fail. Caller should fetch settings using GuildSettingsService.getSettings(guildId).`,
        );
        return false;
      }

      return this.checkAdminRoles(
        membership.roles,
        guildId,
        guildSettings,
        validateWithDiscord,
      );
    } catch (error) {
      this.logger.error(
        `Error checking admin role for user ${userId} in guild ${guildId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Check if user roles include admin roles from guild settings
   * Single Responsibility: Role matching logic with optional Discord validation
   * 
   * Note: If guildSettings is undefined/null, this will return false
   * (getAdminRolesFromSettings returns empty array for undefined settings).
   */
  async checkAdminRoles(
    userRoles: string[],
    guildId: string,
    guildSettings: any,
    validateWithDiscord: boolean = true,
  ): Promise<boolean> {
    // Handle undefined/null settings gracefully
    if (!guildSettings) {
      this.logger.warn(`No settings provided for admin role check in guild ${guildId}`);
      return false;
    }

    const adminRoles = this.roleParser.getAdminRolesFromSettings(guildSettings);

    if (adminRoles.length === 0) {
      this.logger.warn(`No admin roles configured for guild ${guildId}`);
      return false;
    }

    const hasRole = userRoles.some((userRole) =>
      adminRoles.some((adminRole) => adminRole.id === userRole),
    );

    if (!hasRole) {
      return false;
    }

    if (validateWithDiscord) {
      const userAdminRole = adminRoles.find((adminRole) =>
        userRoles.includes(adminRole.id),
      );

      if (userAdminRole) {
        const isValid = await this.discordValidation.validateRoleId(
          guildId,
          userAdminRole.id,
        );

        if (!isValid) {
          this.logger.warn(
            `Admin role ${userAdminRole.id} does not exist in Discord guild ${guildId}`,
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
      throw new ForbiddenException(
        'Access denied: User is not a member of this guild',
      );
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
