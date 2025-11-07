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

      // Get user's guild memberships for permission data
      const memberships =
        await this.guildMembersService.findMembersByUser(userId);

      const membershipMap = new Map(memberships.map((m) => [m.guildId, m]));

      // Enrich guilds with permission information
      // Note: For performance, we pass undefined for settings and let the
      // permission service fetch them only when needed for admin checks.
      const enrichedGuilds = await Promise.all(
        guilds.map(async (guild) => {
          const membership = membershipMap.get(guild.id);
          const isAdmin = membership
            ? await this.permissionCheckService.checkAdminRoles(
                membership.roles,
                guild.id,
                undefined, // Settings will be fetched by permission service if needed
                false, // Don't validate with Discord for listing (performance)
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
      // Get existing memberships
      const existingMemberships =
        await this.guildMembersService.findMembersByUser(userId);

      const existingGuildIds = new Set(
        existingMemberships.map((m) => m.guildId),
      );

      // Prepare bulk operations with roles from OAuth
      const newMemberships = userGuilds
        .filter((guild) => !existingGuildIds.has(guild.id))
        .map((guild) => ({
          userId,
          guildId: guild.id,
          username: guild.name, // Discord guild name as username placeholder
          roles: guild.roles || [], // Use roles from OAuth data
        }));

      // Create new memberships using the service
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

      // Invalidate cache
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
      // Sync guild memberships atomically with roles
      await this.syncUserGuildMembershipsWithRoles(userId, userGuilds);

      // Get enriched guild data
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
      // Check cache first
      const cacheKey = `user:${userId}:guilds`;
      const cachedGuilds =
        await this.cacheManager.get<DiscordGuild[]>(cacheKey);
      if (cachedGuilds) {
        this.logger.log(`Returning cached guilds for user ${userId}`);
        return cachedGuilds;
      }

      // Get valid access token
      const accessToken =
        await this.tokenManagementService.getValidAccessToken(userId);
      if (!accessToken) {
        this.logger.warn(`No valid access token for user ${userId}`);
        return [];
      }

      // Fetch user's guilds from Discord API
      const userGuilds =
        await this.discordApiService.getUserGuilds(accessToken);

      // Get bot's active guild IDs from guilds service
      const guildIds = await this.guildsService.findActiveGuildIds();
      const botGuildIds = new Set(guildIds);

      // Filter user guilds to only include mutual guilds
      const mutualGuilds = userGuilds.filter((userGuild) =>
        botGuildIds.has(userGuild.id),
      );

      // Cache the result
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
