import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DiscordApiService } from '../../discord/discord-api.service';
import { TokenManagementService } from '../../auth/services/token-management.service';
import { PermissionService } from '../../permissions/permission.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
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
    private prisma: PrismaService,
    private discordApiService: DiscordApiService,
    private tokenManagementService: TokenManagementService,
    private permissionService: PermissionService,
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
      const cachedGuilds = await this.cacheManager.get<DiscordGuild[]>(cacheKey);
      if (cachedGuilds) {
        this.logger.log(`Returning cached guilds for user ${userId}`);
        return cachedGuilds;
      }

      // Get valid access token
      const accessToken = await this.tokenManagementService.getValidAccessToken(userId);
      if (!accessToken) {
        this.logger.warn(`No valid access token for user ${userId}`);
        return [];
      }

      // Fetch user's guilds from Discord API
      const userGuilds = await this.discordApiService.getUserGuilds(accessToken);

      // Get bot's active guilds from database
      const botGuilds = await this.prisma.guild.findMany({
        where: { isActive: true },
        select: { id: true },
      });

      const botGuildIds = new Set(botGuilds.map(guild => guild.id));

      // Filter user guilds to only include mutual guilds
      const mutualGuilds = userGuilds.filter(userGuild =>
        botGuildIds.has(userGuild.id)
      );

      // Cache the result
      await this.cacheManager.set(cacheKey, mutualGuilds, this.cacheTtl * 1000);

      this.logger.log(`Filtered ${userGuilds.length} user guilds to ${mutualGuilds.length} mutual guilds for user ${userId}`);
      return mutualGuilds;
    } catch (error) {
      this.logger.error(`Error filtering user guilds for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Sync user guild memberships with database atomically
   * Single Responsibility: Guild membership synchronization
   */
  async syncUserGuildMemberships(userId: string, userGuilds: DiscordGuild[]): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        // Get existing memberships
        const existingMemberships = await tx.guildMember.findMany({
          where: { userId },
        });

        const existingGuildIds = new Set(existingMemberships.map(m => m.guildId));

        // Prepare bulk operations
        const newMemberships = userGuilds
          .filter(guild => !existingGuildIds.has(guild.id))
          .map(guild => ({
            userId,
            guildId: guild.id,
            username: guild.name, // Discord guild name as username placeholder
            roles: [], // Will be populated by bot events
          }));

        // Bulk create new memberships
        if (newMemberships.length > 0) {
          await tx.guildMember.createMany({
            data: newMemberships,
            skipDuplicates: true,
          });
        }

        this.logger.log(`Synced ${newMemberships.length} new guild memberships for user ${userId}`);
      });

      // Invalidate cache
      await this.cacheManager.del(`user:${userId}:guilds`);
    } catch (error) {
      this.logger.error(`Error syncing user guild memberships for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get user's available guilds with permission information
   * Single Responsibility: Guild data enrichment with permissions
   */
  async getUserAvailableGuildsWithPermissions(userId: string): Promise<any[]> {
    try {
      const guilds = await this.filterUserGuilds(userId);
      
      // Get user's guild memberships for permission data
      const memberships = await this.prisma.guildMember.findMany({
        where: { userId },
        include: {
          guild: {
            include: {
              settings: true,
            },
          },
        },
      });

      const membershipMap = new Map(
        memberships.map(m => [m.guildId, m])
      );

      // Enrich guilds with permission information
      const enrichedGuilds = await Promise.all(guilds.map(async (guild) => {
        const membership = membershipMap.get(guild.id);
        const isAdmin = membership 
          ? await this.permissionService.checkAdminRoles(
              membership.roles,
              guild.id,
              membership.guild.settings?.settings,
              false // Don't validate with Discord for listing (performance)
            )
          : false;
        
        return {
          ...guild,
          isMember: !!membership,
          isAdmin,
          roles: membership?.roles || [],
        };
      }));

      return enrichedGuilds;
    } catch (error) {
      this.logger.error(`Error getting user available guilds with permissions for user ${userId}:`, error);
      return [];
    }
  }

}
