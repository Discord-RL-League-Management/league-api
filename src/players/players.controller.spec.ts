/**
 * PlayersController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { PlayersController } from './players.controller';
import { PlayerService } from './player.service';
import { GuildAccessValidationService } from '../guilds/services/guild-access-validation.service';
import { UpdatePlayerDto } from './dto/update-player.dto';
import type { AuthenticatedUser } from '../common/interfaces/user.interface';

describe('PlayersController', () => {
  let controller: PlayersController;
  let mockPlayerService: PlayerService;
  let mockGuildAccessValidationService: GuildAccessValidationService;

  const mockUser: AuthenticatedUser = {
    id: 'user-123',
    username: 'testuser',
    globalName: 'Test User',
    avatar: 'avatar_hash',
    email: 'test@example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  };

  const mockPlayer = {
    id: 'player-123',
    userId: 'user-123',
    displayName: 'Test Player',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockPlayerService = {
      findByUserId: vi.fn(),
      findByGuildId: vi.fn(),
      findOne: vi.fn(),
      update: vi.fn(),
    } as unknown as PlayerService;

    mockGuildAccessValidationService = {
      validateUserGuildAccess: vi.fn(),
    } as unknown as GuildAccessValidationService;

    const module = await Test.createTestingModule({
      controllers: [PlayersController],
      providers: [
        { provide: PlayerService, useValue: mockPlayerService },
        {
          provide: GuildAccessValidationService,
          useValue: mockGuildAccessValidationService,
        },
      ],
    }).compile();

    controller = module.get<PlayersController>(PlayersController);
  });

  describe('getMyPlayers', () => {
    it('should_return_players_when_user_is_authenticated', async () => {
      const mockPlayers = [mockPlayer];
      vi.spyOn(mockPlayerService, 'findByUserId').mockResolvedValue(
        mockPlayers as never,
      );

      const result = await controller.getMyPlayers(mockUser, {});

      expect(result).toEqual(mockPlayers);
      expect(mockPlayerService.findByUserId).toHaveBeenCalledWith(
        'user-123',
        {},
      );
    });

    it('should_pass_query_options_when_provided', async () => {
      const queryOptions = { page: 1, limit: 10 };
      const mockPlayers = [mockPlayer];
      vi.spyOn(mockPlayerService, 'findByUserId').mockResolvedValue(
        mockPlayers as never,
      );

      await controller.getMyPlayers(mockUser, queryOptions);

      expect(mockPlayerService.findByUserId).toHaveBeenCalledWith(
        'user-123',
        queryOptions,
      );
    });
  });

  describe('getPlayersByGuild', () => {
    it('should_return_players_when_guild_access_is_valid', async () => {
      const mockPlayers = [mockPlayer];
      vi.spyOn(
        mockGuildAccessValidationService,
        'validateUserGuildAccess',
      ).mockResolvedValue(undefined);
      vi.spyOn(mockPlayerService, 'findByGuildId').mockResolvedValue(
        mockPlayers as never,
      );

      const result = await controller.getPlayersByGuild(
        'guild-123',
        mockUser,
        {},
      );

      expect(result).toEqual(mockPlayers);
      expect(
        mockGuildAccessValidationService.validateUserGuildAccess,
      ).toHaveBeenCalledWith('user-123', 'guild-123');
      expect(mockPlayerService.findByGuildId).toHaveBeenCalledWith(
        'guild-123',
        {
          includeUser: true,
          includeGuild: true,
        },
      );
    });

    it('should_include_query_options_when_provided', async () => {
      const queryOptions = { page: 1, limit: 20 };
      const mockPlayers = [mockPlayer];
      vi.spyOn(
        mockGuildAccessValidationService,
        'validateUserGuildAccess',
      ).mockResolvedValue(undefined);
      vi.spyOn(mockPlayerService, 'findByGuildId').mockResolvedValue(
        mockPlayers as never,
      );

      await controller.getPlayersByGuild('guild-123', mockUser, queryOptions);

      expect(mockPlayerService.findByGuildId).toHaveBeenCalledWith(
        'guild-123',
        {
          ...queryOptions,
          includeUser: true,
          includeGuild: true,
        },
      );
    });
  });

  describe('getPlayer', () => {
    it('should_return_player_when_user_owns_player', async () => {
      vi.spyOn(mockPlayerService, 'findOne').mockResolvedValue(
        mockPlayer as never,
      );

      const result = await controller.getPlayer('player-123', mockUser);

      expect(result).toEqual(mockPlayer);
      expect(mockPlayerService.findOne).toHaveBeenCalledWith('player-123', {
        includeUser: true,
        includeGuild: true,
      });
    });

    it('should_throw_forbidden_when_user_does_not_own_player', async () => {
      const otherPlayer = {
        ...mockPlayer,
        userId: 'other-user-456',
      };

      vi.spyOn(mockPlayerService, 'findOne').mockResolvedValue(
        otherPlayer as never,
      );

      await expect(
        controller.getPlayer('player-123', mockUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updatePlayer', () => {
    it('should_update_player_when_user_owns_player', async () => {
      const updateDto: UpdatePlayerDto = {
        displayName: 'Updated Player Name',
      };

      const updatedPlayer = {
        ...mockPlayer,
        displayName: 'Updated Player Name',
      };

      vi.spyOn(mockPlayerService, 'findOne').mockResolvedValue(
        mockPlayer as never,
      );
      vi.spyOn(mockPlayerService, 'update').mockResolvedValue(
        updatedPlayer as never,
      );

      const result = await controller.updatePlayer(
        'player-123',
        updateDto,
        mockUser,
      );

      expect(result).toEqual(updatedPlayer);
      expect(mockPlayerService.findOne).toHaveBeenCalledWith('player-123');
      expect(mockPlayerService.update).toHaveBeenCalledWith(
        'player-123',
        updateDto,
      );
    });

    it('should_throw_forbidden_when_user_does_not_own_player', async () => {
      const otherPlayer = {
        ...mockPlayer,
        userId: 'other-user-456',
      };

      const updateDto: UpdatePlayerDto = {
        displayName: 'Updated Player Name',
      };

      vi.spyOn(mockPlayerService, 'findOne').mockResolvedValue(
        otherPlayer as never,
      );

      await expect(
        controller.updatePlayer('player-123', updateDto, mockUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
