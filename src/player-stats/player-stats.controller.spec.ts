/**
 * PlayerStatsController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import {
  PlayerStatsController,
  LeaderboardController,
} from './player-stats.controller';
import { PlayerLeagueStatsService } from './services/player-league-stats.service';

describe('PlayerStatsController', () => {
  let controller: PlayerStatsController;
  let mockStatsService: PlayerLeagueStatsService;

  beforeEach(async () => {
    mockStatsService = {
      getStats: vi.fn(),
      getLeaderboard: vi.fn(),
    } as unknown as PlayerLeagueStatsService;

    const module = await Test.createTestingModule({
      controllers: [PlayerStatsController],
      providers: [
        { provide: PlayerLeagueStatsService, useValue: mockStatsService },
      ],
    }).compile();

    controller = module.get<PlayerStatsController>(PlayerStatsController);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getStats', () => {
    it('should_return_stats_when_player_and_league_provided', async () => {
      const mockStats = { wins: 10, losses: 5 };
      vi.mocked(mockStatsService.getStats).mockResolvedValue(
        mockStats as never,
      );

      const result = await controller.getStats('player-1', 'league-1');

      expect(result).toEqual(mockStats);
      expect(mockStatsService.getStats).toHaveBeenCalledWith(
        'player-1',
        'league-1',
      );
    });
  });
});

describe('LeaderboardController', () => {
  let controller: LeaderboardController;
  let mockStatsService: PlayerLeagueStatsService;

  beforeEach(async () => {
    mockStatsService = {
      getLeaderboard: vi.fn(),
    } as unknown as PlayerLeagueStatsService;

    const module = await Test.createTestingModule({
      controllers: [LeaderboardController],
      providers: [
        { provide: PlayerLeagueStatsService, useValue: mockStatsService },
      ],
    }).compile();

    controller = module.get<LeaderboardController>(LeaderboardController);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getLeaderboard', () => {
    it('should_return_leaderboard_when_league_id_provided', async () => {
      const mockLeaderboard = [{ rank: 1, playerId: 'player-1' }];
      vi.mocked(mockStatsService.getLeaderboard).mockResolvedValue(
        mockLeaderboard as never,
      );

      const result = await controller.getLeaderboard('league-1');

      expect(result).toEqual(mockLeaderboard);
      expect(mockStatsService.getLeaderboard).toHaveBeenCalledWith(
        'league-1',
        10,
      );
    });
  });
});
