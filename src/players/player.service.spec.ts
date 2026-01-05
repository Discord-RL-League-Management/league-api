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
import { PlayerService } from './player.service';
import { PlayerRepository } from './repositories/player.repository';
import { PlayerValidationService } from './services/player-validation.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ActivityLogService } from '@/infrastructure/activity-log/services/activity-log.service';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import {
  PlayerNotFoundException,
  PlayerAlreadyExistsException,
  InvalidPlayerStatusException,
} from './exceptions/player.exceptions';
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
    mockPlayerRepository = {
      findById: vi.fn(),
      findByUserIdAndGuildId: vi.fn(),
      findByGuildId: vi.fn(),
      findByUserId: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
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
      $transaction: vi.fn().mockImplementation(async (callback) => {
        const mockTx = {} as Prisma.TransactionClient;
        return await callback(mockTx);
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
      vi.mocked(mockPlayerRepository.findById).mockResolvedValue(mockPlayer);

      const result = await service.findOne(playerId);

      expect(result).toEqual(mockPlayer);
      expect(result.id).toBe(playerId);
    });

    it('should_throw_PlayerNotFoundException_when_player_does_not_exist', async () => {
      vi.mocked(mockPlayerRepository.findById).mockResolvedValue(null);

      await expect(service.findOne(playerId)).rejects.toThrow(
        PlayerNotFoundException,
      );
    });
  });

  describe('findByUserIdAndGuildId', () => {
    it('should_return_player_when_player_exists', async () => {
      vi.mocked(mockPlayerRepository.findByUserIdAndGuildId).mockResolvedValue(
        mockPlayer,
      );

      const result = await service.findByUserIdAndGuildId(userId, guildId);

      expect(result).toEqual(mockPlayer);
    });

    it('should_return_null_when_player_does_not_exist', async () => {
      vi.mocked(mockPlayerRepository.findByUserIdAndGuildId).mockResolvedValue(
        null,
      );

      const result = await service.findByUserIdAndGuildId(userId, guildId);

      expect(result).toBeNull();
    });
  });

  describe('findByGuildId', () => {
    it('should_return_paginated_players_for_guild', async () => {
      const mockResult = {
        data: [mockPlayer],
        total: 1,
        page: 1,
        limit: 50,
      };
      vi.mocked(mockPlayerRepository.findByGuildId).mockResolvedValue(
        mockResult,
      );

      const result = await service.findByGuildId(guildId);

      expect(result).toEqual(mockResult);
      expect(result.data).toHaveLength(1);
    });

    it('should_use_pagination_options_when_provided', async () => {
      const mockResult = {
        data: [mockPlayer],
        total: 1,
        page: 2,
        limit: 10,
      };
      vi.mocked(mockPlayerRepository.findByGuildId).mockResolvedValue(
        mockResult,
      );

      const result = await service.findByGuildId(guildId, {
        page: 2,
        limit: 10,
      });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });
  });

  describe('findByUserId', () => {
    it('should_return_paginated_players_for_user', async () => {
      const mockResult = {
        data: [mockPlayer],
        total: 1,
        page: 1,
        limit: 50,
      };
      vi.mocked(mockPlayerRepository.findByUserId).mockResolvedValue(
        mockResult,
      );

      const result = await service.findByUserId(userId);

      expect(result).toEqual(mockResult);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findAll', () => {
    it('should_return_paginated_all_players', async () => {
      const mockResult = {
        data: [mockPlayer],
        total: 1,
        page: 1,
        limit: 50,
      };
      vi.mocked(mockPlayerRepository.findAll).mockResolvedValue(mockResult);

      const result = await service.findAll();

      expect(result).toEqual(mockResult);
    });
  });

  describe('create', () => {
    it('should_create_player_successfully_when_validation_passes', async () => {
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
          const mockTx = {} as Prisma.TransactionClient;
          return await callback(mockTx);
        },
      );
      vi.mocked(mockPlayerRepository.create).mockResolvedValue(mockPlayer);

      const result = await service.create(createDto);

      expect(result).toEqual(mockPlayer);
      expect(result.userId).toBe(userId);
      expect(result.guildId).toBe(guildId);
      expect(mockPlayerRepository.create).toHaveBeenCalledWith(
        createDto,
        expect.anything(),
      );
    });

    it('should_throw_PlayerAlreadyExistsException_when_player_already_exists', async () => {
      const createDto: CreatePlayerDto = {
        userId,
        guildId,
      };

      vi.mocked(mockPlayerRepository.findByUserIdAndGuildId).mockResolvedValue(
        mockPlayer,
      );

      await expect(service.create(createDto)).rejects.toThrow(
        PlayerAlreadyExistsException,
      );
    });

    it('should_validate_guild_membership_before_creating', async () => {
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

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should_throw_PlayerAlreadyExistsException_on_prisma_unique_constraint', async () => {
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

      await expect(service.create(createDto)).rejects.toThrow(
        PlayerAlreadyExistsException,
      );
    });

    it('should_throw_InternalServerErrorException_on_unexpected_error', async () => {
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

      await expect(service.create(createDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('ensurePlayerExists', () => {
    it('should_return_existing_player_when_player_exists', async () => {
      vi.mocked(mockPlayerRepository.findByUserIdAndGuildId).mockResolvedValue(
        mockPlayer,
      );

      const result = await service.ensurePlayerExists(userId, guildId);

      expect(result).toEqual(mockPlayer);
    });

    it('should_auto_create_player_when_player_does_not_exist', async () => {
      vi.mocked(mockPlayerRepository.findByUserIdAndGuildId)
        .mockResolvedValueOnce(null) // First call before transaction
        .mockResolvedValueOnce(null); // Second call in transaction
      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback) => {
          const mockTx = {} as Prisma.TransactionClient;
          return await callback(mockTx);
        },
      );
      vi.mocked(mockPlayerRepository.create).mockResolvedValue(mockPlayer);

      const result = await service.ensurePlayerExists(userId, guildId);

      expect(result).toEqual(mockPlayer);
      expect(result.status).toBe(PlayerStatus.ACTIVE);
      expect(mockPlayerRepository.create).toHaveBeenCalledWith(
        {
          userId,
          guildId,
          status: PlayerStatus.ACTIVE,
        },
        expect.anything(),
      );
    });

    it('should_return_existing_player_from_transaction_when_created_concurrently', async () => {
      vi.mocked(mockPlayerRepository.findByUserIdAndGuildId)
        .mockResolvedValueOnce(null) // First call before transaction
        .mockResolvedValueOnce(mockPlayer); // Second call in transaction finds existing
      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback) => {
          const mockTx = {} as Prisma.TransactionClient;
          return await callback(mockTx);
        },
      );

      const result = await service.ensurePlayerExists(userId, guildId);

      expect(result).toEqual(mockPlayer);
      expect(mockPlayerRepository.create).not.toHaveBeenCalled();
    });

    it('should_validate_guild_membership_before_creating', async () => {
      const validationError = new NotFoundException(
        'Guild membership not found',
      );
      vi.mocked(mockPlayerRepository.findByUserIdAndGuildId).mockResolvedValue(
        null,
      );
      vi.mocked(
        mockValidationService.validateGuildMembership,
      ).mockRejectedValue(validationError);

      await expect(service.ensurePlayerExists(userId, guildId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should_update_player_status_successfully', async () => {
      const updateDto: UpdatePlayerDto = {
        status: PlayerStatus.INACTIVE,
      };
      const updatedPlayer = { ...mockPlayer, status: PlayerStatus.INACTIVE };

      vi.mocked(mockPlayerRepository.findById).mockResolvedValue(mockPlayer);
      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback) => {
          const mockTx = {} as Prisma.TransactionClient;
          return await callback(mockTx);
        },
      );
      vi.mocked(mockPlayerRepository.update).mockResolvedValue(updatedPlayer);

      const result = await service.update(playerId, updateDto);

      expect(result).toEqual(updatedPlayer);
      expect(result.status).toBe(PlayerStatus.INACTIVE);
      expect(mockPlayerRepository.update).toHaveBeenCalledWith(
        playerId,
        updateDto,
        expect.anything(),
      );
    });

    it('should_throw_PlayerNotFoundException_when_player_does_not_exist', async () => {
      const updateDto: UpdatePlayerDto = {
        status: PlayerStatus.INACTIVE,
      };

      vi.mocked(mockPlayerRepository.findById).mockResolvedValue(null);

      await expect(service.update(playerId, updateDto)).rejects.toThrow(
        PlayerNotFoundException,
      );
    });

    it('should_validate_status_transition_when_status_changes', async () => {
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

      await expect(service.update(playerId, updateDto)).rejects.toThrow(
        InvalidPlayerStatusException,
      );
    });

    it('should_throw_InternalServerErrorException_on_unexpected_error', async () => {
      const updateDto: UpdatePlayerDto = {
        status: PlayerStatus.INACTIVE,
      };

      vi.mocked(mockPlayerRepository.findById).mockResolvedValue(mockPlayer);
      vi.mocked(mockPrisma.$transaction).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.update(playerId, updateDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('updateCooldown', () => {
    it('should_update_cooldown_successfully', async () => {
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

      const result = await service.updateCooldown(playerId, lastLeftLeagueId);

      expect(result).toEqual(updatedPlayer);
      expect(result.lastLeftLeagueId).toBe(lastLeftLeagueId);
    });

    it('should_throw_PlayerNotFoundException_when_player_does_not_exist', async () => {
      vi.mocked(mockPlayerRepository.findById).mockResolvedValue(null);

      await expect(
        service.updateCooldown(playerId, 'league-123'),
      ).rejects.toThrow(PlayerNotFoundException);
    });
  });

  describe('delete', () => {
    it('should_delete_player_successfully', async () => {
      vi.mocked(mockPlayerRepository.findById).mockResolvedValue(mockPlayer);
      vi.mocked(mockPlayerRepository.delete).mockResolvedValue(mockPlayer);

      const result = await service.delete(playerId);

      expect(result).toEqual(mockPlayer);
    });

    it('should_throw_PlayerNotFoundException_when_player_does_not_exist', async () => {
      vi.mocked(mockPlayerRepository.findById).mockResolvedValue(null);

      await expect(service.delete(playerId)).rejects.toThrow(
        PlayerNotFoundException,
      );
    });
  });

  describe('exists', () => {
    it('should_return_true_when_player_exists', async () => {
      vi.mocked(mockPlayerRepository.exists).mockResolvedValue(true);

      const result = await service.exists(playerId);

      expect(result).toBe(true);
    });

    it('should_return_false_when_player_does_not_exist', async () => {
      vi.mocked(mockPlayerRepository.exists).mockResolvedValue(false);

      const result = await service.exists(playerId);

      expect(result).toBe(false);
    });
  });
});
