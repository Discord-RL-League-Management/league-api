/**
 * PlayerRepository Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { PlayerRepository } from './player.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { Player, PlayerStatus, Prisma } from '@prisma/client';
import { CreatePlayerDto } from '../dto/create-player.dto';
import { UpdatePlayerDto } from '../dto/update-player.dto';

describe('PlayerRepository', () => {
  let repository: PlayerRepository;
  let mockPrismaService: PrismaService;

  const playerId = 'player-123';
  const userId = 'user-123';
  const guildId = 'guild-123';
  const guildMemberId = 'guild-member-123';

  const mockPlayer: Player = {
    id: playerId,
    userId,
    guildId,
    guildMemberId,
    status: PlayerStatus.ACTIVE,
    lastLeftLeagueId: null,
    lastLeftLeagueAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockGuildMember = {
    id: guildMemberId,
    userId,
    guildId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockPrismaService = {
      player: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      guildMember: {
        findUnique: vi.fn(),
      },
      $transaction: vi.fn(),
    } as unknown as PrismaService;

    const moduleRef = await Test.createTestingModule({
      providers: [
        PlayerRepository,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    repository = moduleRef.get<PlayerRepository>(PlayerRepository);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findById', () => {
    it('should_return_player_when_found', async () => {
      vi.mocked(mockPrismaService.player.findUnique).mockResolvedValue(
        mockPlayer,
      );

      const result = await repository.findById(playerId);

      expect(result).toEqual(mockPlayer);
      expect(result?.id).toBe(playerId);
      expect(mockPrismaService.player.findUnique).toHaveBeenCalledWith({
        where: { id: playerId },
        include: undefined,
      });
    });

    it('should_return_null_when_not_found', async () => {
      vi.mocked(mockPrismaService.player.findUnique).mockResolvedValue(null);

      const result = await repository.findById('non-existent-id');

      expect(result).toBeNull();
    });

    it('should_include_user_when_includeUser_option_is_true', async () => {
      const playerWithUser = {
        ...mockPlayer,
        guildMember: {
          user: { id: userId },
        },
      };
      vi.mocked(mockPrismaService.player.findUnique).mockResolvedValue(
        playerWithUser as any,
      );

      const result = await repository.findById(playerId, {
        includeUser: true,
      });

      expect(result).toEqual(playerWithUser);
      expect(mockPrismaService.player.findUnique).toHaveBeenCalledWith({
        where: { id: playerId },
        include: {
          guildMember: {
            include: {
              user: true,
            },
          },
        },
      });
    });

    it('should_include_guild_when_includeGuild_option_is_true', async () => {
      const playerWithGuild = {
        ...mockPlayer,
        guild: { id: guildId },
      };
      vi.mocked(mockPrismaService.player.findUnique).mockResolvedValue(
        playerWithGuild as any,
      );

      const result = await repository.findById(playerId, {
        includeGuild: true,
      });

      expect(result).toEqual(playerWithGuild);
      expect(mockPrismaService.player.findUnique).toHaveBeenCalledWith({
        where: { id: playerId },
        include: {
          guild: true,
        },
      });
    });

    it('should_use_transaction_client_when_provided', async () => {
      const mockTx = {
        player: {
          findUnique: vi.fn().mockResolvedValue(mockPlayer),
        },
      } as unknown as Prisma.TransactionClient;

      const result = await repository.findById(playerId, undefined, mockTx);

      expect(result).toEqual(mockPlayer);
      expect(mockTx.player.findUnique).toHaveBeenCalled();
      expect(mockPrismaService.player.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should_return_paginated_players_with_default_options', async () => {
      vi.mocked(mockPrismaService.player.findMany).mockResolvedValue([
        mockPlayer,
      ]);
      vi.mocked(mockPrismaService.player.count).mockResolvedValue(1);

      const result = await repository.findAll();

      expect(result.data).toEqual([mockPlayer]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
      expect(mockPrismaService.player.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 50,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should_apply_pagination_when_options_provided', async () => {
      vi.mocked(mockPrismaService.player.findMany).mockResolvedValue([
        mockPlayer,
      ]);
      vi.mocked(mockPrismaService.player.count).mockResolvedValue(10);

      const result = await repository.findAll({ page: 2, limit: 5 });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(mockPrismaService.player.findMany).toHaveBeenCalledWith({
        skip: 5,
        take: 5,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should_enforce_max_limit_of_100', async () => {
      vi.mocked(mockPrismaService.player.findMany).mockResolvedValue([]);
      vi.mocked(mockPrismaService.player.count).mockResolvedValue(0);

      const result = await repository.findAll({ page: 1, limit: 200 });

      expect(result.limit).toBe(100);
      expect(mockPrismaService.player.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 100,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findByUserIdAndGuildId', () => {
    it('should_return_player_when_found', async () => {
      vi.mocked(mockPrismaService.guildMember.findUnique).mockResolvedValue(
        mockGuildMember as any,
      );
      vi.mocked(mockPrismaService.player.findUnique).mockResolvedValue(
        mockPlayer,
      );

      const result = await repository.findByUserIdAndGuildId(userId, guildId);

      expect(result).toEqual(mockPlayer);
      expect(mockPrismaService.guildMember.findUnique).toHaveBeenCalledWith({
        where: {
          userId_guildId: {
            userId,
            guildId,
          },
        },
      });
      expect(mockPrismaService.player.findUnique).toHaveBeenCalledWith({
        where: {
          userId_guildMemberId: {
            userId,
            guildMemberId,
          },
        },
        include: undefined,
      });
    });

    it('should_return_null_when_guild_member_not_found', async () => {
      vi.mocked(mockPrismaService.guildMember.findUnique).mockResolvedValue(
        null,
      );

      const result = await repository.findByUserIdAndGuildId(userId, guildId);

      expect(result).toBeNull();
      expect(mockPrismaService.player.findUnique).not.toHaveBeenCalled();
    });

    it('should_return_null_when_player_not_found', async () => {
      vi.mocked(mockPrismaService.guildMember.findUnique).mockResolvedValue(
        mockGuildMember as any,
      );
      vi.mocked(mockPrismaService.player.findUnique).mockResolvedValue(null);

      const result = await repository.findByUserIdAndGuildId(userId, guildId);

      expect(result).toBeNull();
    });

    it('should_include_user_when_includeUser_option_is_true', async () => {
      vi.mocked(mockPrismaService.guildMember.findUnique).mockResolvedValue(
        mockGuildMember as any,
      );
      const playerWithUser = {
        ...mockPlayer,
        guildMember: {
          user: { id: userId },
        },
      };
      vi.mocked(mockPrismaService.player.findUnique).mockResolvedValue(
        playerWithUser as any,
      );

      const result = await repository.findByUserIdAndGuildId(userId, guildId, {
        includeUser: true,
      });

      expect(result).toEqual(playerWithUser);
      expect(mockPrismaService.player.findUnique).toHaveBeenCalledWith({
        where: {
          userId_guildMemberId: {
            userId,
            guildMemberId,
          },
        },
        include: {
          guildMember: {
            include: {
              user: true,
            },
          },
        },
      });
    });

    it('should_use_transaction_client_when_provided', async () => {
      const mockTx = {
        guildMember: {
          findUnique: vi.fn().mockResolvedValue(mockGuildMember),
        },
        player: {
          findUnique: vi.fn().mockResolvedValue(mockPlayer),
        },
      } as unknown as Prisma.TransactionClient;

      const result = await repository.findByUserIdAndGuildId(
        userId,
        guildId,
        undefined,
        mockTx,
      );

      expect(result).toEqual(mockPlayer);
      expect(mockTx.guildMember.findUnique).toHaveBeenCalled();
      expect(mockPrismaService.guildMember.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('findByGuildId', () => {
    it('should_return_paginated_players_for_guild_with_default_options', async () => {
      vi.mocked(mockPrismaService.player.findMany).mockResolvedValue([
        mockPlayer,
      ]);
      vi.mocked(mockPrismaService.player.count).mockResolvedValue(1);

      const result = await repository.findByGuildId(guildId);

      expect(result.data).toEqual([mockPlayer]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
      expect(mockPrismaService.player.findMany).toHaveBeenCalledWith({
        where: { guildId },
        include: undefined,
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 50,
      });
    });

    it('should_filter_by_status_when_status_provided', async () => {
      vi.mocked(mockPrismaService.player.findMany).mockResolvedValue([]);
      vi.mocked(mockPrismaService.player.count).mockResolvedValue(0);

      await repository.findByGuildId(guildId, { status: PlayerStatus.ACTIVE });

      expect(mockPrismaService.player.findMany).toHaveBeenCalledWith({
        where: {
          guildId,
          status: PlayerStatus.ACTIVE,
        },
        include: undefined,
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 50,
      });
    });

    it('should_filter_by_status_array_when_status_is_array', async () => {
      vi.mocked(mockPrismaService.player.findMany).mockResolvedValue([]);
      vi.mocked(mockPrismaService.player.count).mockResolvedValue(0);

      await repository.findByGuildId(guildId, {
        status: [PlayerStatus.ACTIVE, PlayerStatus.INACTIVE],
      });

      expect(mockPrismaService.player.findMany).toHaveBeenCalledWith({
        where: {
          guildId,
          status: { in: [PlayerStatus.ACTIVE, PlayerStatus.INACTIVE] },
        },
        include: undefined,
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 50,
      });
    });

    it('should_apply_pagination_when_options_provided', async () => {
      vi.mocked(mockPrismaService.player.findMany).mockResolvedValue([]);
      vi.mocked(mockPrismaService.player.count).mockResolvedValue(10);

      const result = await repository.findByGuildId(guildId, {
        page: 2,
        limit: 5,
      });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(mockPrismaService.player.findMany).toHaveBeenCalledWith({
        where: { guildId },
        include: undefined,
        orderBy: { createdAt: 'desc' },
        skip: 5,
        take: 5,
      });
    });

    it('should_sort_by_custom_field_when_sortBy_provided', async () => {
      vi.mocked(mockPrismaService.player.findMany).mockResolvedValue([]);
      vi.mocked(mockPrismaService.player.count).mockResolvedValue(0);

      await repository.findByGuildId(guildId, {
        sortBy: 'updatedAt',
        sortOrder: 'asc',
      });

      expect(mockPrismaService.player.findMany).toHaveBeenCalledWith({
        where: { guildId },
        include: undefined,
        orderBy: { updatedAt: 'asc' },
        skip: 0,
        take: 50,
      });
    });

    it('should_enforce_max_limit_of_100', async () => {
      vi.mocked(mockPrismaService.player.findMany).mockResolvedValue([]);
      vi.mocked(mockPrismaService.player.count).mockResolvedValue(0);

      const result = await repository.findByGuildId(guildId, {
        limit: 200,
      });

      expect(result.limit).toBe(100);
    });
  });

  describe('findByUserId', () => {
    it('should_return_paginated_players_for_user_with_default_options', async () => {
      vi.mocked(mockPrismaService.player.findMany).mockResolvedValue([
        mockPlayer,
      ]);
      vi.mocked(mockPrismaService.player.count).mockResolvedValue(1);

      const result = await repository.findByUserId(userId);

      expect(result.data).toEqual([mockPlayer]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
      expect(mockPrismaService.player.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: undefined,
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 50,
      });
    });

    it('should_filter_by_status_when_status_provided', async () => {
      vi.mocked(mockPrismaService.player.findMany).mockResolvedValue([]);
      vi.mocked(mockPrismaService.player.count).mockResolvedValue(0);

      await repository.findByUserId(userId, { status: PlayerStatus.ACTIVE });

      expect(mockPrismaService.player.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          status: PlayerStatus.ACTIVE,
        },
        include: undefined,
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 50,
      });
    });

    it('should_filter_by_status_array_when_status_is_array', async () => {
      vi.mocked(mockPrismaService.player.findMany).mockResolvedValue([]);
      vi.mocked(mockPrismaService.player.count).mockResolvedValue(0);

      await repository.findByUserId(userId, {
        status: [PlayerStatus.ACTIVE, PlayerStatus.INACTIVE],
      });

      expect(mockPrismaService.player.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          status: { in: [PlayerStatus.ACTIVE, PlayerStatus.INACTIVE] },
        },
        include: undefined,
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 50,
      });
    });

    it('should_apply_pagination_when_options_provided', async () => {
      vi.mocked(mockPrismaService.player.findMany).mockResolvedValue([]);
      vi.mocked(mockPrismaService.player.count).mockResolvedValue(10);

      const result = await repository.findByUserId(userId, {
        page: 2,
        limit: 5,
      });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
    });

    it('should_enforce_max_limit_of_100', async () => {
      vi.mocked(mockPrismaService.player.findMany).mockResolvedValue([]);
      vi.mocked(mockPrismaService.player.count).mockResolvedValue(0);

      const result = await repository.findByUserId(userId, { limit: 200 });

      expect(result.limit).toBe(100);
    });
  });

  describe('create', () => {
    it('should_create_player_when_valid_data_provided', async () => {
      const createDto: CreatePlayerDto & { guildMemberId: string } = {
        userId,
        guildId,
        guildMemberId,
        status: PlayerStatus.ACTIVE,
      };
      vi.mocked(mockPrismaService.player.create).mockResolvedValue(mockPlayer);

      const result = await repository.create(createDto);

      expect(result).toEqual(mockPlayer);
      expect(mockPrismaService.player.create).toHaveBeenCalledWith({
        data: {
          userId,
          guildId,
          guildMemberId,
          status: PlayerStatus.ACTIVE,
        },
      });
    });

    it('should_use_default_status_when_status_not_provided', async () => {
      const createDto: CreatePlayerDto & { guildMemberId: string } = {
        userId,
        guildId,
        guildMemberId,
      };
      vi.mocked(mockPrismaService.player.create).mockResolvedValue(mockPlayer);

      await repository.create(createDto);

      expect(mockPrismaService.player.create).toHaveBeenCalledWith({
        data: {
          userId,
          guildId,
          guildMemberId,
          status: PlayerStatus.ACTIVE,
        },
      });
    });

    it('should_use_transaction_client_when_provided', async () => {
      const createDto: CreatePlayerDto & { guildMemberId: string } = {
        userId,
        guildId,
        guildMemberId,
      };
      const mockTx = {
        player: {
          create: vi.fn().mockResolvedValue(mockPlayer),
        },
      } as unknown as Prisma.TransactionClient;

      const result = await repository.create(createDto, mockTx);

      expect(result).toEqual(mockPlayer);
      expect(mockTx.player.create).toHaveBeenCalled();
      expect(mockPrismaService.player.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should_update_player_when_valid_data_provided', async () => {
      const updateDto: UpdatePlayerDto = {
        status: PlayerStatus.INACTIVE,
      };
      const updatedPlayer = {
        ...mockPlayer,
        status: PlayerStatus.INACTIVE,
      };
      vi.mocked(mockPrismaService.player.update).mockResolvedValue(
        updatedPlayer,
      );

      const result = await repository.update(playerId, updateDto);

      expect(result).toEqual(updatedPlayer);
      expect(result.status).toBe(PlayerStatus.INACTIVE);
      expect(mockPrismaService.player.update).toHaveBeenCalledWith({
        where: { id: playerId },
        data: {
          status: PlayerStatus.INACTIVE,
        },
      });
    });

    it('should_only_update_provided_fields', async () => {
      const updateDto: UpdatePlayerDto = {
        status: PlayerStatus.INACTIVE,
      };
      const updatedPlayer = {
        ...mockPlayer,
        status: PlayerStatus.INACTIVE,
      };
      vi.mocked(mockPrismaService.player.update).mockResolvedValue(
        updatedPlayer,
      );

      await repository.update(playerId, updateDto);

      expect(mockPrismaService.player.update).toHaveBeenCalledWith({
        where: { id: playerId },
        data: {
          status: PlayerStatus.INACTIVE,
        },
      });
    });

    it('should_not_update_when_status_is_undefined', async () => {
      const updateDto: UpdatePlayerDto = {};
      const updatedPlayer = { ...mockPlayer };
      vi.mocked(mockPrismaService.player.update).mockResolvedValue(
        updatedPlayer,
      );

      await repository.update(playerId, updateDto);

      expect(mockPrismaService.player.update).toHaveBeenCalledWith({
        where: { id: playerId },
        data: {},
      });
    });

    it('should_use_transaction_client_when_provided', async () => {
      const updateDto: UpdatePlayerDto = {
        status: PlayerStatus.INACTIVE,
      };
      const updatedPlayer = {
        ...mockPlayer,
        status: PlayerStatus.INACTIVE,
      };
      const mockTx = {
        player: {
          update: vi.fn().mockResolvedValue(updatedPlayer),
        },
      } as unknown as Prisma.TransactionClient;

      const result = await repository.update(playerId, updateDto, mockTx);

      expect(result).toEqual(updatedPlayer);
      expect(mockTx.player.update).toHaveBeenCalled();
      expect(mockPrismaService.player.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should_delete_player_when_id_provided', async () => {
      vi.mocked(mockPrismaService.player.delete).mockResolvedValue(mockPlayer);

      const result = await repository.delete(playerId);

      expect(result).toEqual(mockPlayer);
      expect(mockPrismaService.player.delete).toHaveBeenCalledWith({
        where: { id: playerId },
      });
    });
  });

  describe('exists', () => {
    it('should_return_true_when_player_exists', async () => {
      vi.mocked(mockPrismaService.player.count).mockResolvedValue(1);

      const result = await repository.exists(playerId);

      expect(result).toBe(true);
      expect(mockPrismaService.player.count).toHaveBeenCalledWith({
        where: { id: playerId },
      });
    });

    it('should_return_false_when_player_does_not_exist', async () => {
      vi.mocked(mockPrismaService.player.count).mockResolvedValue(0);

      const result = await repository.exists('non-existent-id');

      expect(result).toBe(false);
    });
  });

  describe('updateCooldown', () => {
    it('should_update_cooldown_when_valid_data_provided', async () => {
      const lastLeftLeagueAt = new Date();
      const lastLeftLeagueId = 'league-123';
      const updatedPlayer = {
        ...mockPlayer,
        lastLeftLeagueAt,
        lastLeftLeagueId,
      };
      vi.mocked(mockPrismaService.player.update).mockResolvedValue(
        updatedPlayer,
      );

      const result = await repository.updateCooldown(
        playerId,
        lastLeftLeagueAt,
        lastLeftLeagueId,
      );

      expect(result).toEqual(updatedPlayer);
      expect(result.lastLeftLeagueAt).toEqual(lastLeftLeagueAt);
      expect(result.lastLeftLeagueId).toBe(lastLeftLeagueId);
      expect(mockPrismaService.player.update).toHaveBeenCalledWith({
        where: { id: playerId },
        data: {
          lastLeftLeagueAt,
          lastLeftLeagueId,
        },
      });
    });

    it('should_use_transaction_client_when_provided', async () => {
      const lastLeftLeagueAt = new Date();
      const lastLeftLeagueId = 'league-123';
      const updatedPlayer = {
        ...mockPlayer,
        lastLeftLeagueAt,
        lastLeftLeagueId,
      };
      const mockTx = {
        player: {
          update: vi.fn().mockResolvedValue(updatedPlayer),
        },
      } as unknown as Prisma.TransactionClient;

      const result = await repository.updateCooldown(
        playerId,
        lastLeftLeagueAt,
        lastLeftLeagueId,
        mockTx,
      );

      expect(result).toEqual(updatedPlayer);
      expect(mockTx.player.update).toHaveBeenCalled();
      expect(mockPrismaService.player.update).not.toHaveBeenCalled();
    });
  });
});
