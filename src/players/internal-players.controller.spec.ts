/**
 * InternalPlayersController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { InternalPlayersController } from './internal-players.controller';
import { PlayerService } from './player.service';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';

describe('InternalPlayersController', () => {
  let controller: InternalPlayersController;
  let mockPlayerService: PlayerService;

  const mockPlayer = {
    id: 'player_123',
    userId: 'user_123',
    guildId: 'guild_123',
    guildMemberId: 'guild-member-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockPlayerService = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findByGuildId: vi.fn(),
      findByUserId: vi.fn(),
    } as unknown as PlayerService;

    const module = await Test.createTestingModule({
      controllers: [InternalPlayersController],
      providers: [{ provide: PlayerService, useValue: mockPlayerService }],
    }).compile();

    controller = module.get<InternalPlayersController>(
      InternalPlayersController,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findAll', () => {
    it('should_return_players_when_query_provided', async () => {
      const mockPlayers = { players: [mockPlayer], pagination: {} };
      vi.spyOn(mockPlayerService, 'findAll').mockResolvedValue(
        mockPlayers as never,
      );

      const result = await controller.findAll({ page: 1, limit: 50 });

      expect(result).toEqual(mockPlayers);
      expect(mockPlayerService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 50,
      });
    });
  });

  describe('findOne', () => {
    it('should_return_player_when_exists', async () => {
      vi.spyOn(mockPlayerService, 'findOne').mockResolvedValue(
        mockPlayer as never,
      );

      const result = await controller.findOne('player_123');

      expect(result).toEqual(mockPlayer);
      expect(mockPlayerService.findOne).toHaveBeenCalledWith('player_123', {
        includeUser: true,
        includeGuild: true,
      });
    });
  });

  describe('create', () => {
    it('should_create_player_when_valid_data_provided', async () => {
      const createDto: CreatePlayerDto = {
        userId: 'user_123',
        guildId: 'guild_123',
      };
      vi.spyOn(mockPlayerService, 'create').mockResolvedValue(
        mockPlayer as never,
      );

      const result = await controller.create(createDto);

      expect(result).toEqual(mockPlayer);
      expect(mockPlayerService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('update', () => {
    it('should_update_player_when_exists', async () => {
      const updateDto: UpdatePlayerDto = { displayName: 'Updated Name' };
      vi.spyOn(mockPlayerService, 'update').mockResolvedValue({
        ...mockPlayer,
        ...updateDto,
      } as never);

      const result = await controller.update('player_123', updateDto);

      expect(result.displayName).toBe('Updated Name');
      expect(mockPlayerService.update).toHaveBeenCalledWith(
        'player_123',
        updateDto,
      );
    });
  });

  describe('delete', () => {
    it('should_delete_player_when_exists', async () => {
      vi.spyOn(mockPlayerService, 'delete').mockResolvedValue(
        undefined as never,
      );

      await controller.delete('player_123');

      expect(mockPlayerService.delete).toHaveBeenCalledWith('player_123');
    });
  });

  describe('getPlayersByGuild', () => {
    it('should_return_players_for_guild', async () => {
      const mockPlayers = { players: [mockPlayer], pagination: {} };
      vi.spyOn(mockPlayerService, 'findByGuildId').mockResolvedValue(
        mockPlayers as never,
      );

      const result = await controller.getPlayersByGuild('guild_123', {});

      expect(result).toEqual(mockPlayers);
      expect(mockPlayerService.findByGuildId).toHaveBeenCalledWith(
        'guild_123',
        {
          includeUser: true,
          includeGuild: true,
        },
      );
    });
  });

  describe('getPlayersByUser', () => {
    it('should_return_players_for_user', async () => {
      const mockPlayers = { players: [mockPlayer], pagination: {} };
      vi.spyOn(mockPlayerService, 'findByUserId').mockResolvedValue(
        mockPlayers as never,
      );

      const result = await controller.getPlayersByUser('user_123', {});

      expect(result).toEqual(mockPlayers);
      expect(mockPlayerService.findByUserId).toHaveBeenCalledWith('user_123', {
        includeUser: true,
        includeGuild: true,
      });
    });
  });
});
