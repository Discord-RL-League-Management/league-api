/**
 * MatchService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { MatchService } from './match.service';
import { MatchRepository } from '../repositories/match.repository';
import { MatchParticipantRepository } from '../repositories/match-participant.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { PlayerLeagueStatsService } from '../../player-stats/services/player-league-stats.service';
import { PlayerLeagueRatingService } from '../../player-ratings/services/player-league-rating.service';
import { MatchStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

describe('MatchService', () => {
  let service: MatchService;
  let mockMatchRepository: MatchRepository;
  let mockParticipantRepository: MatchParticipantRepository;
  let mockPrisma: PrismaService;
  let mockStatsService: PlayerLeagueStatsService;
  let mockRatingService: PlayerLeagueRatingService;

  const mockMatch = {
    id: 'match_123',
    leagueId: 'league_123',
    tournamentId: null,
    round: null,
    status: MatchStatus.SCHEDULED,
    scheduledAt: new Date(),
    playedAt: null,
    winnerId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPlayer = {
    id: 'player_123',
    userId: 'user_123',
    guildId: 'guild_123',
    status: 'ACTIVE' as const,
    lastLeftLeagueAt: null,
    lastLeftLeagueId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockParticipant = {
    id: 'participant_123',
    matchId: 'match_123',
    playerId: 'player_123',
    teamId: null,
    teamMemberId: null,
    participantType: 'PLAYER' as const,
    isWinner: true,
    score: 3,
    goals: 2,
    assists: 1,
    saves: 5,
    shots: 8,
    wasSubstitute: false,
    substituteReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    player: mockPlayer,
  };

  beforeEach(() => {
    mockMatchRepository = {
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    } as unknown as MatchRepository;

    mockParticipantRepository = {
      create: vi.fn(),
    } as unknown as MatchParticipantRepository;

    mockStatsService = {
      incrementStats: vi.fn().mockResolvedValue(undefined),
    } as unknown as PlayerLeagueStatsService;

    mockRatingService = {
      updateRating: vi.fn().mockResolvedValue(undefined),
    } as unknown as PlayerLeagueRatingService;

    mockPrisma = {
      matchParticipant: {
        findMany: vi.fn(),
      },
      playerLeagueRating: {
        findUnique: vi.fn(),
      },
      $transaction: vi.fn().mockImplementation(async (callback) => {
        const mockTx = {
          match: {
            update: vi.fn(),
          },
          playerLeagueRating: {
            findUnique: vi.fn(),
          },
        } as unknown as Prisma.TransactionClient;
        return await callback(mockTx);
      }),
    } as unknown as PrismaService;

    service = new MatchService(
      mockMatchRepository,
      mockParticipantRepository,
      mockPrisma,
      mockStatsService,
      mockRatingService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findOne', () => {
    it('should_return_match_when_match_exists', async () => {
      const matchId = 'match_123';
      vi.mocked(mockMatchRepository.findById).mockResolvedValue(mockMatch);

      const result = await service.findOne(matchId);

      expect(result).toEqual(mockMatch);
      expect(mockMatchRepository.findById).toHaveBeenCalledWith(matchId);
    });

    it('should_return_null_when_match_does_not_exist', async () => {
      const matchId = 'nonexistent';
      vi.mocked(mockMatchRepository.findById).mockResolvedValue(null);

      const result = await service.findOne(matchId);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should_create_match_when_valid_dto_provided', async () => {
      const createDto = {
        leagueId: 'league_123',
        tournamentId: null,
        round: null,
        scheduledAt: new Date(),
      };
      const createdMatch = { ...mockMatch, ...createDto };
      vi.mocked(mockMatchRepository.create).mockResolvedValue(createdMatch);

      const result = await service.create(createDto);

      expect(result).toEqual(createdMatch);
      expect(mockMatchRepository.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('addParticipant', () => {
    it('should_add_participant_to_match_when_valid_dto_provided', async () => {
      const matchId = 'match_123';
      const participantDto = {
        playerId: 'player_123',
        isWinner: true,
        goals: 2,
        assists: 1,
      };
      const createdParticipant = {
        ...mockParticipant,
        ...participantDto,
        matchId,
      };
      vi.mocked(mockParticipantRepository.create).mockResolvedValue(
        createdParticipant,
      );

      const result = await service.addParticipant(matchId, participantDto);

      expect(result).toEqual(createdParticipant);
      expect(mockParticipantRepository.create).toHaveBeenCalledWith({
        ...participantDto,
        matchId,
      });
    });
  });

  describe('updateStatus', () => {
    it('should_update_match_status_when_valid_status_provided', async () => {
      const matchId = 'match_123';
      const status = 'IN_PROGRESS';
      const updatedMatch = { ...mockMatch, status: MatchStatus.IN_PROGRESS };
      vi.mocked(mockMatchRepository.update).mockResolvedValue(updatedMatch);

      const result = await service.updateStatus(matchId, status);

      expect(result).toEqual(updatedMatch);
      expect(mockMatchRepository.update).toHaveBeenCalledWith(matchId, {
        status: MatchStatus.IN_PROGRESS,
      });
    });
  });

  describe('completeMatch', () => {
    it('should_complete_match_with_winner_when_match_exists', async () => {
      const matchId = 'match_123';
      const winnerId = 'player_123';
      const participants = [mockParticipant];
      const completedMatch = {
        ...mockMatch,
        status: MatchStatus.COMPLETED,
        playedAt: new Date(),
        winnerId,
      };
      const mockTx = {
        match: {
          update: vi.fn().mockResolvedValue(completedMatch),
        },
        playerLeagueRating: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      } as unknown as Prisma.TransactionClient;

      vi.mocked(mockMatchRepository.findById).mockResolvedValue(mockMatch);
      vi.mocked(mockPrisma.matchParticipant.findMany).mockResolvedValue(
        participants,
      );
      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback) => {
          return await callback(mockTx);
        },
      );

      const result = await service.completeMatch(matchId, winnerId);

      expect(result.status).toBe(MatchStatus.COMPLETED);
      expect(result.winnerId).toBe(winnerId);
      expect(result.playedAt).toBeInstanceOf(Date);
      expect(mockStatsService.incrementStats).toHaveBeenCalled();
      expect(mockRatingService.updateRating).toHaveBeenCalled();
    });

    it('should_complete_match_without_winner_when_winner_not_provided', async () => {
      const matchId = 'match_123';
      const participants = [mockParticipant];
      const completedMatch = {
        ...mockMatch,
        status: MatchStatus.COMPLETED,
        playedAt: new Date(),
        winnerId: null,
      };
      const mockTx = {
        match: {
          update: vi.fn().mockResolvedValue(completedMatch),
        },
        playerLeagueRating: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      } as unknown as Prisma.TransactionClient;

      vi.mocked(mockMatchRepository.findById).mockResolvedValue(mockMatch);
      vi.mocked(mockPrisma.matchParticipant.findMany).mockResolvedValue(
        participants,
      );
      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback) => {
          return await callback(mockTx);
        },
      );

      const result = await service.completeMatch(matchId);

      expect(result.status).toBe(MatchStatus.COMPLETED);
      expect(result.winnerId).toBeNull();
    });

    it('should_return_match_without_reprocessing_when_match_already_completed', async () => {
      const matchId = 'match_123';
      const completedMatch = {
        ...mockMatch,
        status: MatchStatus.COMPLETED,
        playedAt: new Date(),
      };
      vi.mocked(mockMatchRepository.findById).mockResolvedValue(completedMatch);

      const result = await service.completeMatch(matchId);

      expect(result).toEqual(completedMatch);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockStatsService.incrementStats).not.toHaveBeenCalled();
    });

    it('should_complete_match_without_participants_when_no_participants_exist', async () => {
      const matchId = 'match_123';
      const completedMatch = {
        ...mockMatch,
        status: MatchStatus.COMPLETED,
        playedAt: new Date(),
      };
      const mockTx = {
        match: {
          update: vi.fn().mockResolvedValue(completedMatch),
        },
      } as unknown as Prisma.TransactionClient;

      vi.mocked(mockMatchRepository.findById).mockResolvedValue(mockMatch);
      vi.mocked(mockPrisma.matchParticipant.findMany).mockResolvedValue([]);
      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback) => {
          return await callback(mockTx);
        },
      );

      const result = await service.completeMatch(matchId);

      expect(result.status).toBe(MatchStatus.COMPLETED);
      expect(mockStatsService.incrementStats).not.toHaveBeenCalled();
      expect(mockRatingService.updateRating).not.toHaveBeenCalled();
    });

    it('should_update_stats_for_all_participants_when_completing_match', async () => {
      const matchId = 'match_123';
      const participants = [
        { ...mockParticipant, isWinner: true },
        { ...mockParticipant, id: 'participant_456', isWinner: false },
      ];
      const completedMatch = {
        ...mockMatch,
        status: MatchStatus.COMPLETED,
        playedAt: new Date(),
      };
      const mockTx = {
        match: {
          update: vi.fn().mockResolvedValue(completedMatch),
        },
        playerLeagueRating: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      } as unknown as Prisma.TransactionClient;

      vi.mocked(mockMatchRepository.findById).mockResolvedValue(mockMatch);
      vi.mocked(mockPrisma.matchParticipant.findMany).mockResolvedValue(
        participants,
      );
      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback) => {
          return await callback(mockTx);
        },
      );

      await service.completeMatch(matchId);

      expect(mockStatsService.incrementStats).toHaveBeenCalledTimes(2);
      expect(mockRatingService.updateRating).toHaveBeenCalledTimes(2);
    });

    it('should_update_rating_with_existing_rating_when_rating_exists', async () => {
      const matchId = 'match_123';
      const participants = [mockParticipant];
      const existingRating = {
        id: 'rating_123',
        playerId: 'player_123',
        leagueId: 'league_123',
        matchesPlayed: 5,
        wins: 3,
        losses: 2,
      };
      const completedMatch = {
        ...mockMatch,
        status: MatchStatus.COMPLETED,
        playedAt: new Date(),
      };
      const mockTx = {
        match: {
          update: vi.fn().mockResolvedValue(completedMatch),
        },
        playerLeagueRating: {
          findUnique: vi.fn().mockResolvedValue(existingRating),
        },
      } as unknown as Prisma.TransactionClient;

      vi.mocked(mockMatchRepository.findById).mockResolvedValue(mockMatch);
      vi.mocked(mockPrisma.matchParticipant.findMany).mockResolvedValue(
        participants,
      );
      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback) => {
          return await callback(mockTx);
        },
      );

      await service.completeMatch(matchId);

      expect(mockRatingService.updateRating).toHaveBeenCalledWith(
        'player_123',
        'league_123',
        expect.objectContaining({
          matchesPlayed: 6,
          wins: 4,
          losses: 2,
        }),
        mockTx,
      );
    });

    it('should_throw_not_found_exception_when_match_does_not_exist', async () => {
      const matchId = 'nonexistent';
      vi.mocked(mockMatchRepository.findById).mockResolvedValue(null);

      await expect(service.completeMatch(matchId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.completeMatch(matchId)).rejects.toThrow(
        `Match with ID ${matchId} not found`,
      );
    });

    it('should_handle_participant_with_null_stats', async () => {
      const matchId = 'match_123';
      const participantWithNullStats = {
        ...mockParticipant,
        goals: null,
        assists: null,
        saves: null,
        shots: null,
      };
      const participants = [participantWithNullStats];
      const completedMatch = {
        ...mockMatch,
        status: MatchStatus.COMPLETED,
        playedAt: new Date(),
      };
      const mockTx = {
        match: {
          update: vi.fn().mockResolvedValue(completedMatch),
        },
        playerLeagueRating: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      } as unknown as Prisma.TransactionClient;

      vi.mocked(mockMatchRepository.findById).mockResolvedValue(mockMatch);
      vi.mocked(mockPrisma.matchParticipant.findMany).mockResolvedValue(
        participants,
      );
      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback) => {
          return await callback(mockTx);
        },
      );

      await service.completeMatch(matchId);

      expect(mockStatsService.incrementStats).toHaveBeenCalledWith(
        'player_123',
        'league_123',
        expect.objectContaining({
          totalGoals: 0,
          totalAssists: 0,
          totalSaves: 0,
          totalShots: 0,
        }),
        mockTx,
      );
    });
  });
});
