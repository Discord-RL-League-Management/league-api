import { Injectable, Logger } from '@nestjs/common';
import {
  GuildMemberQueryService,
  GuildMemberWithGuild,
} from '../../guild-members/services/guild-member-query.service';

/**
 * UserStatisticsService - Aggregates statistics for user profiles
 * Single Responsibility: Statistics aggregation and computation
 *
 * Separates statistics calculation from profile presentation.
 */
@Injectable()
export class UserStatisticsService {
  private readonly logger = new Logger(UserStatisticsService.name);

  constructor(private guildMemberQueryService: GuildMemberQueryService) {}

  /**
   * Get user statistics aggregated from guild memberships
   * Single Responsibility: Aggregate user stats from multiple sources
   */
  async getStats(userId: string): Promise<{
    userId: string;
    gamesPlayed: number;
    wins: number;
    losses: number;
    winRate: number;
    guildsCount: number;
    activeGuildsCount: number;
  }> {
    try {
      const memberships: GuildMemberWithGuild[] =
        await this.guildMemberQueryService.findMembersByUser(userId);

      const guildsCount = memberships.length;
      const activeGuildsCount = memberships.filter(
        (m) => m.guild && m.guild.isActive !== false,
      ).length;

      const gamesPlayed = 0;
      const wins = 0;
      const losses = 0;
      const winRate = gamesPlayed > 0 ? wins / gamesPlayed : 0;

      return {
        userId,
        gamesPlayed,
        wins,
        losses,
        winRate,
        guildsCount,
        activeGuildsCount,
      };
    } catch (error) {
      this.logger.error(`Failed to get stats for user ${userId}:`, error);
      return {
        userId,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        guildsCount: 0,
        activeGuildsCount: 0,
      };
    }
  }

  /**
   * Get guild-specific statistics for a user
   * Single Responsibility: Guild-specific stat aggregation
   */
  async getGuildStats(
    userId: string,
    guildId: string,
  ): Promise<{
    gamesPlayed: number;
    wins: number;
    losses: number;
    winRate: number;
    roles: string[];
  }> {
    try {
      const membership =
        await this.guildMemberQueryService.findMemberWithGuildSettings(
          userId,
          guildId,
        );

      if (!membership) {
        return {
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          roles: [],
        };
      }

      return {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        roles: membership.roles ?? [],
      };
    } catch (error) {
      this.logger.error(
        `Failed to get guild stats for user ${userId} in guild ${guildId}:`,
        error,
      );
      return {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        roles: [],
      };
    }
  }
}
