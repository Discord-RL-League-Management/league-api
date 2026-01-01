import { Injectable, Logger, Inject } from '@nestjs/common';
import { GuildMembersService } from '../../guild-members/guild-members.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

interface DiscordGuild {
  id: string;
  name: string;
  icon?: string;
  owner: boolean;
  permissions: string;
  roles?: string[];
}

/**
 * GuildMembershipSyncService - Single Responsibility: Guild membership synchronization with roles
 *
 * Handles synchronization of user guild memberships with roles from OAuth.
 */
@Injectable()
export class GuildMembershipSyncService {
  private readonly logger = new Logger(GuildMembershipSyncService.name);

  constructor(
    private guildMembersService: GuildMembersService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Sync user guild memberships with roles from OAuth
   * Single Responsibility: Guild membership synchronization with roles
   *
   * @param userId - User ID to sync memberships for
   * @param userGuilds - Array of Discord guilds with roles
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
}
