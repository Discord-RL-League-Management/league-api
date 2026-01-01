/**
 * GuildAccessValidationServiceAdapter Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { GuildAccessValidationServiceAdapter } from '@/guilds/adapters/guild-access-validation-service.adapter';
import { GuildAccessValidationService } from '@/guilds/services/guild-access-validation.service';

describe('GuildAccessValidationServiceAdapter', () => {
  let adapter: GuildAccessValidationServiceAdapter;
  let mockGuildAccessValidationService: GuildAccessValidationService;

  beforeEach(() => {
    mockGuildAccessValidationService = {
      validateUserGuildAccess: vi.fn(),
    } as unknown as GuildAccessValidationService;

    adapter = new GuildAccessValidationServiceAdapter(
      mockGuildAccessValidationService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateUserGuildAccess', () => {
    it('should_delegate_to_service_when_validation_succeeds', async () => {
      // ARRANGE
      const userId = 'user_123456789012345678';
      const guildId = 'guild_987654321098765432';
      vi.spyOn(
        mockGuildAccessValidationService,
        'validateUserGuildAccess',
      ).mockResolvedValue(undefined);

      // ACT
      await adapter.validateUserGuildAccess(userId, guildId);

      // ASSERT
      expect(
        mockGuildAccessValidationService.validateUserGuildAccess,
      ).toHaveBeenCalledWith(userId, guildId);
      expect(
        mockGuildAccessValidationService.validateUserGuildAccess,
      ).toHaveBeenCalledTimes(1);
    });

    it('should_propagate_not_found_exception_when_guild_not_found', async () => {
      // ARRANGE
      const userId = 'user_123456789012345678';
      const guildId = 'guild_987654321098765432';
      const error = new NotFoundException(
        'Guild not found or bot is not a member',
      );
      vi.spyOn(
        mockGuildAccessValidationService,
        'validateUserGuildAccess',
      ).mockRejectedValue(error);

      // ACT & ASSERT
      await expect(
        adapter.validateUserGuildAccess(userId, guildId),
      ).rejects.toThrow(NotFoundException);
      expect(
        mockGuildAccessValidationService.validateUserGuildAccess,
      ).toHaveBeenCalledWith(userId, guildId);
    });

    it('should_propagate_forbidden_exception_when_user_not_member', async () => {
      // ARRANGE
      const userId = 'user_123456789012345678';
      const guildId = 'guild_987654321098765432';
      const error = new ForbiddenException('User is not a member of the guild');
      vi.spyOn(
        mockGuildAccessValidationService,
        'validateUserGuildAccess',
      ).mockRejectedValue(error);

      // ACT & ASSERT
      await expect(
        adapter.validateUserGuildAccess(userId, guildId),
      ).rejects.toThrow(ForbiddenException);
      expect(
        mockGuildAccessValidationService.validateUserGuildAccess,
      ).toHaveBeenCalledWith(userId, guildId);
    });

    it('should_pass_parameters_correctly_to_service', async () => {
      // ARRANGE
      const userId = 'user_111111111111111111';
      const guildId = 'guild_222222222222222222';
      vi.spyOn(
        mockGuildAccessValidationService,
        'validateUserGuildAccess',
      ).mockResolvedValue(undefined);

      // ACT
      await adapter.validateUserGuildAccess(userId, guildId);

      // ASSERT
      expect(
        mockGuildAccessValidationService.validateUserGuildAccess,
      ).toHaveBeenCalledWith(userId, guildId);
    });
  });
});
