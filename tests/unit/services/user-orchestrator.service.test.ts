/**
 * UserOrchestratorService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InternalServerErrorException } from '@nestjs/common';
import { UserOrchestratorService } from '@/users/services/user-orchestrator.service';
import { UsersService } from '@/users/users.service';
import { DiscordProfileDto } from '@/auth/dto/discord-profile.dto';
import { User } from '@prisma/client';
import { createTestTokenPair } from '../../factories/token.factory';

describe('UserOrchestratorService', () => {
  let service: UserOrchestratorService;
  let mockUsersService: UsersService;

  const userId = 'user-123';
  const mockPlainTokens = createTestTokenPair('plain');
  const mockEncryptedTokens = createTestTokenPair('encrypted');

  const mockDiscordProfile: DiscordProfileDto = {
    discordId: userId,
    username: 'testuser',
    discriminator: '1234',
    globalName: 'Test User',
    avatar: 'avatar_hash',
    email: 'test@example.com',
    accessToken: mockPlainTokens.accessToken,
    refreshToken: mockPlainTokens.refreshToken,
  };

  const mockUser: User = {
    id: userId,
    username: 'testuser',
    discriminator: '1234',
    globalName: 'Test User',
    avatar: 'avatar_hash',
    email: 'test@example.com',
    accessToken: mockEncryptedTokens.accessToken,
    refreshToken: mockEncryptedTokens.refreshToken,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    isBanned: false,
    isDeleted: false,
  };

  const mockUpdatedUser: User = {
    ...mockUser,
    username: 'updateduser',
    lastLoginAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockUsersService = {
      exists: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    } as unknown as UsersService;

    service = new UserOrchestratorService(mockUsersService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('upsertUserFromOAuth', () => {
    it('should_create_new_user_when_user_does_not_exist', async () => {
      vi.mocked(mockUsersService.exists).mockResolvedValue(false);
      vi.mocked(mockUsersService.create).mockResolvedValue(mockUser);

      const result = await service.upsertUserFromOAuth(mockDiscordProfile);

      expect(result).toEqual(mockUser);
      expect(result.id).toBe(userId);
      expect(result.username).toBe('testuser');
    });

    it('should_update_existing_user_when_user_exists', async () => {
      vi.mocked(mockUsersService.exists).mockResolvedValue(true);
      vi.mocked(mockUsersService.update).mockResolvedValue(mockUpdatedUser);

      const result = await service.upsertUserFromOAuth(mockDiscordProfile);

      expect(result).toEqual(mockUpdatedUser);
      expect(result.username).toBe('updateduser');
    });

    it('should_update_lastLoginAt_for_existing_users', async () => {
      const updatedUserWithLogin = {
        ...mockUser,
        lastLoginAt: new Date(),
      };
      vi.mocked(mockUsersService.exists).mockResolvedValue(true);
      vi.mocked(mockUsersService.update).mockResolvedValue(
        updatedUserWithLogin,
      );

      const result = await service.upsertUserFromOAuth(mockDiscordProfile);

      expect(result.lastLoginAt).toBeInstanceOf(Date);
      expect(mockUsersService.update).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          lastLoginAt: expect.any(Date),
        }),
      );
    });

    it('should_include_all_discord_fields_when_creating_user', async () => {
      vi.mocked(mockUsersService.exists).mockResolvedValue(false);
      vi.mocked(mockUsersService.create).mockResolvedValue(mockUser);

      await service.upsertUserFromOAuth(mockDiscordProfile);

      expect(mockUsersService.create).toHaveBeenCalledWith({
        id: userId,
        username: 'testuser',
        discriminator: '1234',
        globalName: 'Test User',
        avatar: 'avatar_hash',
        email: 'test@example.com',
        accessToken: mockPlainTokens.accessToken,
        refreshToken: mockPlainTokens.refreshToken,
      });
    });

    it('should_include_all_discord_fields_when_updating_user', async () => {
      vi.mocked(mockUsersService.exists).mockResolvedValue(true);
      vi.mocked(mockUsersService.update).mockResolvedValue(mockUpdatedUser);

      await service.upsertUserFromOAuth(mockDiscordProfile);

      expect(mockUsersService.update).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          username: 'testuser',
          discriminator: '1234',
          globalName: 'Test User',
          avatar: 'avatar_hash',
          email: 'test@example.com',
          accessToken: mockPlainTokens.accessToken,
          refreshToken: mockPlainTokens.refreshToken,
          lastLoginAt: expect.any(Date),
        }),
      );
    });

    it('should_throw_InternalServerErrorException_when_user_creation_fails', async () => {
      vi.mocked(mockUsersService.exists).mockResolvedValue(false);
      vi.mocked(mockUsersService.create).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.upsertUserFromOAuth(mockDiscordProfile),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should_throw_InternalServerErrorException_when_user_update_fails', async () => {
      vi.mocked(mockUsersService.exists).mockResolvedValue(true);
      vi.mocked(mockUsersService.update).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.upsertUserFromOAuth(mockDiscordProfile),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should_throw_InternalServerErrorException_when_exists_check_fails', async () => {
      vi.mocked(mockUsersService.exists).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.upsertUserFromOAuth(mockDiscordProfile),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should_handle_partial_discord_profile_data', async () => {
      const partialTokens = createTestTokenPair('partial');
      const partialProfile: DiscordProfileDto = {
        discordId: userId,
        username: 'testuser',
        accessToken: partialTokens.accessToken,
        refreshToken: partialTokens.refreshToken,
      };
      vi.mocked(mockUsersService.exists).mockResolvedValue(false);
      vi.mocked(mockUsersService.create).mockResolvedValue({
        ...mockUser,
        discriminator: null,
        globalName: null,
        avatar: null,
        email: null,
      });

      const result = await service.upsertUserFromOAuth(partialProfile);

      expect(result).toBeDefined();
      expect(result.id).toBe(userId);
    });
  });
});
