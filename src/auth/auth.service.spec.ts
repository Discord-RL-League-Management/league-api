/**
 * AuthService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InternalServerErrorException } from '@nestjs/common';
import { createTestTokenPair } from '@tests/factories/token.factory';
import { AuthService } from './auth.service';
import { UserOrchestratorService } from '@/users/services/user-orchestrator.service';
import { JwtService } from '@nestjs/jwt';
import { UserGuildsService } from '@/user-guilds/user-guilds.service';
import { DiscordProfileDto } from './dto/discord-profile.dto';
import { User } from '@prisma/client';
import type { UserGuild } from '@/user-guilds/interfaces/user-guild.interface';

describe('AuthService', () => {
  let service: AuthService;
  let mockUserOrchestrator: UserOrchestratorService;
  let mockJwtService: JwtService;
  let mockUserGuildsService: UserGuildsService;

  const userId = 'user-123';
  const mockEncryptedTokens = createTestTokenPair('encrypted');
  const mockPlainTokens = createTestTokenPair('plain');

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

  const mockUserGuild: UserGuild = {
    id: 'guild-123',
    name: 'Test Guild',
    icon: 'guild_icon',
    isMember: true,
    isAdmin: false,
    roles: ['role-1'],
  };

  beforeEach(() => {
    mockUserOrchestrator = {
      upsertUserFromOAuth: vi.fn(),
    } as unknown as UserOrchestratorService;

    mockJwtService = {
      sign: vi.fn().mockReturnValue('jwt_token_string'),
    } as unknown as JwtService;

    mockUserGuildsService = {
      getUserAvailableGuildsWithPermissions: vi.fn(),
      completeOAuthFlow: vi.fn(),
    } as unknown as UserGuildsService;

    service = new AuthService(
      mockUserOrchestrator,
      mockJwtService,
      mockUserGuildsService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateDiscordUser', () => {
    it('should_return_user_when_validation_succeeds', async () => {
      vi.mocked(mockUserOrchestrator.upsertUserFromOAuth).mockResolvedValue(
        mockUser,
      );

      const result = await service.validateDiscordUser(mockDiscordProfile);

      expect(result).toEqual(mockUser);
      expect(result.id).toBe(userId);
    });

    it('should_upsert_user_during_validation', async () => {
      vi.mocked(mockUserOrchestrator.upsertUserFromOAuth).mockResolvedValue(
        mockUser,
      );

      await service.validateDiscordUser(mockDiscordProfile);

      expect(mockUserOrchestrator.upsertUserFromOAuth).toHaveBeenCalledWith(
        mockDiscordProfile,
      );
    });

    it('should_propagate_errors_from_user_orchestrator', async () => {
      const error = new InternalServerErrorException('User creation failed');
      vi.mocked(mockUserOrchestrator.upsertUserFromOAuth).mockRejectedValue(
        error,
      );

      await expect(
        service.validateDiscordUser(mockDiscordProfile),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('generateJwt', () => {
    it('should_generate_jwt_with_all_user_fields', () => {
      const user = {
        id: userId,
        username: 'testuser',
        globalName: 'Test User',
        avatar: 'avatar_hash',
        email: 'test@example.com',
        guilds: [{ id: 'guild-1' }, { id: 'guild-2' }],
      };

      const result = service.generateJwt(user);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
      expect(result.access_token).toBe('jwt_token_string');
      expect(result.user.id).toBe(userId);
      expect(result.user.username).toBe('testuser');
    });

    it('should_generate_jwt_without_optional_fields', () => {
      const user = {
        id: userId,
        username: 'testuser',
      };

      const result = service.generateJwt(user);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
      expect(result.user.id).toBe(userId);
      expect(result.user.username).toBe('testuser');
    });

    it('should_include_guild_ids_in_jwt_payload', () => {
      const user = {
        id: userId,
        username: 'testuser',
        guilds: [{ id: 'guild-1' }, { id: 'guild-2' }],
      };

      service.generateJwt(user);

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          guilds: ['guild-1', 'guild-2'],
        }),
      );
    });

    it('should_not_include_oauth_tokens_in_jwt_payload', () => {
      const excludedTokens = createTestTokenPair('excluded');
      const user = {
        id: userId,
        username: 'testuser',
        accessToken: excludedTokens.accessToken,
        refreshToken: excludedTokens.refreshToken,
      };

      service.generateJwt(user);

      const signCall = vi.mocked(mockJwtService.sign).mock.calls[0][0] as any;
      expect(signCall).not.toHaveProperty('accessToken');
      expect(signCall).not.toHaveProperty('refreshToken');
    });

    it('should_include_all_required_jwt_fields', () => {
      const user = {
        id: userId,
        username: 'testuser',
        globalName: 'Test User',
        avatar: 'avatar_hash',
        email: 'test@example.com',
      };

      service.generateJwt(user);

      const signCall = vi.mocked(mockJwtService.sign).mock.calls[0][0] as any;
      expect(signCall).toHaveProperty('sub', userId);
      expect(signCall).toHaveProperty('username', 'testuser');
      expect(signCall).toHaveProperty('globalName', 'Test User');
      expect(signCall).toHaveProperty('avatar', 'avatar_hash');
      expect(signCall).toHaveProperty('email', 'test@example.com');
    });

    it('should_return_user_object_without_guilds', () => {
      const user = {
        id: userId,
        username: 'testuser',
        guilds: [{ id: 'guild-1' }],
      };

      const result = service.generateJwt(user);

      expect(result.user).not.toHaveProperty('guilds');
      expect(result.user.id).toBe(userId);
      expect(result.user.username).toBe('testuser');
    });
  });

  describe('getUserAvailableGuilds', () => {
    it('should_return_user_guilds_when_retrieval_succeeds', async () => {
      const guilds = [mockUserGuild];
      vi.mocked(
        mockUserGuildsService.getUserAvailableGuildsWithPermissions,
      ).mockResolvedValue(guilds);

      const result = await service.getUserAvailableGuilds(userId);

      expect(result).toEqual(guilds);
      expect(result).toHaveLength(1);
    });

    it('should_return_empty_array_when_service_throws_error', async () => {
      vi.mocked(
        mockUserGuildsService.getUserAvailableGuildsWithPermissions,
      ).mockRejectedValue(new Error('Service error'));

      const result = await service.getUserAvailableGuilds(userId);

      expect(result).toEqual([]);
    });

    it('should_return_empty_array_when_no_guilds_available', async () => {
      vi.mocked(
        mockUserGuildsService.getUserAvailableGuildsWithPermissions,
      ).mockResolvedValue([]);

      const result = await service.getUserAvailableGuilds(userId);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('completeOAuthFlow', () => {
    it('should_complete_oauth_flow_successfully', async () => {
      const userGuilds = [
        {
          id: 'guild-1',
          name: 'Guild 1',
          owner: false,
          permissions: '123456',
          roles: ['role-1'],
        },
      ];
      const resultGuilds = [mockUserGuild];
      vi.mocked(mockUserGuildsService.completeOAuthFlow).mockResolvedValue(
        resultGuilds,
      );

      const result = await service.completeOAuthFlow(userId, userGuilds);

      expect(result).toEqual(resultGuilds);
      expect(result).toHaveLength(1);
    });

    it('should_sync_guilds_during_oauth_completion', async () => {
      const userGuilds = [
        {
          id: 'guild-1',
          name: 'Guild 1',
          owner: false,
          permissions: '123456',
        },
      ];
      const resultGuilds = [mockUserGuild];
      vi.mocked(mockUserGuildsService.completeOAuthFlow).mockResolvedValue(
        resultGuilds,
      );

      await service.completeOAuthFlow(userId, userGuilds);

      expect(mockUserGuildsService.completeOAuthFlow).toHaveBeenCalledWith(
        userId,
        userGuilds,
      );
    });

    it('should_throw_InternalServerErrorException_when_oauth_completion_fails', async () => {
      const userGuilds = [
        {
          id: 'guild-1',
          name: 'Guild 1',
          owner: false,
          permissions: '123456',
        },
      ];
      vi.mocked(mockUserGuildsService.completeOAuthFlow).mockRejectedValue(
        new Error('OAuth completion failed'),
      );

      await expect(
        service.completeOAuthFlow(userId, userGuilds),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
