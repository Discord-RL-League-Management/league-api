import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PlayerLeagueStatsRepository } from '../repositories/player-league-stats.repository';

@Injectable()
export class PlayerLeagueStatsService {
  constructor(private repository: PlayerLeagueStatsRepository) {}

  async getStats(playerId: string, leagueId: string) {
    return this.repository.findByPlayerAndLeague(playerId, leagueId);
  }

  async getLeaderboard(leagueId: string, limit: number = 10) {
    return this.repository.getLeaderboard(leagueId, limit);
  }

  async updateStats(
    playerId: string,
    leagueId: string,
    stats: Partial<{
      matchesPlayed: number;
      wins: number;
      losses: number;
      draws: number;
      totalGoals: number;
      totalAssists: number;
      totalSaves: number;
      totalShots: number;
      lastMatchAt: Date | null;
    }>,
    tx?: Prisma.TransactionClient,
  ) {
    return this.repository.upsert(playerId, leagueId, stats, tx);
  }

  async incrementStats(
    playerId: string,
    leagueId: string,
    stats: {
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
    return this.repository.incrementStats(playerId, leagueId, stats, tx);
  }
}
