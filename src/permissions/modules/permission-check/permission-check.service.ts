import { Injectable, ForbiddenException, Inject } from '@nestjs/common';
import type { ILoggingService } from '../../../infrastructure/logging/interfaces/logging.interface';
import { DiscordBotService } from '../../../discord/discord-bot.service';
import { RoleParserService } from '../role-parser/role-parser.service';
import { AccessInfo } from '../../interfaces/permission.interface';
import { GuildMembersService } from '../../../guild-members/guild-members.service';
import { GuildSettings } from '../../../guilds/interfaces/settings.interface';

@Injectable()
export class PermissionCheckService {
  private readonly serviceName = PermissionCheckService.name;

  constructor(
    private guildMembersService: GuildMembersService,
    private discordValidation: DiscordBotService,
    private roleParser: RoleParserService,
    @Inject('ILoggingService')
    private readonly loggingService: ILoggingService,
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
    guildSettings?: GuildSettings | Record<string, unknown>,
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        this.loggingService.warn(
          `No settings provided for guild ${guildId}. Admin checks will fail. Caller should fetch settings using GuildSettingsService.getSettings(guildId).`,
          this.serviceName,
        );
        return { isMember: true, isAdmin: false, permissions: [] };
      }

      const adminRoles =
        this.roleParser.getAdminRolesFromSettings(guildSettings);
      const membershipRoles = (membership as { roles: string[] }).roles;
      const isAdmin = adminRoles.some((adminRole) =>
        membershipRoles.includes(adminRole.id),
      );

      const permissions = this.roleParser.calculatePermissions(
        membershipRoles,
        guildSettings,
      );

      return { isMember: true, isAdmin, permissions };
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      this.loggingService.error(
        `Error checking guild access for user ${userId} in guild ${guildId}: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : undefined,
        this.serviceName,
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
    guildSettings?: GuildSettings | Record<string, unknown>,
  ): Promise<boolean> {
    try {
      const membership =
        await this.guildMembersService.findMemberWithGuildSettings(
          userId,
          guildId,
        );

      if (!membership) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        this.loggingService.warn(
          `User ${userId} is not a member of guild ${guildId}`,
          this.serviceName,
        );
        return false;
      }

      // Settings must be provided by caller - they cannot be accessed from Prisma relations
      if (!guildSettings) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        this.loggingService.warn(
          `No settings provided for guild ${guildId}. Admin check will fail. Caller should fetch settings using GuildSettingsService.getSettings(guildId).`,
          this.serviceName,
        );
        return false;
      }

      return this.checkAdminRoles(
        (membership as { roles: string[] }).roles,
        guildId,
        guildSettings,
        validateWithDiscord,
      );
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      this.loggingService.error(
        `Error checking admin role for user ${userId} in guild ${guildId}: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : undefined,
        this.serviceName,
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
    guildSettings: GuildSettings | Record<string, unknown>,
    validateWithDiscord: boolean = true,
  ): Promise<boolean> {
    // Handle undefined/null settings gracefully
    if (!guildSettings) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      this.loggingService.warn(
        `No settings provided for admin role check in guild ${guildId}`,
        this.serviceName,
      );
      return false;
    }

    const adminRoles = this.roleParser.getAdminRolesFromSettings(guildSettings);

    if (adminRoles.length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      this.loggingService.warn(
        `No admin roles configured for guild ${guildId}`,
        this.serviceName,
      );
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
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          this.loggingService.warn(
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
