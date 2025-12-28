/**
 * PlayerService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PlayerService } from '@/players/services/player.service';
import { PlayerRepository } from '@/players/repositories/player.repository';
import { PlayerValidationService } from '@/players/services/player-validation.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ActivityLogService } from '@/infrastructure/activity-log/services/activity-log.service';
import { CreatePlayerDto } from '@/players/dto/create-player.dto';
import { UpdatePlayerDto } from '@/players/dto/update-player.dto';
import {
  PlayerNotFoundException,
  PlayerAlreadyExistsException,
  InvalidPlayerStatusException,
} from '@/players/exceptions/player.exceptions';
import { Player, PlayerStatus } from '@prisma/client';

describe('PlayerService', () => {
  let service: PlayerService;
  let mockPlayerRepository: PlayerRepository;
  let mockValidationService: PlayerValidationService;
  let mockPrisma: PrismaService;
  let mockActivityLogService: ActivityLogService;

  const playerId = 'player-123';
  const userId = 'user-123';
  const guildId = 'guild-123';

  const mockPlayer: Player = {
    id: playerId,
    userId,
    guildId,
    status: PlayerStatus.ACTIVE,
    lastLeftLeagueId: null,
    lastLeftLeagueAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // ARRANGE: Setup test dependencies with mocks
    mockPlayerRepository = {
      findById: vi.fn(),
      findByUserIdAndGuildId: vi.fn(),
      findByGuildId: vi.fn(),
      findByUserId: vi.fn(),
      findAll: vi.fn(),
      updateCooldown: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
    } as unknown as PlayerRepository;

    mockValidationService = {
      validateGuildMembership: vi.fn().mockResolvedValue(undefined),
      validateTrackerLink: vi.fn().mockResolvedValue(undefined),
      validatePlayerStatus: vi.fn().mockReturnValue(undefined),
    } as unknown as PlayerValidationService;

    mockActivityLogService = {
      logActivity: vi.fn().mockResolvedValue(undefined),
    } as unknown as ActivityLogService;

    mockPrisma = {
      $transaction: vi.fn().mockImplementation((callback) => {
        const mockTx = {
          player: {
            create: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn(),
          },
        } as any;
        return callback(mockTx);
      }),
    } as unknown as PrismaService;

    service = new PlayerService(
      mockPlayerRepository,
      mockValidationService,
      mockPrisma,
      mockActivityLogService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findOne', () => {
    it('should_return_player_when_player_exists', async () => {
      // ARRANGE
      vi.mocked(mockPlayerRepository.findById).mockResolvedValue(mockPlayer);

      // ACT
      const result = await service.findOne(playerId);

      // ASSERT
      expect(result).toEqual(mockPlayer);
      expect(result.id).toBe(playerId);
    });

    it('should_throw_PlayerNotFoundException_when_player_does_not_exist', async () => {
      // ARRANGE
      vi.mocked(mockPlayerRepository.findById).mockResolvedValue(null);

      // ACT & ASSERT
      await expect(service.findOne(playerId)).rejects.toThrow(
        PlayerNotFoundException,
      );
    });
  });

  describe('findByUserIdAndGuildId', () => {
    it('should_return_player_when_player_exists', async () => {
      // ARRANGE
      vi.mocked(mockPlayerRepository.findByUserIdAndGuildId).mockResolvedValue(
        mockPlayer,
      );

      // ACT
      const result = await service.findByUserIdAndGuildId(userId, guildId);

      // ASSERT
      expect(result).toEqual(mockPlayer);
    });

    it('should_return_null_when_player_does_not_exist', async () => {
      // ARRANGE
      vi.mocked(mockPlayerRepository.findByUserIdAndGuildId).mockResolvedValue(
        null,
      );

      // ACT
      const result = await service.findByUserIdAndGuildId(userId, guildId);

      // ASSERT
      expect(result).toBeNull();
    });
  });

  describe('findByGuildId', () => {
    it('should_return_paginated_players_for_guild', async () => {
      // ARRANGE
      const mockResult = {
        data: [mockPlayer],
        total: 1,
        page: 1,
        limit: 50,
      };
      vi.mocked(mockPlayerRepository.findByGuildId).mockResolvedValue(
        mockResult,
      );

      // ACT
      const result = await service.findByGuildId(guildId);

      // ASSERT
      expect(result).toEqual(mockResult);
      expect(result.data).toHaveLength(1);
    });

    it('should_use_pagination_options_when_provided', async () => {
      // ARRANGE
      const mockResult = {
        data: [mockPlayer],
        total: 1,
        page: 2,
        limit: 10,
      };
      vi.mocked(mockPlayerRepository.findByGuildId).mockResolvedValue(
        mockResult,
      );

      // ACT
      const result = await service.findByGuildId(guildId, {
        page: 2,
        limit: 10,
      });

      // ASSERT
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });
  });

  describe('findByUserId', () => {
    it('should_return_paginated_players_for_user', async () => {
      // ARRANGE
      const mockResult = {
        data: [mockPlayer],
        total: 1,
        page: 1,
        limit: 50,
      };
      vi.mocked(mockPlayerRepository.findByUserId).mockResolvedValue(
        mockResult,
      );

      // ACT
      const result = await service.findByUserId(userId);

      // ASSERT
      expect(result).toEqual(mockResult);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findAll', () => {
    it('should_return_paginated_all_players', async () => {
      // ARRANGE
      const mockResult = {
        data: [mockPlayer],
        total: 1,
        page: 1,
        limit: 50,
      };
      vi.mocked(mockPlayerRepository.findAll).mockResolvedValue(mockResult);

      // ACT
      const result = await service.findAll();

      // ASSERT
      expect(result).toEqual(mockResult);
    });
  });

  describe('create', () => {
    it('should_create_player_successfully_when_validation_passes', async () => {
      // ARRANGE
      const createDto: CreatePlayerDto = {
        userId,
        guildId,
        status: PlayerStatus.ACTIVE,
      };

      vi.mocked(mockPlayerRepository.findByUserIdAndGuildId).mockResolvedValue(
        null,
      );
      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback) => {
          const mockTx = {
            player: {
              create: vi.fn().mockResolvedValue(mockPlayer),
            },
          } as any;
          return callback(mockTx);
        },
      );

      // ACT
      const result = await service.create(createDto);

      // ASSERT
      expect(result).toEqual(mockPlayer);
      expect(result.userId).toBe(userId);
      expect(result.guildId).toBe(guildId);
    });

    it('should_throw_PlayerAlreadyExistsException_when_player_already_exists', async () => {
      // ARRANGE
      const createDto: CreatePlayerDto = {
        userId,
        guildId,
      };

      vi.mocked(mockPlayerRepository.findByUserIdAndGuildId).mockResolvedValue(
        mockPlayer,
      );

      // ACT & ASSERT
      await expect(service.create(createDto)).rejects.toThrow(
        PlayerAlreadyExistsException,
      );
    });

    it('should_validate_guild_membership_before_creating', async () => {
      // ARRANGE
      const createDto: CreatePlayerDto = {
        userId,
        guildId,
      };
      const validationError = new NotFoundException(
        'Guild membership not found',
      );
      vi.mocked(
        mockValidationService.validateGuildMembership,
      ).mockRejectedValue(validationError);
      vi.mocked(mockPlayerRepository.findByUserIdAndGuildId).mockResolvedValue(
        null,
      );

      // ACT & ASSERT
      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should_throw_PlayerAlreadyExistsException_on_prisma_unique_constraint', async () => {
      // ARRANGE
      const createDto: CreatePlayerDto = {
        userId,
        guildId,
      };
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '1.0.0',
        },
      );

      vi.mocked(mockPlayerRepository.findByUserIdAndGuildId).mockResolvedValue(
        null,
      );
      vi.mocked(mockPrisma.$transaction).mockRejectedValue(prismaError);

      // ACT & ASSERT
      await expect(service.create(createDto)).rejects.toThrow(
        PlayerAlreadyExistsException,
      );
    });

    it('should_throw_InternalServerErrorException_on_unexpected_error', async () => {
      // ARRANGE
      const createDto: CreatePlayerDto = {
        userId,
        guildId,
      };

      vi.mocked(mockPlayerRepository.findByUserIdAndGuildId).mockResolvedValue(
        null,
      );
      vi.mocked(mockPrisma.$transaction).mockRejectedValue(
        new Error('Database error'),
      );

      // ACT & ASSERT
      await expect(service.create(createDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('ensurePlayerExists', () => {
    it('should_return_existing_player_when_player_exists', async () => {
      // ARRANGE
      vi.mocked(mockPlayerRepository.findByUserIdAndGuildId).mockResolvedValue(
        mockPlayer,
      );

      // ACT
      const result = await service.ensurePlayerExists(userId, guildId);

      // ASSERT
      expect(result).toEqual(mockPlayer);
    });

    it('should_auto_create_player_when_player_does_not_exist', async () => {
      // ARRANGE
      vi.mocked(mockPlayerRepository.findByUserIdAndGuildId).mockResolvedValue(
        null,
      );
      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback) => {
          const mockTx = {
            player: {
              findUnique: vi.fn().mockResolvedValue(null),
              create: vi.fn().mockResolvedValue(mockPlayer),
            },
          } as any;
          return callback(mockTx);
        },
      );

      // ACT
      const result = await service.ensurePlayerExists(userId, guildId);

      // ASSERT
      expect(result).toEqual(mockPlayer);
      expect(result.status).toBe(PlayerStatus.ACTIVE);
    });

    it('should_return_existing_player_from_transaction_when_created_concurrently', async () => {
      // ARRANGE
      vi.mocked(mockPlayerRepository.findByUserIdAndGuildId).mockResolvedValue(
        null,
      );
      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback) => {
          const mockTx = {
            player: {
              findUnique: vi.fn().mockResolvedValue(mockPlayer), // Created by another transaction
              create: vi.fn(),
            },
          } as any;
          return callback(mockTx);
        },
      );

      // ACT
      const result = await service.ensurePlayerExists(userId, guildId);

      // ASSERT
      expect(result).toEqual(mockPlayer);
    });

    it('should_validate_guild_membership_before_creating', async () => {
      // ARRANGE
      const validationError = new NotFoundException(
        'Guild membership not found',
      );
      vi.mocked(mockPlayerRepository.findByUserIdAndGuildId).mockResolvedValue(
        null,
      );
      vi.mocked(
        mockValidationService.validateGuildMembership,
      ).mockRejectedValue(validationError);

      // ACT & ASSERT
      await expect(service.ensurePlayerExists(userId, guildId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should_update_player_status_successfully', async () => {
      // ARRANGE
      const updateDto: UpdatePlayerDto = {
        status: PlayerStatus.INACTIVE,
      };
      const updatedPlayer = { ...mockPlayer, status: PlayerStatus.INACTIVE };

      vi.mocked(mockPlayerRepository.findById).mockResolvedValue(mockPlayer);
      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback) => {
          const mockTx = {
            player: {
              update: vi.fn().mockResolvedValue(updatedPlayer),
            },
          } as any;
          return callback(mockTx);
        },
      );

      // ACT
      const result = await service.update(playerId, updateDto);

      // ASSERT
      expect(result).toEqual(updatedPlayer);
      expect(result.status).toBe(PlayerStatus.INACTIVE);
    });

    it('should_throw_PlayerNotFoundException_when_player_does_not_exist', async () => {
      // ARRANGE
      const updateDto: UpdatePlayerDto = {
        status: PlayerStatus.INACTIVE,
      };

      vi.mocked(mockPlayerRepository.findById).mockResolvedValue(null);

      // ACT & ASSERT
      await expect(service.update(playerId, updateDto)).rejects.toThrow(
        PlayerNotFoundException,
      );
    });

    it('should_validate_status_transition_when_status_changes', async () => {
      // ARRANGE
      const updateDto: UpdatePlayerDto = {
        status: PlayerStatus.INACTIVE,
      };
      const validationError = new InvalidPlayerStatusException(
        'Invalid status transition',
      );

      vi.mocked(mockPlayerRepository.findById).mockResolvedValue(mockPlayer);
      vi.mocked(mockValidationService.validatePlayerStatus).mockImplementation(
        () => {
          throw validationError;
        },
      );

      // ACT & ASSERT
      await expect(service.update(playerId, updateDto)).rejects.toThrow(
        InvalidPlayerStatusException,
      );
    });

    it('should_throw_InternalServerErrorException_on_unexpected_error', async () => {
      // ARRANGE
      const updateDto: UpdatePlayerDto = {
        status: PlayerStatus.INACTIVE,
      };

      vi.mocked(mockPlayerRepository.findById).mockResolvedValue(mockPlayer);
      vi.mocked(mockPrisma.$transaction).mockRejectedValue(
        new Error('Database error'),
      );

      // ACT & ASSERT
      await expect(service.update(playerId, updateDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('updateCooldown', () => {
    it('should_update_cooldown_successfully', async () => {
      // ARRANGE
      const lastLeftLeagueId = 'league-123';
      const updatedPlayer = {
        ...mockPlayer,
        lastLeftLeagueAt: new Date(),
        lastLeftLeagueId,
      };

      vi.mocked(mockPlayerRepository.findById).mockResolvedValue(mockPlayer);
      vi.mocked(mockPlayerRepository.updateCooldown).mockResolvedValue(
        updatedPlayer as any,
      );

      // ACT
      const result = await service.updateCooldown(playerId, lastLeftLeagueId);

      // ASSERT
      expect(result).toEqual(updatedPlayer);
      expect(result.lastLeftLeagueId).toBe(lastLeftLeagueId);
    });

    it('should_throw_PlayerNotFoundException_when_player_does_not_exist', async () => {
      // ARRANGE
      vi.mocked(mockPlayerRepository.findById).mockResolvedValue(null);

      // ACT & ASSERT
      await expect(
        service.updateCooldown(playerId, 'league-123'),
      ).rejects.toThrow(PlayerNotFoundException);
    });
  });

  describe('delete', () => {
    it('should_delete_player_successfully', async () => {
      // ARRANGE
      vi.mocked(mockPlayerRepository.findById).mockResolvedValue(mockPlayer);
      vi.mocked(mockPlayerRepository.delete).mockResolvedValue(mockPlayer);

      // ACT
      const result = await service.delete(playerId);

      // ASSERT
      expect(result).toEqual(mockPlayer);
    });

    it('should_throw_PlayerNotFoundException_when_player_does_not_exist', async () => {
      // ARRANGE
      vi.mocked(mockPlayerRepository.findById).mockResolvedValue(null);

      // ACT & ASSERT
      await expect(service.delete(playerId)).rejects.toThrow(
        PlayerNotFoundException,
      );
    });
  });

  describe('exists', () => {
    it('should_return_true_when_player_exists', async () => {
      // ARRANGE
      vi.mocked(mockPlayerRepository.exists).mockResolvedValue(true);

      // ACT
      const result = await service.exists(playerId);

      // ASSERT
      expect(result).toBe(true);
    });

    it('should_return_false_when_player_does_not_exist', async () => {
      // ARRANGE
      vi.mocked(mockPlayerRepository.exists).mockResolvedValue(false);

      // ACT
      const result = await service.exists(playerId);

      // ASSERT
      expect(result).toBe(false);
    });
  });
});
