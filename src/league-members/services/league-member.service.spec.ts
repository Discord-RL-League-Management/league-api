import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LeagueMemberService } from './league-member.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LeagueMemberRepository } from '../repositories/league-member.repository';
import { LeagueJoinValidationService } from './league-join-validation.service';
import { PlayerService } from '../../players/services/player.service';
import { LeagueSettingsService } from '../../leagues/league-settings.service';
import { ActivityLogService } from '../../infrastructure/activity-log/services/activity-log.service';
import { PlayerLeagueRatingService } from '../../player-ratings/services/player-league-rating.service';
import {
  LeagueMemberNotFoundException,
  LeagueMemberAlreadyExistsException,
} from '../exceptions/league-member.exceptions';

describe('LeagueMemberService', () => {
  let service: LeagueMemberService;
  let repository: LeagueMemberRepository;
  let joinValidationService: LeagueJoinValidationService;
  let playerService: PlayerService;
  let leagueSettingsService: LeagueSettingsService;
  let prisma: PrismaService;

  const mockRepository = {
    findById: jest.fn(),
    findByPlayerAndLeague: jest.fn(),
    findByLeagueId: jest.fn(),
    findByPlayerId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
  };

  const mockJoinValidationService = {
    validateJoin: jest.fn(),
  };

  const mockPlayerService = {
    findOne: jest.fn(),
    ensurePlayerExists: jest.fn(),
  };

  const mockLeagueSettingsService = {
    getSettings: jest.fn(),
  };

  const mockPrismaService = {
    league: {
      findUnique: jest.fn(),
    },
    player: {
      findUnique: jest.fn(),
    },
    leagueMember: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockActivityLogService = {
    logActivity: jest.fn(),
  };

  const mockRatingService = {
    updateRating: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeagueMemberService,
        {
          provide: LeagueMemberRepository,
          useValue: mockRepository,
        },
        {
          provide: LeagueJoinValidationService,
          useValue: mockJoinValidationService,
        },
        {
          provide: PlayerService,
          useValue: mockPlayerService,
        },
        {
          provide: LeagueSettingsService,
          useValue: mockLeagueSettingsService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ActivityLogService,
          useValue: mockActivityLogService,
        },
        {
          provide: PlayerLeagueRatingService,
          useValue: mockRatingService,
        },
      ],
    }).compile();

    service = module.get<LeagueMemberService>(LeagueMemberService);
    repository = module.get<LeagueMemberRepository>(LeagueMemberRepository);
    joinValidationService = module.get<LeagueJoinValidationService>(
      LeagueJoinValidationService,
    );
    playerService = module.get<PlayerService>(PlayerService);
    leagueSettingsService = module.get<LeagueSettingsService>(
      LeagueSettingsService,
    );
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('joinLeague', () => {
    const leagueId = 'league1';
    const joinDto = { playerId: 'player1', notes: 'Test join' };

    it('should join league successfully', async () => {
      const mockLeague = { id: leagueId, guildId: 'guild1' };
      const mockPlayer = { id: 'player1', userId: 'user1', guildId: 'guild1' };
      const mockSettings = { membership: { requiresApproval: false } };

      mockPrismaService.league.findUnique.mockResolvedValue(mockLeague);
      mockPlayerService.findOne.mockResolvedValue(mockPlayer);
      mockPlayerService.ensurePlayerExists.mockResolvedValue(mockPlayer);
      mockJoinValidationService.validateJoin.mockResolvedValue(undefined);
      mockRepository.findByPlayerAndLeague.mockResolvedValue(null);
      mockLeagueSettingsService.getSettings.mockResolvedValue(mockSettings);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          leagueMember: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({
              id: 'member1',
              playerId: 'player1',
              leagueId,
              status: 'ACTIVE',
            }),
          },
        };
        return callback(tx);
      });
      mockActivityLogService.logActivity.mockResolvedValue({});
      mockRatingService.updateRating.mockResolvedValue({});

      const result = await service.joinLeague(leagueId, joinDto);

      expect(mockJoinValidationService.validateJoin).toHaveBeenCalledWith(
        'player1',
        leagueId,
      );
      expect(result).toHaveProperty('id');
    });

    it('should throw error if league not found', async () => {
      mockPrismaService.league.findUnique.mockResolvedValue(null);

      await expect(service.joinLeague(leagueId, joinDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('leaveLeague', () => {
    it('should leave league successfully', async () => {
      const playerId = 'player1';
      const leagueId = 'league1';
      const mockMember = {
        id: 'member1',
        playerId,
        leagueId,
        status: 'ACTIVE',
      };
      const mockLeague = { id: leagueId, guildId: 'guild1' };
      const mockPlayer = { id: playerId, userId: 'user1', guildId: 'guild1' };
      const mockSettings = { membership: { cooldownAfterLeave: 7 } };

      mockRepository.findByPlayerAndLeague.mockResolvedValue(mockMember);
      mockLeagueSettingsService.getSettings.mockResolvedValue(mockSettings);
      mockPrismaService.league.findUnique.mockResolvedValue(mockLeague);
      mockPrismaService.player.findUnique.mockResolvedValue(mockPlayer);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          leagueMember: {
            update: jest
              .fn()
              .mockResolvedValue({ ...mockMember, status: 'INACTIVE' }),
          },
          player: {
            update: jest.fn().mockResolvedValue(mockPlayer),
          },
        };
        return callback(tx);
      });
      mockActivityLogService.logActivity.mockResolvedValue({});

      const result = await service.leaveLeague(playerId, leagueId);

      expect(result.status).toBe('INACTIVE');
      expect(mockActivityLogService.logActivity).toHaveBeenCalled();
    });
  });
});


