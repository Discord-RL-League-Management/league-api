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

  async getLeaderboard(leagueId: string, limit: number = 10) {
    return this.prisma.playerLeagueStats.findMany({
      where: { leagueId },
      orderBy: { wins: 'desc' },
      take: limit,
      include: { player: true },
    });
  }
}

