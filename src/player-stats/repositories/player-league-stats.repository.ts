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

  async upsert(playerId: string, leagueId: string, data: Partial<PlayerLeagueStats>, tx?: Prisma.TransactionClient) {
    // Calculate winRate if matchesPlayed > 0
    const winRate = data.matchesPlayed && data.matchesPlayed > 0 && data.wins !== undefined
      ? Number((data.wins / data.matchesPlayed).toFixed(4))
      : 0;

    const client = tx || this.prisma;
    return client.playerLeagueStats.upsert({
      where: { playerId_leagueId: { playerId, leagueId } },
      create: { playerId, leagueId, ...data, winRate } as any,
      update: { ...data, winRate },
    });
  }

  async incrementStats(playerId: string, leagueId: string, data: {
    matchesPlayed?: number;
    wins?: number;
    losses?: number;
    draws?: number;
    totalGoals?: number;
    totalAssists?: number;
    totalSaves?: number;
    totalShots?: number;
  }, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    
    // First upsert using atomic increments for counters
    const updated = await client.playerLeagueStats.upsert({
      where: { playerId_leagueId: { playerId, leagueId } },
      create: {
        playerId,
        leagueId,
        matchesPlayed: data.matchesPlayed || 0,
        wins: data.wins || 0,
        losses: data.losses || 0,
        draws: data.draws || 0,
        totalGoals: data.totalGoals || 0,
        totalAssists: data.totalAssists || 0,
        totalSaves: data.totalSaves || 0,
        totalShots: data.totalShots || 0,
        winRate: (data.matchesPlayed && data.matchesPlayed > 0 && data.wins) ? Number((data.wins / data.matchesPlayed).toFixed(4)) : 0,
        avgGoals: (data.matchesPlayed && data.matchesPlayed > 0 && data.totalGoals) ? Number((data.totalGoals / data.matchesPlayed).toFixed(4)) : 0,
        avgAssists: (data.matchesPlayed && data.matchesPlayed > 0 && data.totalAssists) ? Number((data.totalAssists / data.matchesPlayed).toFixed(4)) : 0,
        avgSaves: (data.matchesPlayed && data.matchesPlayed > 0 && data.totalSaves) ? Number((data.totalSaves / data.matchesPlayed).toFixed(4)) : 0,
        lastMatchAt: new Date(),
      },
      update: {
        matchesPlayed: { increment: data.matchesPlayed || 0 },
        wins: { increment: data.wins || 0 },
        losses: { increment: data.losses || 0 },
        draws: { increment: data.draws || 0 },
        totalGoals: { increment: data.totalGoals || 0 },
        totalAssists: { increment: data.totalAssists || 0 },
        totalSaves: { increment: data.totalSaves || 0 },
        totalShots: { increment: data.totalShots || 0 },
        lastMatchAt: new Date(),
      },
    });

    // Recalculate derived stats
    const matchesPlayed = updated.matchesPlayed;
    const wins = updated.wins;
    const winRate = matchesPlayed > 0 ? Number((wins / matchesPlayed).toFixed(4)) : 0;
    const avgGoals = matchesPlayed > 0 ? Number((updated.totalGoals / matchesPlayed).toFixed(4)) : 0;
    const avgAssists = matchesPlayed > 0 ? Number((updated.totalAssists / matchesPlayed).toFixed(4)) : 0;
    const avgSaves = matchesPlayed > 0 ? Number((updated.totalSaves / matchesPlayed).toFixed(4)) : 0;

    // Update derived stats
    return client.playerLeagueStats.update({
      where: { playerId_leagueId: { playerId, leagueId } },
      data: {
        winRate,
        avgGoals,
        avgAssists,
        avgSaves,
      },
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

