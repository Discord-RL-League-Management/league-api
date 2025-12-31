import { Injectable, Logger } from '@nestjs/common';
import { GuildMembersService } from '../guild-members/guild-members.service';
import { DiscordApiService } from '../discord/discord-api.service';
import { TokenManagementService } from '../auth/services/token-management.service';
import { PermissionCheckService } from '../permissions/modules/permission-check/permission-check.service';
import { GuildsService } from '../guilds/guilds.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { UserGuild } from './interfaces/user-guild.interface';
import { GuildSettings } from '../guilds/interfaces/settings.interface';

interface DiscordGuild {
  id: string;
  name: string;
  icon?: string;
  owner: boolean;
  permissions: string;
  roles?: string[];
}

@Injectable()
export class UserGuildsService {
  private readonly logger = new Logger(UserGuildsService.name);
  private readonly cacheTtl: number;

  constructor(
    private guildMembersService: GuildMembersService,
    private guildsService: GuildsService,
    private discordApiService: DiscordApiService,
    private tokenManagementService: TokenManagementService,
    private permissionCheckService: PermissionCheckService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.cacheTtl = 300; // 5 minutes cache TTL
  }

  /**
   * Get user's available guilds with permission information
   * Single Responsibility: Guild data enrichment with permissions
   */
  async getUserAvailableGuildsWithPermissions(
    userId: string,
  ): Promise<UserGuild[]> {
    try {
      const guilds = await this.filterUserGuilds(userId);

      const memberships =
        await this.guildMembersService.findMembersByUser(userId);

      const membershipMap = new Map(
        memberships.map((m) => [
          (m as { guildId: string }).guildId,
          m as { guildId: string; roles: string[] },
        ]),
      );

      const enrichedGuilds = await Promise.all(
        guilds.map(async (guild) => {
          const membership = membershipMap.get(guild.id);
          const isAdmin = membership
            ? await this.permissionCheckService.checkAdminRoles(
                membership.roles,
                guild.id,
                undefined as unknown as GuildSettings | Record<string, unknown>,
                false,
              )
            : false;

          return {
            ...guild,
            isMember: !!membership,
            isAdmin,
            roles: membership?.roles || [],
          };
        }),
      );

      return enrichedGuilds;
    } catch (error) {
      this.logger.error(
        `Error getting user available guilds with permissions for user ${userId}:`,
        error,
      );
      return [];
    }
  }

  /**
   * Sync user guild memberships with roles from OAuth
   * Single Responsibility: Guild membership synchronization with roles
   */
  async syncUserGuildMembershipsWithRoles(
    userId: string,
    userGuilds: Array<DiscordGuild & { roles?: string[] }>,
  ): Promise<void> {
    try {
      const existingMemberships =
        await this.guildMembersService.findMembersByUser(userId);

      const existingGuildIds = new Set(
        existingMemberships.map((m) => (m as { guildId: string }).guildId),
      );

      // Prepare bulk operations with roles from OAuth
      const newMemberships = userGuilds
        .filter((guild) => !existingGuildIds.has(guild.id))
        .map((guild) => ({
          userId,
          guildId: guild.id,
          username: guild.name,
          roles: guild.roles || [],
        }));

      for (const membership of newMemberships) {
        try {
          await this.guildMembersService.create(membership);
        } catch (error) {
          this.logger.warn(
            `Failed to create membership for user ${userId} in guild ${membership.guildId}:`,
            error,
          );
        }
      }

      this.logger.log(
        `Synced ${newMemberships.length} new guild memberships for user ${userId}`,
      );

      await this.cacheManager.del(`user:${userId}:guilds`);
    } catch (error) {
      this.logger.error(
        `Error syncing user guild memberships for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Complete OAuth flow with guild synchronization
   * Single Responsibility: OAuth completion orchestration
   */
  async completeOAuthFlow(
    userId: string,
    userGuilds: Array<DiscordGuild & { roles?: string[] }>,
  ): Promise<UserGuild[]> {
    try {
      await this.syncUserGuildMembershipsWithRoles(userId, userGuilds);

      const availableGuilds =
        await this.getUserAvailableGuildsWithPermissions(userId);

      this.logger.log(
        `Completed OAuth flow for user ${userId} with ${availableGuilds.length} available guilds`,
      );
      return availableGuilds;
    } catch (error) {
      this.logger.error(
        `Error completing OAuth flow for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Filter user guilds to only include guilds where bot is installed
   * Single Responsibility: Guild intersection logic with caching
   */
  private async filterUserGuilds(userId: string): Promise<DiscordGuild[]> {
    try {
      const cacheKey = `user:${userId}:guilds`;
      const cachedGuilds =
        await this.cacheManager.get<DiscordGuild[]>(cacheKey);
      if (cachedGuilds) {
        this.logger.log(`Returning cached guilds for user ${userId}`);
        return cachedGuilds;
      }

      const accessToken =
        await this.tokenManagementService.getValidAccessToken(userId);
      if (!accessToken) {
        this.logger.warn(`No valid access token for user ${userId}`);
        return [];
      }

      const userGuilds =
        await this.discordApiService.getUserGuilds(accessToken);

      const guildIds = await this.guildsService.findActiveGuildIds();
      const botGuildIds = new Set(guildIds);

      const mutualGuilds = userGuilds.filter((userGuild) =>
        botGuildIds.has(userGuild.id),
      );

      await this.cacheManager.set(cacheKey, mutualGuilds, this.cacheTtl * 1000);

      this.logger.log(
        `Filtered ${userGuilds.length} user guilds to ${mutualGuilds.length} mutual guilds for user ${userId}`,
      );
      return mutualGuilds;
    } catch (error) {
      this.logger.error(
        `Error filtering user guilds for user ${userId}:`,
        error,
      );
      return [];
    }
  }
}
