import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, PlayerLeagueStats } from '@prisma/client';

@Injectable()
export class PlayerLeagueStatsRepository {
  constructor(private prisma: PrismaService) {}

  async findByPlayerAndLeague(playerId: string, leagueId: string) {
    return this.prisma.playerLeagueStats.findUnique({
      where: { playerId_leagueId: { playerId, leagueId } },
    });
  }

  async upsert(
    playerId: string,
    leagueId: string,
    data: Partial<PlayerLeagueStats>,
    tx?: Prisma.TransactionClient,
  ) {
    // Calculate winRate if matchesPlayed > 0
    const winRate =
      data.matchesPlayed && data.matchesPlayed > 0 && data.wins !== undefined
        ? Number((data.wins / data.matchesPlayed).toFixed(4))
        : 0;

    const client = tx || this.prisma;
    return client.playerLeagueStats.upsert({
      where: { playerId_leagueId: { playerId, leagueId } },
      create: {
        playerId,
        leagueId,
        ...data,
        winRate,
      } as unknown as Prisma.PlayerLeagueStatsCreateInput,
      update: { ...data, winRate },
    });
  }

  /**
   * Calculate win rate from matches and wins
   */
  private calculateWinRate(matchesPlayed: number, wins: number): number {
    return matchesPlayed > 0 ? Number((wins / matchesPlayed).toFixed(4)) : 0;
  }

  /**
   * Calculate average from total and matches
   */
  private calculateAverage(total: number, matchesPlayed: number): number {
    return matchesPlayed > 0 ? Number((total / matchesPlayed).toFixed(4)) : 0;
  }

  /**
   * Calculate all derived stats from base stats
   */
  private calculateDerivedStats(
    matchesPlayed: number,
    wins: number,
    totalGoals: number,
    totalAssists: number,
    totalSaves: number,
  ): {
    winRate: number;
    avgGoals: number;
    avgAssists: number;
    avgSaves: number;
  } {
    return {
      winRate: this.calculateWinRate(matchesPlayed, wins),
      avgGoals: this.calculateAverage(totalGoals, matchesPlayed),
      avgAssists: this.calculateAverage(totalAssists, matchesPlayed),
      avgSaves: this.calculateAverage(totalSaves, matchesPlayed),
    };
  }

  /**
   * Create initial stats data for new player
   */
  private createInitialStats(
    playerId: string,
    leagueId: string,
    data: {
      matchesPlayed?: number;
      wins?: number;
      losses?: number;
      draws?: number;
      totalGoals?: number;
      totalAssists?: number;
      totalSaves?: number;
      totalShots?: number;
    },
  ): Prisma.PlayerLeagueStatsCreateInput {
    const matchesPlayed = data.matchesPlayed || 0;
    const wins = data.wins || 0;
    const totalGoals = data.totalGoals || 0;
    const totalAssists = data.totalAssists || 0;
    const totalSaves = data.totalSaves || 0;

    const derived = this.calculateDerivedStats(
      matchesPlayed,
      wins,
      totalGoals,
      totalAssists,
      totalSaves,
    );

    return {
      player: { connect: { id: playerId } },
      league: { connect: { id: leagueId } },
      matchesPlayed,
      wins,
      losses: data.losses || 0,
      draws: data.draws || 0,
      totalGoals,
      totalAssists,
      totalSaves: data.totalSaves || 0,
      totalShots: data.totalShots || 0,
      winRate: derived.winRate,
      avgGoals: derived.avgGoals,
      avgAssists: derived.avgAssists,
      avgSaves: derived.avgSaves,
      lastMatchAt: new Date(),
    };
  }

  /**
   * Get increment operations for update
   */
  private getIncrementOperations(data: {
    matchesPlayed?: number;
    wins?: number;
    losses?: number;
    draws?: number;
    totalGoals?: number;
    totalAssists?: number;
    totalSaves?: number;
    totalShots?: number;
  }) {
    return {
      matchesPlayed: { increment: data.matchesPlayed || 0 },
      wins: { increment: data.wins || 0 },
      losses: { increment: data.losses || 0 },
      draws: { increment: data.draws || 0 },
      totalGoals: { increment: data.totalGoals || 0 },
      totalAssists: { increment: data.totalAssists || 0 },
      totalSaves: { increment: data.totalSaves || 0 },
      totalShots: { increment: data.totalShots || 0 },
      lastMatchAt: new Date(),
    };
  }

  async incrementStats(
    playerId: string,
    leagueId: string,
    data: {
      matchesPlayed?: number;
      wins?: number;
      losses?: number;
      draws?: number;
      totalGoals?: number;
      totalAssists?: number;
      totalSaves?: number;
      totalShots?: number;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;

    // First upsert using atomic increments for counters
    const updated = await client.playerLeagueStats.upsert({
      where: { playerId_leagueId: { playerId, leagueId } },
      create: this.createInitialStats(playerId, leagueId, data),
      update: this.getIncrementOperations(data),
    });

    // Recalculate derived stats from updated values
    const derived = this.calculateDerivedStats(
      updated.matchesPlayed,
      updated.wins,
      updated.totalGoals,
      updated.totalAssists,
      updated.totalSaves,
    );

    return client.playerLeagueStats.update({
      where: { playerId_leagueId: { playerId, leagueId } },
      data: derived,
    });
  }

  async getLeaderboard(leagueId: string, limit: number = 10) {
    return this.prisma.playerLeagueStats.findMany({
      where: { leagueId },
      orderBy: { wins: 'desc' },
      take: limit,
      include: { player: true },
    });
  }
}
