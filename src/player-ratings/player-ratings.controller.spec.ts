/**
 * PlayerRatingsController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import {
  PlayerRatingsController,
  StandingsController,
} from './player-ratings.controller';
import { PlayerLeagueRatingService } from './services/player-league-rating.service';

describe('PlayerRatingsController', () => {
  let controller: PlayerRatingsController;
  let mockRatingService: PlayerLeagueRatingService;

  beforeEach(async () => {
    mockRatingService = {
      getRating: vi.fn(),
      getStandings: vi.fn(),
    } as unknown as PlayerLeagueRatingService;

    const module = await Test.createTestingModule({
      controllers: [PlayerRatingsController],
      providers: [
        { provide: PlayerLeagueRatingService, useValue: mockRatingService },
      ],
    }).compile();

    controller = module.get<PlayerRatingsController>(PlayerRatingsController);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getRating', () => {
    it('should_return_rating_when_player_and_league_provided', async () => {
      const mockRating = { mmr: 1500, rank: 1 };
      vi.mocked(mockRatingService.getRating).mockResolvedValue(
        mockRating as never,
      );

      const result = await controller.getRating('player-1', 'league-1');

      expect(result).toEqual(mockRating);
      expect(mockRatingService.getRating).toHaveBeenCalledWith(
        'player-1',
        'league-1',
      );
    });
  });
});

describe('StandingsController', () => {
  let controller: StandingsController;
  let mockRatingService: PlayerLeagueRatingService;

  beforeEach(async () => {
    mockRatingService = {
      getStandings: vi.fn(),
    } as unknown as PlayerLeagueRatingService;

    const module = await Test.createTestingModule({
      controllers: [StandingsController],
      providers: [
        { provide: PlayerLeagueRatingService, useValue: mockRatingService },
      ],
    }).compile();

    controller = module.get<StandingsController>(StandingsController);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getStandings', () => {
    it('should_return_standings_when_league_id_provided', async () => {
      const mockStandings = [{ rank: 1, playerId: 'player-1' }];
      vi.mocked(mockRatingService.getStandings).mockResolvedValue(
        mockStandings as never,
      );

      const result = await controller.getStandings('league-1');

      expect(result).toEqual(mockStandings);
      expect(mockRatingService.getStandings).toHaveBeenCalledWith(
        'league-1',
        10,
      );
    });

    it('should_use_custom_limit_when_provided', async () => {
      const mockStandings = [];
      vi.mocked(mockRatingService.getStandings).mockResolvedValue(
        mockStandings as never,
      );

      await controller.getStandings('league-1', 20);

      expect(mockRatingService.getStandings).toHaveBeenCalledWith(
        'league-1',
        20,
      );
    });
  });
});
