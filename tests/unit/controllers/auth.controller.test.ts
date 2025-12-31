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
import { AuthOrchestrationService } from '@/auth/services/auth-orchestration.service';
import { TokenManagementService } from '@/auth/services/token-management.service';
import type { AuthenticatedUser } from '@/common/interfaces/user.interface';
import type { Response } from 'express';
import { createMockLoggingService } from '@tests/utils/test-helpers';
import { ILoggingService } from '@/infrastructure/logging/interfaces/logging.interface';
import { IConfigurationService } from '@/infrastructure/configuration/interfaces/configuration.interface';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: AuthService;
  let mockDiscordOAuthService: DiscordOAuthService;
  let mockDiscordApiService: DiscordApiService;
  let mockAuthOrchestrationService: AuthOrchestrationService;
  let mockTokenManagementService: TokenManagementService;
  let mockConfigService: ConfigService;
  let mockResponse: Response;

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
    mockAuthService = {
      validateDiscordUser: vi.fn(),
      generateJwt: vi.fn(),
      getUserAvailableGuilds: vi.fn(),
    } as unknown as AuthService;

    mockAuthOrchestrationService = {
      syncUserGuildMemberships: vi.fn(),
    } as unknown as AuthOrchestrationService;

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

    mockConfigService = {
      get: vi.fn().mockReturnValue('http://localhost:3000'),
    } as unknown as ConfigService;

    mockResponse = {
      redirect: vi.fn(),
      cookie: vi.fn(),
      clearCookie: vi.fn(),
      json: vi.fn(),
    } as unknown as Response;

    const mockLoggingService = createMockLoggingService();

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: DiscordOAuthService, useValue: mockDiscordOAuthService },
        { provide: DiscordApiService, useValue: mockDiscordApiService },
        {
          provide: AuthOrchestrationService,
          useValue: mockAuthOrchestrationService,
        },
        {
          provide: TokenManagementService,
          useValue: mockTokenManagementService,
        },
        { provide: IConfigurationService, useValue: mockConfigService },
        { provide: ILoggingService, useValue: mockLoggingService },
      ],
    }).compile();

    controller = moduleRef.get<AuthController>(AuthController);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCurrentUser', () => {
    it('should_return_current_user_when_authenticated', () => {
      const result = controller.getCurrentUser(mockUser);

      expect(result).toEqual(mockUser);
      expect(result.id).toBe('user-123');
    });
  });

  describe('getUserGuilds', () => {
    it('should_return_user_guilds_when_authenticated', async () => {
      const mockGuilds = [{ id: 'guild-1', name: 'Test Guild' }];
      vi.mocked(mockAuthService.getUserAvailableGuilds).mockResolvedValue(
        mockGuilds as never[],
      );

      const result = await controller.getUserGuilds(mockUser);

      expect(result).toEqual(mockGuilds);
      expect(mockAuthService.getUserAvailableGuilds).toHaveBeenCalledWith(
        mockUser.id,
      );
    });

    it('should_propagate_error_when_service_fails', async () => {
      const error = new InternalServerErrorException('Service error');
      vi.mocked(mockAuthService.getUserAvailableGuilds).mockRejectedValue(
        error,
      );

      await expect(controller.getUserGuilds(mockUser)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('logout', () => {
    it('should_clear_cookie_and_revoke_tokens_when_logout_succeeds', async () => {
      vi.mocked(mockTokenManagementService.revokeTokens).mockResolvedValue(
        undefined,
      );

      await controller.logout(mockUser, mockResponse);

      expect(mockResponse.clearCookie).toHaveBeenCalled();
      expect(mockTokenManagementService.revokeTokens).toHaveBeenCalledWith(
        mockUser.id,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Logged out successfully',
      });
    });

    it('should_propagate_error_when_token_revocation_fails', async () => {
      const error = new InternalServerErrorException('Revocation failed');
      vi.mocked(mockTokenManagementService.revokeTokens).mockRejectedValue(
        error,
      );

      await expect(controller.logout(mockUser, mockResponse)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('discordLogin', () => {
    it('should_redirect_to_discord_oauth_when_initiated', () => {
      controller.discordLogin(mockResponse);

      expect(mockDiscordOAuthService.getAuthorizationUrl).toHaveBeenCalled();
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        'https://discord.com/oauth',
      );
    });
  });

  describe('discordCallback', () => {
    it('should_redirect_to_error_when_oauth_error_present', async () => {
      const error = 'access_denied';
      const errorDescription = 'User denied access';

      await controller.discordCallback(
        '' as string,
        error,
        errorDescription,
        mockResponse,
      );

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/auth/error'),
      );
    });

    it('should_redirect_to_error_when_code_missing', async () => {
      await controller.discordCallback(
        '' as string,
        '' as string,
        '' as string,
        mockResponse,
      );

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/auth/error'),
      );
    });
  });
});
