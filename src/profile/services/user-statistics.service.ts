import { Injectable, Inject } from '@nestjs/common';
import { ILoggingService } from '../../infrastructure/logging/interfaces/logging.interface';
import { Prisma } from '@prisma/client';
import { GuildMemberRepository } from '../../guild-members/repositories/guild-member.repository';

/**
 * UserStatisticsService - Aggregates statistics for user profiles
 * Single Responsibility: Statistics aggregation and computation
 *
 * Separates statistics calculation from profile presentation.
 */
@Injectable()
export class UserStatisticsService {
  private readonly serviceName = UserStatisticsService.name;

  constructor(
    private guildMemberRepository: GuildMemberRepository,
    @Inject(ILoggingService)
    private readonly loggingService: ILoggingService,
  ) {}

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
      const memberships = await this.guildMemberRepository.findByUserId(
        userId,
        {
          guild: true,
        },
      );

      type GuildMemberWithGuild = Prisma.GuildMemberGetPayload<{
        include: { guild: true };
      }>;
      const typedMemberships = memberships as GuildMemberWithGuild[];

      const guildsCount = typedMemberships.length;
      const activeGuildsCount = typedMemberships.filter(
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
      this.loggingService.error(
        `Failed to get stats for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
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
      const membership = await this.guildMemberRepository.findByCompositeKey(
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
        roles: membership.roles || [],
      };
    } catch (error) {
      this.loggingService.error(
        `Failed to get guild stats for user ${userId} in guild ${guildId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
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
