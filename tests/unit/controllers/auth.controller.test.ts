/**
 * AuthController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthController } from '@/auth/auth.controller';
import { AuthService } from '@/auth/auth.service';
import { DiscordOAuthService } from '@/auth/services/discord-oauth.service';
import { DiscordApiService } from '@/discord/discord-api.service';
import { TokenManagementService } from '@/auth/services/token-management.service';
import { UserGuildsService } from '@/user-guilds/user-guilds.service';
import { GuildsService } from '@/guilds/guilds.service';
import type { AuthenticatedUser } from '@/common/interfaces/user.interface';
import type { Response } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: AuthService;
  let mockDiscordOAuthService: DiscordOAuthService;
  let mockDiscordApiService: DiscordApiService;
  let mockTokenManagementService: TokenManagementService;
  let mockUserGuildsService: UserGuildsService;
  let mockGuildsService: GuildsService;
  let mockConfigService: ConfigService;
  let mockResponse: Response;

  const mockUser: AuthenticatedUser = {
    id: 'user-123',
    username: 'testuser',
    globalName: 'Test User',
    avatar: 'avatar_hash',
    email: 'test@example.com',
    guilds: ['guild-1'],
  };

  beforeEach(async () => {
    // ARRANGE: Setup test dependencies with mocks
    mockAuthService = {
      validateDiscordUser: vi.fn(),
      generateJwt: vi.fn(),
      getUserAvailableGuilds: vi.fn(),
    } as unknown as AuthService;

    mockDiscordOAuthService = {
      getAuthorizationUrl: vi.fn().mockReturnValue('https://discord.com/oauth'),
      exchangeCode: vi.fn(),
    } as unknown as DiscordOAuthService;

    mockDiscordApiService = {
      getUserProfile: vi.fn(),
      getUserGuilds: vi.fn(),
      getGuildMember: vi.fn(),
    } as unknown as DiscordApiService;

    mockTokenManagementService = {
      revokeTokens: vi.fn(),
    } as unknown as TokenManagementService;

    mockUserGuildsService = {
      syncUserGuildMembershipsWithRoles: vi.fn(),
    } as unknown as UserGuildsService;

    mockGuildsService = {
      findActiveGuildIds: vi.fn().mockResolvedValue(['guild-1']),
    } as unknown as GuildsService;

    mockConfigService = {
      get: vi.fn().mockReturnValue('http://localhost:3000'),
    } as unknown as ConfigService;

    mockResponse = {
      redirect: vi.fn(),
      cookie: vi.fn(),
      clearCookie: vi.fn(),
      json: vi.fn(),
    } as unknown as Response;

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: DiscordOAuthService, useValue: mockDiscordOAuthService },
        { provide: DiscordApiService, useValue: mockDiscordApiService },
        {
          provide: TokenManagementService,
          useValue: mockTokenManagementService,
        },
        { provide: UserGuildsService, useValue: mockUserGuildsService },
        { provide: GuildsService, useValue: mockGuildsService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = moduleRef.get<AuthController>(AuthController);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getCurrentUser', () => {
    it('should_return_current_user_when_authenticated', () => {
      // ARRANGE: User is already authenticated (from guard)
      // ACT
      const result = controller.getCurrentUser(mockUser);

      // ASSERT
      expect(result).toEqual(mockUser);
      expect(result.id).toBe('user-123');
    });
  });

  describe('getUserGuilds', () => {
    it('should_return_user_guilds_when_authenticated', async () => {
      // ARRANGE
      const mockGuilds = [{ id: 'guild-1', name: 'Test Guild' }];
      mockAuthService.getUserAvailableGuilds.mockResolvedValue(
        mockGuilds as never[],
      );

      // ACT
      const result = await controller.getUserGuilds(mockUser);

      // ASSERT
      expect(result).toEqual(mockGuilds);
      expect(mockAuthService.getUserAvailableGuilds).toHaveBeenCalledWith(
        mockUser.id,
      );
    });

    it('should_propagate_error_when_service_fails', async () => {
      // ARRANGE
      const error = new InternalServerErrorException('Service error');
      mockAuthService.getUserAvailableGuilds.mockRejectedValue(error);

      // ACT & ASSERT
      await expect(controller.getUserGuilds(mockUser)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('logout', () => {
    it('should_clear_cookie_and_revoke_tokens_when_logout_succeeds', async () => {
      // ARRANGE
      mockTokenManagementService.revokeTokens.mockResolvedValue(undefined);

      // ACT
      await controller.logout(mockUser, mockResponse);

      // ASSERT
      expect(mockResponse.clearCookie).toHaveBeenCalled();
      expect(mockTokenManagementService.revokeTokens).toHaveBeenCalledWith(
        mockUser.id,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Logged out successfully',
      });
    });

    it('should_propagate_error_when_token_revocation_fails', async () => {
      // ARRANGE
      const error = new InternalServerErrorException('Revocation failed');
      mockTokenManagementService.revokeTokens.mockRejectedValue(error);

      // ACT & ASSERT
      await expect(controller.logout(mockUser, mockResponse)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('discordLogin', () => {
    it('should_redirect_to_discord_oauth_when_initiated', () => {
      // ARRANGE: OAuth URL already mocked in beforeEach
      // ACT
      controller.discordLogin(mockResponse);

      // ASSERT
      expect(mockDiscordOAuthService.getAuthorizationUrl).toHaveBeenCalled();
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        'https://discord.com/oauth',
      );
    });
  });

  describe('discordCallback', () => {
    it('should_redirect_to_error_when_oauth_error_present', async () => {
      // ARRANGE
      const error = 'access_denied';
      const errorDescription = 'User denied access';

      // ACT
      await controller.discordCallback(
        undefined,
        error,
        errorDescription,
        mockResponse,
      );

      // ASSERT
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/auth/error'),
      );
    });

    it('should_redirect_to_error_when_code_missing', async () => {
      // ARRANGE: No code provided
      // ACT
      await controller.discordCallback(
        undefined,
        undefined,
        undefined,
        mockResponse,
      );

      // ASSERT
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/auth/error'),
      );
    });
  });
});
