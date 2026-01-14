/**
 * PlayerOwnershipService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { PlayerOwnershipService } from './player-ownership.service';
import { PlayerService } from '../player.service';
import { PlayerNotFoundException } from '../exceptions/player.exceptions';
import { PlayerStatus } from '@prisma/client';

describe('PlayerOwnershipService', () => {
  let service: PlayerOwnershipService;
  let mockPlayerService: PlayerService;

  const mockPlayer = {
    id: 'player_123',
    userId: 'user_123',
    guildId: 'guild_123',
    status: PlayerStatus.ACTIVE,
    lastLeftLeagueAt: null,
    lastLeftLeagueId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPlayerService = {
      findOne: vi.fn(),
    } as unknown as PlayerService;

    service = new PlayerOwnershipService(mockPlayerService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validatePlayerOwnership', () => {
    it('should_validate_ownership_when_player_belongs_to_user', async () => {
      const userId = 'user_123';
      const playerId = 'player_123';
      vi.mocked(mockPlayerService.findOne).mockResolvedValue(mockPlayer);

      await expect(
        service.validatePlayerOwnership(userId, playerId),
      ).resolves.not.toThrow();
    });

    it('should_throw_forbidden_exception_when_player_does_not_belong_to_user', async () => {
      const userId = 'user_123';
      const playerId = 'player_456';
      const differentOwnerPlayer = {
        ...mockPlayer,
        id: 'player_456',
        userId: 'user_999',
      };
      vi.mocked(mockPlayerService.findOne).mockResolvedValue(
        differentOwnerPlayer,
      );

      await expect(
        service.validatePlayerOwnership(userId, playerId),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.validatePlayerOwnership(userId, playerId),
      ).rejects.toThrow('You can only access players you own');
    });

    it('should_throw_player_not_found_exception_when_player_does_not_exist', async () => {
      const userId = 'user_123';
      const playerId = 'nonexistent';
      vi.mocked(mockPlayerService.findOne).mockRejectedValue(
        new PlayerNotFoundException(playerId),
      );

      await expect(
        service.validatePlayerOwnership(userId, playerId),
      ).rejects.toThrow(PlayerNotFoundException);
    });

    it('should_throw_forbidden_exception_when_player_service_throws_unexpected_error', async () => {
      const userId = 'user_123';
      const playerId = 'player_123';
      const unexpectedError = new Error('Database connection failed');
      vi.mocked(mockPlayerService.findOne).mockRejectedValue(unexpectedError);

      await expect(
        service.validatePlayerOwnership(userId, playerId),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.validatePlayerOwnership(userId, playerId),
      ).rejects.toThrow('Error validating player ownership');
    });

    it('should_rethrow_forbidden_exception_when_already_thrown', async () => {
      const userId = 'user_123';
      const playerId = 'player_123';
      const forbiddenError = new ForbiddenException('Access denied');
      vi.mocked(mockPlayerService.findOne).mockRejectedValue(forbiddenError);

      await expect(
        service.validatePlayerOwnership(userId, playerId),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.validatePlayerOwnership(userId, playerId),
      ).rejects.toThrow('Access denied');
    });
  });
});
