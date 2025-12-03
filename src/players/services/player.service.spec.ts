import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PlayerService } from './player.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PlayerRepository } from '../repositories/player.repository';
import { PlayerValidationService } from './player-validation.service';
import { ActivityLogService } from '../../infrastructure/activity-log/services/activity-log.service';
import {
  PlayerNotFoundException,
  PlayerAlreadyExistsException,
} from '../exceptions/player.exceptions';

describe('PlayerService', () => {
  let service: PlayerService;
  let prisma: PrismaService;
  let playerRepository: PlayerRepository;
  let validationService: PlayerValidationService;
  let activityLogService: ActivityLogService;

  const mockPrismaService = {
    player: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockPlayerRepository = {
    findById: jest.fn(),
    findByUserIdAndGuildId: jest.fn(),
    findByGuildId: jest.fn(),
    findByUserId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
    updateCooldown: jest.fn(),
  };

  const mockValidationService = {
    validateGuildMembership: jest.fn(),
    validateTrackerLink: jest.fn(),
    validatePlayerStatus: jest.fn(),
  };

  const mockActivityLogService = {
    logActivity: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayerService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: PlayerRepository,
          useValue: mockPlayerRepository,
        },
        {
          provide: PlayerValidationService,
          useValue: mockValidationService,
        },
        {
          provide: ActivityLogService,
          useValue: mockActivityLogService,
        },
      ],
    }).compile();

    service = module.get<PlayerService>(PlayerService);
    prisma = module.get<PrismaService>(PrismaService);
    playerRepository = module.get<PlayerRepository>(PlayerRepository);
    validationService = module.get<PlayerValidationService>(
      PlayerValidationService,
    );
    activityLogService = module.get<ActivityLogService>(ActivityLogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('should return a player when found', async () => {
      const mockPlayer = {
        id: 'player1',
        userId: 'user1',
        guildId: 'guild1',
        status: 'ACTIVE',
      };
      mockPlayerRepository.findById.mockResolvedValue(mockPlayer);

      const result = await service.findOne('player1');

      expect(result).toEqual(mockPlayer);
      expect(mockPlayerRepository.findById).toHaveBeenCalledWith(
        'player1',
        undefined,
      );
    });

    it('should throw PlayerNotFoundException when player not found', async () => {
      mockPlayerRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('player1')).rejects.toThrow(
        PlayerNotFoundException,
      );
    });
  });

  describe('create', () => {
    const createDto = {
      userId: 'user1',
      guildId: 'guild1',
      status: 'ACTIVE' as const,
    };

    it('should create a player successfully', async () => {
      mockValidationService.validateGuildMembership.mockResolvedValue(
        undefined,
      );
      mockPlayerRepository.findByUserIdAndGuildId.mockResolvedValue(null);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          player: {
            create: jest
              .fn()
              .mockResolvedValue({ id: 'player1', ...createDto }),
          },
        };
        return callback(tx);
      });
      mockActivityLogService.logActivity.mockResolvedValue({});

      const result = await service.create(createDto);

      expect(
        mockValidationService.validateGuildMembership,
      ).toHaveBeenCalledWith('user1', 'guild1');
      expect(mockPlayerRepository.findByUserIdAndGuildId).toHaveBeenCalledWith(
        'user1',
        'guild1',
      );
      expect(result).toHaveProperty('id');
    });

    it('should throw PlayerAlreadyExistsException when player already exists', async () => {
      mockValidationService.validateGuildMembership.mockResolvedValue(
        undefined,
      );
      mockPlayerRepository.findByUserIdAndGuildId.mockResolvedValue({
        id: 'existing',
      });

      await expect(service.create(createDto)).rejects.toThrow(
        PlayerAlreadyExistsException,
      );
    });
  });

  describe('ensurePlayerExists', () => {
    it('should return existing player if found', async () => {
      const existingPlayer = {
        id: 'player1',
        userId: 'user1',
        guildId: 'guild1',
      };
      mockPlayerRepository.findByUserIdAndGuildId.mockResolvedValue(
        existingPlayer,
      );

      const result = await service.ensurePlayerExists('user1', 'guild1');

      expect(result).toEqual(existingPlayer);
      expect(mockPlayerRepository.findByUserIdAndGuildId).toHaveBeenCalledWith(
        'user1',
        'guild1',
      );
    });

    it('should create player if not found', async () => {
      mockPlayerRepository.findByUserIdAndGuildId.mockResolvedValue(null);
      mockValidationService.validateGuildMembership.mockResolvedValue(
        undefined,
      );
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          player: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({
              id: 'player1',
              userId: 'user1',
              guildId: 'guild1',
            }),
          },
        };
        return callback(tx);
      });
      mockActivityLogService.logActivity.mockResolvedValue({});

      const result = await service.ensurePlayerExists('user1', 'guild1');

      expect(result).toHaveProperty('id');
      expect(mockActivityLogService.logActivity).toHaveBeenCalled();
    });
  });
});

