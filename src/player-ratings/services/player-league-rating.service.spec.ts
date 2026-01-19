/**
 * PlayerLeagueRatingService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PlayerLeagueRatingService } from './player-league-rating.service';
import { PlayerLeagueRatingRepository } from '../repositories/player-league-rating.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

describe('PlayerLeagueRatingService', () => {
  let service: PlayerLeagueRatingService;
  let mockRepository: PlayerLeagueRatingRepository;
  let mockPrisma: PrismaService;

  const mockRating = {
    id: 'rating_123',
    playerId: 'player_123',
    leagueId: 'league_123',
    ratingSystem: 'DEFAULT',
    currentRating: 1500,
    rawRating: null,
    initialRating: 1000,
    peakRating: 1600,
    peakRatingAt: new Date('2024-01-15'),
    ratingData: {},
    matchesPlayed: 10,
    wins: 6,
    losses: 4,
    draws: 0,
    lastMatchId: 'match_123',
    lastUpdatedAt: new Date(),
  };

  beforeEach(() => {
    mockRepository = {
      findByPlayerAndLeague: vi.fn(),
      getStandings: vi.fn(),
    } as unknown as PlayerLeagueRatingRepository;

    mockPrisma = {
      playerLeagueRating: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
    } as unknown as PrismaService;

    service = new PlayerLeagueRatingService(mockRepository, mockPrisma);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getRating', () => {
    it('should_return_rating_when_rating_exists', async () => {
      const playerId = 'player_123';
      const leagueId = 'league_123';
      vi.mocked(mockRepository.findByPlayerAndLeague).mockResolvedValue(
        mockRating,
      );

      const result = await service.getRating(playerId, leagueId);

      expect(result).toEqual(mockRating);
      expect(mockRepository.findByPlayerAndLeague).toHaveBeenCalledWith(
        playerId,
        leagueId,
      );
    });

    it('should_return_null_when_rating_does_not_exist', async () => {
      const playerId = 'player_999';
      const leagueId = 'league_999';
      vi.mocked(mockRepository.findByPlayerAndLeague).mockResolvedValue(null);

      const result = await service.getRating(playerId, leagueId);

      expect(result).toBeNull();
    });
  });

  describe('getStandings', () => {
    it('should_return_sorted_standings_when_standings_exist', async () => {
      const leagueId = 'league_123';
      const limit = 10;
      const standings = [
        { ...mockRating, currentRating: 2000 },
        { ...mockRating, id: 'rating_456', currentRating: 1800 },
        { ...mockRating, id: 'rating_789', currentRating: 1600 },
      ];
      vi.mocked(mockRepository.getStandings).mockResolvedValue(standings);

      const result = await service.getStandings(leagueId, limit);

      expect(result).toEqual(standings);
      expect(mockRepository.getStandings).toHaveBeenCalledWith(leagueId, limit);
    });

    it('should_use_default_limit_when_limit_not_provided', async () => {
      const leagueId = 'league_123';
      vi.mocked(mockRepository.getStandings).mockResolvedValue([]);

      await service.getStandings(leagueId);

      expect(mockRepository.getStandings).toHaveBeenCalledWith(leagueId, 10);
    });

    it('should_return_empty_array_when_no_standings_exist', async () => {
      const leagueId = 'league_999';
      vi.mocked(mockRepository.getStandings).mockResolvedValue([]);

      const result = await service.getStandings(leagueId);

      expect(result).toEqual([]);
    });
  });

  describe('updateRating', () => {
    it('should_create_new_rating_when_rating_does_not_exist', async () => {
      const playerId = 'player_123';
      const leagueId = 'league_123';
      const ratingInput = {
        currentRating: 1200,
        initialRating: 1200,
        matchesPlayed: 5,
        wins: 3,
        losses: 2,
      };
      const createdRating = {
        ...mockRating,
        currentRating: 1200,
        initialRating: 1200,
        peakRating: 1200,
      };

      vi.mocked(mockPrisma.playerLeagueRating.findUnique).mockResolvedValue(
        null,
      );
      vi.mocked(mockPrisma.playerLeagueRating.upsert).mockResolvedValue(
        createdRating,
      );

      const result = await service.updateRating(
        playerId,
        leagueId,
        ratingInput,
      );

      expect(result).toEqual(createdRating);
      expect(result.currentRating).toBe(1200);
      expect(result.peakRating).toBe(1200);
      expect(result.initialRating).toBe(1200);
    });

    it('should_update_existing_rating_when_rating_exists', async () => {
      const playerId = 'player_123';
      const leagueId = 'league_123';
      const ratingInput = {
        currentRating: 1600,
        matchesPlayed: 15,
        wins: 10,
      };
      const updatedRating = {
        ...mockRating,
        currentRating: 1600,
        matchesPlayed: 15,
        wins: 10,
      };

      vi.mocked(mockPrisma.playerLeagueRating.findUnique).mockResolvedValue(
        mockRating,
      );
      vi.mocked(mockPrisma.playerLeagueRating.upsert).mockResolvedValue(
        updatedRating,
      );

      const result = await service.updateRating(
        playerId,
        leagueId,
        ratingInput,
      );

      expect(result).toEqual(updatedRating);
    });

    it('should_update_peak_rating_when_current_rating_exceeds_peak', async () => {
      const playerId = 'player_123';
      const leagueId = 'league_123';
      const ratingInput = {
        currentRating: 1700,
      };
      const existingRating = {
        ...mockRating,
        peakRating: 1600,
      };
      const peakDate = new Date();
      const updatedRating = {
        ...existingRating,
        currentRating: 1700,
        peakRating: 1700,
        peakRatingAt: peakDate,
      };

      vi.mocked(mockPrisma.playerLeagueRating.findUnique).mockResolvedValue(
        existingRating,
      );
      vi.mocked(mockPrisma.playerLeagueRating.upsert).mockResolvedValue(
        updatedRating,
      );

      const result = await service.updateRating(
        playerId,
        leagueId,
        ratingInput,
      );

      expect(result.peakRating).toBe(1700);
      expect(result.peakRatingAt).toBeInstanceOf(Date);
      expect(result.peakRatingAt).toEqual(peakDate);
    });

    it('should_not_update_peak_rating_when_current_rating_is_lower_than_peak', async () => {
      const playerId = 'player_123';
      const leagueId = 'league_123';
      const ratingInput = {
        currentRating: 1400,
      };
      const existingRating = {
        ...mockRating,
        peakRating: 1600,
        peakRatingAt: new Date('2024-01-15'),
      };
      const updatedRating = {
        ...existingRating,
        currentRating: 1400,
        peakRating: 1600,
        peakRatingAt: new Date('2024-01-15'),
      };

      vi.mocked(mockPrisma.playerLeagueRating.findUnique).mockResolvedValue(
        existingRating,
      );
      vi.mocked(mockPrisma.playerLeagueRating.upsert).mockResolvedValue(
        updatedRating,
      );

      const result = await service.updateRating(
        playerId,
        leagueId,
        ratingInput,
      );

      expect(result.peakRating).toBe(1600);
      expect(result.peakRatingAt).toEqual(new Date('2024-01-15'));
    });

    it('should_update_peak_rating_when_peak_rating_is_null', async () => {
      const playerId = 'player_123';
      const leagueId = 'league_123';
      const ratingInput = {
        currentRating: 1500,
      };
      const existingRating = {
        ...mockRating,
        peakRating: null,
        peakRatingAt: null,
      };
      const peakDate = new Date();
      const updatedRating = {
        ...existingRating,
        currentRating: 1500,
        peakRating: 1500,
        peakRatingAt: peakDate,
      };

      vi.mocked(mockPrisma.playerLeagueRating.findUnique).mockResolvedValue(
        existingRating,
      );
      vi.mocked(mockPrisma.playerLeagueRating.upsert).mockResolvedValue(
        updatedRating,
      );

      const result = await service.updateRating(
        playerId,
        leagueId,
        ratingInput,
      );

      expect(result.peakRating).toBe(1500);
      expect(result.peakRatingAt).toBeInstanceOf(Date);
      expect(result.peakRatingAt).toEqual(peakDate);
    });

    it('should_partially_update_rating_when_only_some_fields_provided', async () => {
      const playerId = 'player_123';
      const leagueId = 'league_123';
      const ratingInput = {
        wins: 7,
      };
      const updatedRating = {
        ...mockRating,
        wins: 7,
      };

      vi.mocked(mockPrisma.playerLeagueRating.findUnique).mockResolvedValue(
        mockRating,
      );
      vi.mocked(mockPrisma.playerLeagueRating.upsert).mockResolvedValue(
        updatedRating,
      );

      const result = await service.updateRating(
        playerId,
        leagueId,
        ratingInput,
      );

      expect(result.wins).toBe(7);
      expect(result.currentRating).toBe(mockRating.currentRating);
    });

    it('should_use_transaction_client_when_transaction_provided', async () => {
      const playerId = 'player_123';
      const leagueId = 'league_123';
      const ratingInput = {
        currentRating: 1500,
      };
      const mockTx = {
        playerLeagueRating: {
          findUnique: vi.fn().mockResolvedValue(null),
          upsert: vi.fn().mockResolvedValue(mockRating),
        },
      } as unknown as Prisma.TransactionClient;

      await service.updateRating(playerId, leagueId, ratingInput, mockTx);

      expect(mockTx.playerLeagueRating.findUnique).toHaveBeenCalled();
      expect(mockTx.playerLeagueRating.upsert).toHaveBeenCalled();
      expect(mockPrisma.playerLeagueRating.findUnique).not.toHaveBeenCalled();
    });

    it('should_use_default_prisma_client_when_transaction_not_provided', async () => {
      const playerId = 'player_123';
      const leagueId = 'league_123';
      const ratingInput = {
        currentRating: 1500,
      };

      vi.mocked(mockPrisma.playerLeagueRating.findUnique).mockResolvedValue(
        null,
      );
      vi.mocked(mockPrisma.playerLeagueRating.upsert).mockResolvedValue(
        mockRating,
      );

      await service.updateRating(playerId, leagueId, ratingInput);

      expect(mockPrisma.playerLeagueRating.findUnique).toHaveBeenCalled();
      expect(mockPrisma.playerLeagueRating.upsert).toHaveBeenCalled();
    });

    it('should_set_default_values_when_creating_new_rating', async () => {
      const playerId = 'player_123';
      const leagueId = 'league_123';
      const ratingInput = {};
      const createdRating = {
        ...mockRating,
        ratingSystem: 'DEFAULT',
        currentRating: 1000,
        initialRating: 1000,
        peakRating: 1000,
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
      };

      vi.mocked(mockPrisma.playerLeagueRating.findUnique).mockResolvedValue(
        null,
      );
      vi.mocked(mockPrisma.playerLeagueRating.upsert).mockResolvedValue(
        createdRating,
      );

      const result = await service.updateRating(
        playerId,
        leagueId,
        ratingInput,
      );

      expect(result.ratingSystem).toBe('DEFAULT');
      expect(result.currentRating).toBe(1000);
      expect(result.initialRating).toBe(1000);
      expect(result.peakRating).toBe(1000);
    });

    it('should_handle_last_match_id_update', async () => {
      const playerId = 'player_123';
      const leagueId = 'league_123';
      const ratingInput = {
        lastMatchId: 'match_456',
      };
      const updatedRating = {
        ...mockRating,
        lastMatchId: 'match_456',
      };

      vi.mocked(mockPrisma.playerLeagueRating.findUnique).mockResolvedValue(
        mockRating,
      );
      vi.mocked(mockPrisma.playerLeagueRating.upsert).mockResolvedValue(
        updatedRating,
      );

      const result = await service.updateRating(
        playerId,
        leagueId,
        ratingInput,
      );

      expect(result.lastMatchId).toBe('match_456');
    });

    it('should_handle_null_last_match_id', async () => {
      const playerId = 'player_123';
      const leagueId = 'league_123';
      const ratingInput = {
        lastMatchId: null,
      };
      const updatedRating = {
        ...mockRating,
        lastMatchId: null,
      };

      vi.mocked(mockPrisma.playerLeagueRating.findUnique).mockResolvedValue(
        mockRating,
      );
      vi.mocked(mockPrisma.playerLeagueRating.upsert).mockResolvedValue(
        updatedRating,
      );

      const result = await service.updateRating(
        playerId,
        leagueId,
        ratingInput,
      );

      expect(result.lastMatchId).toBeNull();
    });
  });
});
