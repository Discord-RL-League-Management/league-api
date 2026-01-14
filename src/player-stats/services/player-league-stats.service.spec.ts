/**
 * PlayerLeagueStatsService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PlayerLeagueStatsService } from './player-league-stats.service';
import { PlayerLeagueStatsRepository } from '../repositories/player-league-stats.repository';
import { Prisma } from '@prisma/client';

describe('PlayerLeagueStatsService', () => {
  let service: PlayerLeagueStatsService;
  let mockRepository: PlayerLeagueStatsRepository;

  const mockStats = {
    id: 'stats_123',
    playerId: 'player_123',
    leagueId: 'league_123',
    matchesPlayed: 10,
    wins: 7,
    losses: 2,
    draws: 1,
    winRate: 0.7,
    totalGoals: 50,
    totalAssists: 30,
    totalSaves: 20,
    totalShots: 100,
    avgGoals: 5.0,
    avgAssists: 3.0,
    avgSaves: 2.0,
    lastMatchAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockRepository = {
      findByPlayerAndLeague: vi.fn(),
      getLeaderboard: vi.fn(),
      upsert: vi.fn(),
      incrementStats: vi.fn(),
    } as unknown as PlayerLeagueStatsRepository;

    service = new PlayerLeagueStatsService(mockRepository);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getStats', () => {
    it('should_return_stats_when_player_and_league_match', async () => {
      const playerId = 'player_123';
      const leagueId = 'league_123';
      vi.mocked(mockRepository.findByPlayerAndLeague).mockResolvedValue(
        mockStats,
      );

      const result = await service.getStats(playerId, leagueId);

      expect(result).toEqual(mockStats);
      expect(result?.playerId).toBe(playerId);
      expect(result?.leagueId).toBe(leagueId);
    });
  });

  describe('getLeaderboard', () => {
    it('should_return_leaderboard_when_limit_provided', async () => {
      const leagueId = 'league_123';
      const limit = 5;
      const leaderboard = [mockStats];
      vi.mocked(mockRepository.getLeaderboard).mockResolvedValue(leaderboard);

      const result = await service.getLeaderboard(leagueId, limit);

      expect(result).toEqual(leaderboard);
      expect(result).toHaveLength(1);
    });

    it('should_return_leaderboard_with_default_limit_when_limit_not_provided', async () => {
      const leagueId = 'league_123';
      const leaderboard = [mockStats];
      vi.mocked(mockRepository.getLeaderboard).mockResolvedValue(leaderboard);

      const result = await service.getLeaderboard(leagueId);

      expect(result).toEqual(leaderboard);
      expect(result).toHaveLength(1);
    });
  });

  describe('updateStats', () => {
    it('should_update_stats_when_transaction_not_provided', async () => {
      const playerId = 'player_123';
      const leagueId = 'league_123';
      const stats = {
        matchesPlayed: 11,
        wins: 8,
        totalGoals: 55,
      };
      const updatedStats = {
        ...mockStats,
        ...stats,
      };
      vi.mocked(mockRepository.upsert).mockResolvedValue(updatedStats);

      const result = await service.updateStats(playerId, leagueId, stats);

      expect(result).toEqual(updatedStats);
      expect(result.matchesPlayed).toBe(stats.matchesPlayed);
    });

    it('should_update_stats_when_transaction_provided', async () => {
      const playerId = 'player_123';
      const leagueId = 'league_123';
      const stats = {
        matchesPlayed: 11,
        wins: 8,
        totalGoals: 55,
      };
      const tx = {} as Prisma.TransactionClient;
      const updatedStats = {
        ...mockStats,
        ...stats,
      };
      vi.mocked(mockRepository.upsert).mockResolvedValue(updatedStats);

      const result = await service.updateStats(playerId, leagueId, stats, tx);

      expect(result).toEqual(updatedStats);
      expect(result.matchesPlayed).toBe(stats.matchesPlayed);
    });
  });

  describe('incrementStats', () => {
    it('should_increment_stats_when_transaction_not_provided', async () => {
      const playerId = 'player_123';
      const leagueId = 'league_123';
      const stats = {
        matchesPlayed: 1,
        wins: 1,
        totalGoals: 5,
      };
      const incrementedStats = {
        ...mockStats,
        matchesPlayed: mockStats.matchesPlayed + 1,
        wins: mockStats.wins + 1,
        totalGoals: mockStats.totalGoals + 5,
      };
      vi.mocked(mockRepository.incrementStats).mockResolvedValue(
        incrementedStats,
      );

      const result = await service.incrementStats(playerId, leagueId, stats);

      expect(result).toEqual(incrementedStats);
    });

    it('should_increment_stats_when_transaction_provided', async () => {
      const playerId = 'player_123';
      const leagueId = 'league_123';
      const stats = {
        matchesPlayed: 1,
        wins: 1,
        totalGoals: 5,
      };
      const tx = {} as Prisma.TransactionClient;
      const incrementedStats = {
        ...mockStats,
        matchesPlayed: mockStats.matchesPlayed + 1,
        wins: mockStats.wins + 1,
        totalGoals: mockStats.totalGoals + 5,
      };
      vi.mocked(mockRepository.incrementStats).mockResolvedValue(
        incrementedStats,
      );

      const result = await service.incrementStats(
        playerId,
        leagueId,
        stats,
        tx,
      );

      expect(result).toEqual(incrementedStats);
    });
  });
});
