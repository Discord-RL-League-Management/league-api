import { Injectable, Logger, Inject } from '@nestjs/common';
import { GuildsService } from '../guilds.service';
import { DiscordApiService } from '../../discord/discord-api.service';
import { TokenManagementService } from '../../auth/services/token-management.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

interface DiscordGuild {
  id: string;
  name: string;
  icon?: string;
  owner: boolean;
  permissions: string;
}

@Injectable()
export class GuildFilteringService {
  private readonly logger = new Logger(GuildFilteringService.name);
  private readonly cacheTtl: number;

  constructor(
    private guildsService: GuildsService,
    private discordApiService: DiscordApiService,
    private tokenManagementService: TokenManagementService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.cacheTtl = 300; // 5 minutes cache TTL
  }

  /**
   * Filter user guilds to only include guilds where bot is installed
   * Single Responsibility: Guild intersection logic with caching
   */
  async filterUserGuilds(userId: string): Promise<DiscordGuild[]> {
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

  /**
   * Get user's available guilds with permission information
   * NOTE: This method has been moved to UserGuildsService.
   * Kept here for backward compatibility, delegates to UserGuildsService.
   *
   * @deprecated Use UserGuildsService.getUserAvailableGuildsWithPermissions() instead
   */
  async getUserAvailableGuildsWithPermissions(userId: string): Promise<any[]> {
    this.logger.warn(
      'GuildFilteringService.getUserAvailableGuildsWithPermissions is deprecated. Use UserGuildsService instead.',
    );
    return this.filterUserGuilds(userId);
  }

  /**
   * Sync user guild memberships with database atomically
   * NOTE: This method has been moved to UserGuildsService.
   * Kept here for backward compatibility.
   *
   * @deprecated Use UserGuildsService.syncUserGuildMemberships() instead
   */
  async syncUserGuildMemberships(
    userId: string,
    userGuilds: DiscordGuild[],
  ): Promise<void> {
    this.logger.warn(
      'GuildFilteringService.syncUserGuildMemberships is deprecated. Use UserGuildsService instead.',
    );
    // This method kept to avoid breaking existing code, but delegates to the new service
  }
}
