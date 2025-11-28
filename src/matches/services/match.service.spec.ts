import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MatchService } from './match.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MatchRepository } from '../repositories/match.repository';
import { MatchParticipantRepository } from '../repositories/match-participant.repository';
import { PlayerLeagueStatsService } from '../../player-stats/services/player-league-stats.service';
import { PlayerLeagueRatingService } from '../../player-ratings/services/player-league-rating.service';

const mockPrismaService = {
  matchParticipant: {
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockMatchRepository = {
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  findAll: jest.fn(),
  delete: jest.fn(),
  exists: jest.fn(),
};

const mockParticipantRepository = {
  findById: jest.fn(),
  create: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  exists: jest.fn(),
};

const mockStatsService = {
  getStats: jest.fn(),
  getLeaderboard: jest.fn(),
  updateStats: jest.fn(),
  incrementStats: jest.fn(),
};

const mockRatingService = {
  getRating: jest.fn(),
  getStandings: jest.fn(),
  updateRating: jest.fn(),
};

describe('MatchService', () => {
  let service: MatchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: MatchRepository,
          useValue: mockMatchRepository,
        },
        {
          provide: MatchParticipantRepository,
          useValue: mockParticipantRepository,
        },
        {
          provide: PlayerLeagueStatsService,
          useValue: mockStatsService,
        },
        {
          provide: PlayerLeagueRatingService,
          useValue: mockRatingService,
        },
      ],
    }).compile();

    service = module.get<MatchService>(MatchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should successfully return a match when found', async () => {
      const matchId = 'match1';
      const expectedMatch = {
        id: matchId,
        leagueId: 'league1',
        status: 'SCHEDULED',
      };
      mockMatchRepository.findById.mockResolvedValue(expectedMatch);

      const result = await service.findOne(matchId);

      expect(result).toEqual(expectedMatch);
      expect(mockMatchRepository.findById).toHaveBeenCalledWith(matchId);
    });

    it('should return null when match is not found', async () => {
      const matchId = 'nonexistent';
      mockMatchRepository.findById.mockResolvedValue(null);

      const result = await service.findOne(matchId);

      expect(result).toBeNull();
      expect(mockMatchRepository.findById).toHaveBeenCalledWith(matchId);
    });
  });

  describe('create', () => {
    it('should successfully create a match and return the created match', async () => {
      const createDto = {
        leagueId: 'league1',
        tournamentId: 'tournament1',
        round: 1,
        scheduledAt: '2024-01-01T00:00:00Z',
      };
      const expectedMatch = { id: 'match1', ...createDto };
      mockMatchRepository.create.mockResolvedValue(expectedMatch);

      const result = await service.create(createDto);

      expect(result).toEqual(expectedMatch);
      expect(mockMatchRepository.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('addParticipant', () => {
    it('should successfully add a participant to a match and return the created participant', async () => {
      const matchId = 'match1';
      const participantDto = {
        playerId: 'player1',
        teamId: 'team1',
        isWinner: false,
      };
      const expectedParticipant = {
        id: 'participant1',
        matchId,
        ...participantDto,
      };
      mockParticipantRepository.create.mockResolvedValue(expectedParticipant);

      const result = await service.addParticipant(matchId, participantDto);

      expect(result).toEqual(expectedParticipant);
      expect(mockParticipantRepository.create).toHaveBeenCalledWith({
        ...participantDto,
        matchId,
      });
    });
  });

  describe('updateStatus', () => {
    it('should successfully update match status and return the updated match', async () => {
      const matchId = 'match1';
      const status = 'IN_PROGRESS';
      const expectedMatch = { id: matchId, status };
      mockMatchRepository.update.mockResolvedValue(expectedMatch);

      const result = await service.updateStatus(matchId, status);

      expect(result).toEqual(expectedMatch);
      expect(mockMatchRepository.update).toHaveBeenCalledWith(matchId, {
        status,
      });
    });
  });

  describe('completeMatch', () => {
    const matchId = 'match1';
    const leagueId = 'league1';
    const winnerId = 'player1';

    it('should throw NotFoundException when match is not found', async () => {
      mockMatchRepository.findById.mockResolvedValue(null);

      await expect(service.completeMatch(matchId, winnerId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.completeMatch(matchId, winnerId)).rejects.toThrow(
        `Match with ID ${matchId} not found`,
      );
      expect(mockMatchRepository.findById).toHaveBeenCalledWith(matchId);
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
      expect(mockStatsService.incrementStats).not.toHaveBeenCalled();
      expect(mockRatingService.updateRating).not.toHaveBeenCalled();
    });

    it('should return match without updates when match is already completed', async () => {
      const completedMatch = {
        id: matchId,
        leagueId,
        status: 'COMPLETED',
        winnerId: 'player1',
      };
      mockMatchRepository.findById.mockResolvedValue(completedMatch);

      const result = await service.completeMatch(matchId, winnerId);

      expect(result).toEqual(completedMatch);
      expect(mockMatchRepository.findById).toHaveBeenCalledWith(matchId);
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
      expect(mockStatsService.incrementStats).not.toHaveBeenCalled();
      expect(mockRatingService.updateRating).not.toHaveBeenCalled();
    });

    it('should successfully complete match and update stats/ratings for all participants', async () => {
      const mockMatch = {
        id: matchId,
        leagueId,
        status: 'SCHEDULED',
        scheduledAt: new Date(),
      };
      const mockParticipants = [
        {
          id: 'participant1',
          matchId,
          playerId: 'player1',
          leagueId,
          isWinner: true,
          goals: 2,
          assists: 1,
          saves: 3,
          shots: 5,
          player: { id: 'player1' },
        },
        {
          id: 'participant2',
          matchId,
          playerId: 'player2',
          leagueId,
          isWinner: false,
          goals: 1,
          assists: 0,
          saves: 2,
          shots: 3,
          player: { id: 'player2' },
        },
      ];
      const mockUpdatedMatch = {
        id: matchId,
        leagueId,
        status: 'COMPLETED',
        playedAt: new Date(),
        winnerId,
      };
      const mockCurrentRating = {
        playerId: 'player1',
        leagueId,
        matchesPlayed: 5,
        wins: 3,
        losses: 2,
      };

      mockMatchRepository.findById.mockResolvedValue(mockMatch);
      mockPrismaService.matchParticipant.findMany.mockResolvedValue(
        mockParticipants,
      );
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          match: {
            update: jest.fn().mockResolvedValue(mockUpdatedMatch),
          },
          playerLeagueRating: {
            findUnique: jest.fn().mockResolvedValue(mockCurrentRating),
          },
        };
        return callback(tx);
      });
      mockStatsService.incrementStats.mockResolvedValue({});
      mockRatingService.updateRating.mockResolvedValue({});

      const result = await service.completeMatch(matchId, winnerId);

      expect(result).toEqual(mockUpdatedMatch);
      expect(mockMatchRepository.findById).toHaveBeenCalledWith(matchId);
      expect(mockPrismaService.matchParticipant.findMany).toHaveBeenCalledWith({
        where: { matchId },
        include: { player: true },
      });
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockStatsService.incrementStats).toHaveBeenCalledTimes(2);
      expect(mockStatsService.incrementStats).toHaveBeenCalledWith(
        'player1',
        leagueId,
        {
          matchesPlayed: 1,
          wins: 1,
          losses: 0,
          draws: 0,
          totalGoals: 2,
          totalAssists: 1,
          totalSaves: 3,
          totalShots: 5,
        },
        expect.anything(),
      );
      expect(mockStatsService.incrementStats).toHaveBeenCalledWith(
        'player2',
        leagueId,
        {
          matchesPlayed: 1,
          wins: 0,
          losses: 1,
          draws: 0,
          totalGoals: 1,
          totalAssists: 0,
          totalSaves: 2,
          totalShots: 3,
        },
        expect.anything(),
      );
      expect(mockRatingService.updateRating).toHaveBeenCalledTimes(2);
    });

    it('should handle participants with null stats values by defaulting to zero', async () => {
      const mockMatch = {
        id: matchId,
        leagueId,
        status: 'SCHEDULED',
      };
      const mockParticipants = [
        {
          id: 'participant1',
          matchId,
          playerId: 'player1',
          leagueId,
          isWinner: true,
          goals: null,
          assists: null,
          saves: null,
          shots: null,
          player: { id: 'player1' },
        },
      ];
      const mockUpdatedMatch = {
        id: matchId,
        leagueId,
        status: 'COMPLETED',
        playedAt: new Date(),
        winnerId,
      };

      mockMatchRepository.findById.mockResolvedValue(mockMatch);
      mockPrismaService.matchParticipant.findMany.mockResolvedValue(
        mockParticipants,
      );
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          match: {
            update: jest.fn().mockResolvedValue(mockUpdatedMatch),
          },
          playerLeagueRating: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        };
        return callback(tx);
      });
      mockStatsService.incrementStats.mockResolvedValue({});
      mockRatingService.updateRating.mockResolvedValue({});

      const result = await service.completeMatch(matchId, winnerId);

      expect(result).toEqual(mockUpdatedMatch);
      expect(mockStatsService.incrementStats).toHaveBeenCalledWith(
        'player1',
        leagueId,
        {
          matchesPlayed: 1,
          wins: 1,
          losses: 0,
          draws: 0,
          totalGoals: 0,
          totalAssists: 0,
          totalSaves: 0,
          totalShots: 0,
        },
        expect.anything(),
      );
    });
  });
});
