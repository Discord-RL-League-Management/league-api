/**
 * PlayersController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { PlayersController } from './players.controller';
import { PlayerService } from './player.service';
import { GuildAccessValidationService } from '../guilds/services/guild-access-validation.service';
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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getMyPlayers', () => {
    it('should_return_players_when_user_authenticated', async () => {
      const mockPlayers = { players: [], pagination: {} };
      vi.mocked(mockPlayerService.findByUserId).mockResolvedValue(
        mockPlayers as never,
      );

      const result = await controller.getMyPlayers(mockUser, {});

      expect(result).toEqual(mockPlayers);
      expect(mockPlayerService.findByUserId).toHaveBeenCalledWith(
        mockUser.id,
        {},
      );
    });
  });

  describe('getPlayersByGuild', () => {
    it('should_return_players_when_user_has_guild_access', async () => {
      const mockPlayers = { players: [], pagination: {} };
      vi.mocked(
        mockGuildAccessValidationService.validateUserGuildAccess,
      ).mockResolvedValue(undefined);
      vi.mocked(mockPlayerService.findByGuildId).mockResolvedValue(
        mockPlayers as never,
      );

      const result = await controller.getPlayersByGuild(
        'guild-1',
        mockUser,
        {},
      );

      expect(result).toEqual(mockPlayers);
      expect(mockPlayerService.findByGuildId).toHaveBeenCalled();
    });
  });

  describe('getPlayer', () => {
    it('should_return_player_when_id_provided', async () => {
      const mockPlayer = { id: 'player-1', userId: mockUser.id };
      vi.mocked(mockPlayerService.findOne).mockResolvedValue(
        mockPlayer as never,
      );

      const result = await controller.getPlayer('player-1', mockUser);

      expect(result).toEqual(mockPlayer);
      expect(mockPlayerService.findOne).toHaveBeenCalledWith('player-1', {
        includeUser: true,
        includeGuild: true,
      });
    });
  });
});
