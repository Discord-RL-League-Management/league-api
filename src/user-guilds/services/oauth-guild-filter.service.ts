import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { DiscordApiService } from '../../discord/discord-api.service';
import { TokenManagementService } from '../../auth/services/token-management.service';
import type { IGuildService } from '../../guilds/interfaces/guild-service.interface';

interface DiscordGuild {
  id: string;
  name: string;
  icon?: string;
  owner: boolean;
  permissions: string;
  roles?: string[];
}

/**
 * OAuthGuildFilterService - Single Responsibility: OAuth guild filtering with caching
 *
 * Filters user guilds to only include guilds where bot is installed, with caching support.
 */
@Injectable()
export class OAuthGuildFilterService {
  private readonly logger = new Logger(OAuthGuildFilterService.name);
  private readonly cacheTtl: number;

  constructor(
    @Inject('IGuildService') private guildsService: IGuildService,
    private discordApiService: DiscordApiService,
    private tokenManagementService: TokenManagementService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.cacheTtl = 300; // 5 minutes
  }

  /**
   * Filter user guilds to only include guilds where bot is installed
   * Single Responsibility: Guild intersection logic with caching
   *
   * @param userId - User ID to filter guilds for
   * @returns Filtered array of Discord guilds where bot is present
   */
  async filterUserGuilds(userId: string): Promise<DiscordGuild[]> {
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
