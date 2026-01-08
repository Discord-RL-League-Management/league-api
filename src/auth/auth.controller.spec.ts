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
import {
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import type { Mocked } from 'vitest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DiscordOAuthService } from './services/discord-oauth.service';
import { DiscordApiService } from '@/discord/discord-api.service';
import { AuthOrchestrationService } from './services/auth-orchestration.service';
import { RedirectUriValidationService } from './services/redirect-uri-validation.service';
import { TokenManagementService } from './services/token-management.service';
import type { AuthenticatedUser } from '@/common/interfaces/user.interface';
import type { Response } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: AuthService;
  let mockDiscordOAuthService: DiscordOAuthService;
  let mockDiscordApiService: DiscordApiService;
  let mockAuthOrchestrationService: AuthOrchestrationService;
  let mockRedirectUriValidationService: RedirectUriValidationService;
  let mockTokenManagementService: TokenManagementService;
  let mockConfigService: ConfigService;
  let mockCacheManager: Mocked<Cache>;
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

    mockRedirectUriValidationService = {
      validateRedirectUri: vi.fn(),
      normalizeUri: vi.fn(),
      isUriAllowed: vi.fn(),
    } as unknown as RedirectUriValidationService;

    mockDiscordOAuthService = {
      getAuthorizationUrl: vi
        .fn()
        .mockImplementation((state?: string) =>
          state
            ? `https://discord.com/oauth?state=${state}`
            : 'https://discord.com/oauth',
        ),
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
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'frontend.url') {
          return 'http://localhost:3000';
        }
        if (key === 'oauth.redirectUris') {
          return ['http://localhost:3000'];
        }
        return undefined;
      }),
    } as unknown as ConfigService;

    mockCacheManager = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    } as unknown as Mocked<Cache>;

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
          provide: AuthOrchestrationService,
          useValue: mockAuthOrchestrationService,
        },
        {
          provide: RedirectUriValidationService,
          useValue: mockRedirectUriValidationService,
        },
        {
          provide: TokenManagementService,
          useValue: mockTokenManagementService,
        },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
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
    it('should_generate_state_token_and_store_in_cache_when_initiated', async () => {
      vi.mocked(mockCacheManager.set).mockResolvedValue(undefined);
      vi.mocked(mockDiscordOAuthService.getAuthorizationUrl).mockReturnValue(
        'https://discord.com/oauth?state=test-state-token',
      );

      await controller.discordLogin(mockResponse);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.stringMatching(/^oauth:state:/),
        expect.objectContaining({ timestamp: expect.any(Number) }),
        600000, // 10 minutes TTL
      );

      expect(mockDiscordOAuthService.getAuthorizationUrl).toHaveBeenCalledWith(
        expect.any(String),
      );

      expect(mockResponse.redirect).toHaveBeenCalled();
    });

    it('should_redirect_to_error_when_cache_storage_fails', async () => {
      vi.mocked(mockCacheManager.set).mockRejectedValue(
        new Error('Cache error'),
      );

      await controller.discordLogin(mockResponse);

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/auth/error'),
      );
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('oauth_init_failed'),
      );
    });
  });

  describe('discordCallback', () => {
    beforeEach(() => {
      vi.mocked(
        mockRedirectUriValidationService.validateRedirectUri,
      ).mockImplementation((redirectUri, allowedUris, defaultUri) => {
        return defaultUri;
      });
    });

    // Helper Functions
    // These functions configure existing mocks (created in beforeEach) using vi.mocked()
    // This maintains the NestJS DI pattern with useValue providers

    function createDiscordTokenResponse() {
      return {
        access_token: 'access-token',
        token_type: 'Bearer',
        expires_in: 604800,
        refresh_token: 'refresh-token',
        scope: 'identify email',
      };
    }

    function createDiscordUserResponse() {
      return {
        id: 'discord-user-123',
        username: 'testuser',
        discriminator: '0001',
        global_name: 'Test User',
        avatar: 'avatar_hash',
        email: 'test@example.com',
      };
    }

    function createOAuthSuccessMocks() {
      const stateToken = 'valid-state-token-123';
      const cachedState = { timestamp: Date.now() };
      const tokenResponse = createDiscordTokenResponse();
      const discordUser = createDiscordUserResponse();

      vi.mocked(mockCacheManager.get).mockResolvedValue(cachedState);
      vi.mocked(mockCacheManager.del).mockResolvedValue(undefined);
      vi.mocked(mockDiscordOAuthService.exchangeCode).mockResolvedValue(
        tokenResponse,
      );
      vi.mocked(mockDiscordApiService.getUserProfile).mockResolvedValue(
        discordUser as never,
      );
      vi.mocked(mockAuthService.validateDiscordUser).mockResolvedValue(
        mockUser,
      );
      vi.mocked(mockAuthService.generateJwt).mockReturnValue({
        access_token: 'jwt-token',
      });
      vi.mocked(
        mockAuthOrchestrationService.syncUserGuildMemberships,
      ).mockResolvedValue(undefined);

      return { stateToken, cachedState };
    }

    function setupConfigServiceMock(redirectUriConfig: {
      defaultUri: string;
      allowedUris: string[];
    }) {
      vi.mocked(mockConfigService.get).mockImplementation((key: string) => {
        if (key === 'frontend.url') {
          return redirectUriConfig.defaultUri;
        }
        if (key === 'oauth.redirectUris') {
          return redirectUriConfig.allowedUris;
        }
        return undefined;
      });
    }

    it('should_redirect_to_error_when_oauth_error_present', async () => {
      const error = 'access_denied';
      const errorDescription = 'User denied access';

      await controller.discordCallback(
        '' as string,
        '' as string,
        error,
        errorDescription,
        undefined as string,
        mockResponse,
      );

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/auth/error'),
      );
    });

    it('should_redirect_to_error_when_state_parameter_missing', async () => {
      await controller.discordCallback(
        'auth-code-123',
        '' as string,
        '' as string,
        '' as string,
        undefined as string,
        mockResponse,
      );

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/auth/error'),
      );
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('invalid_state'),
      );
      // Error description is URL-encoded in the redirect URL
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('State%20parameter%20missing'),
      );
    });

    it('should_redirect_to_error_when_state_not_in_cache', async () => {
      vi.mocked(mockCacheManager.get).mockResolvedValue(undefined);

      await controller.discordCallback(
        'auth-code-123',
        'invalid-state-token',
        '' as string,
        '' as string,
        undefined as string,
        mockResponse,
      );

      expect(mockCacheManager.get).toHaveBeenCalledWith(
        'oauth:state:invalid-state-token',
      );
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/auth/error'),
      );
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('invalid_state'),
      );
    });

    it('should_validate_state_and_delete_from_cache_when_valid', async () => {
      const { stateToken } = createOAuthSuccessMocks();

      await controller.discordCallback(
        'auth-code-123',
        stateToken,
        '' as string,
        '' as string,
        undefined as string,
        mockResponse,
      );

      expect(mockCacheManager.get).toHaveBeenCalledWith(
        `oauth:state:${stateToken}`,
      );
      // State token is deleted after validation to prevent replay attacks (one-time use)
      expect(mockCacheManager.del).toHaveBeenCalledWith(
        `oauth:state:${stateToken}`,
      );
      expect(mockDiscordOAuthService.exchangeCode).toHaveBeenCalledWith(
        'auth-code-123',
      );
    });

    it('should_redirect_to_error_when_code_missing_after_state_validation', async () => {
      const stateToken = 'valid-state-token-123';
      const cachedState = { timestamp: Date.now() };

      vi.mocked(mockCacheManager.get).mockResolvedValue(cachedState);
      vi.mocked(mockCacheManager.del).mockResolvedValue(undefined);

      await controller.discordCallback(
        '' as string,
        stateToken,
        '' as string,
        '' as string,
        undefined as string,
        mockResponse,
      );

      // State token is deleted even on error to prevent reuse in replay attacks
      expect(mockCacheManager.del).toHaveBeenCalled();
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/auth/error'),
      );
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('no_code'),
      );
    });

    it('should_accept_valid_redirect_uri_from_whitelist', async () => {
      const redirectUri = 'https://example.com';
      const allowedUris = ['https://example.com', 'http://localhost:3000'];
      const defaultUri = 'http://localhost:3000';

      setupConfigServiceMock({ defaultUri, allowedUris });
      vi.mocked(
        mockRedirectUriValidationService.validateRedirectUri,
      ).mockReturnValue(redirectUri);
      const { stateToken } = createOAuthSuccessMocks();

      await controller.discordCallback(
        'auth-code-123',
        stateToken,
        '' as string,
        '' as string,
        redirectUri,
        mockResponse,
      );

      expect(
        mockRedirectUriValidationService.validateRedirectUri,
      ).toHaveBeenCalledWith(redirectUri, allowedUris, defaultUri);
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        `${redirectUri}/auth/callback`,
      );
    });

    it('should_default_to_frontend_url_when_redirect_uri_not_provided', async () => {
      const defaultUri = 'http://localhost:3000';
      const allowedUris = ['http://localhost:3000'];

      setupConfigServiceMock({ defaultUri, allowedUris });
      vi.mocked(
        mockRedirectUriValidationService.validateRedirectUri,
      ).mockReturnValue(defaultUri);
      const { stateToken } = createOAuthSuccessMocks();

      await controller.discordCallback(
        'auth-code-123',
        stateToken,
        '' as string,
        '' as string,
        undefined as string,
        mockResponse,
      );

      expect(
        mockRedirectUriValidationService.validateRedirectUri,
      ).toHaveBeenCalledWith(undefined, allowedUris, defaultUri);
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        `${defaultUri}/auth/callback`,
      );
    });

    it('should_reject_invalid_redirect_uri_not_in_whitelist', async () => {
      const redirectUri = 'https://malicious.com';
      const allowedUris = ['https://example.com', 'http://localhost:3000'];
      const defaultUri = 'http://localhost:3000';

      vi.mocked(mockConfigService.get).mockImplementation((key: string) => {
        if (key === 'frontend.url') {
          return defaultUri;
        }
        if (key === 'oauth.redirectUris') {
          return allowedUris;
        }
        return undefined;
      });

      vi.mocked(
        mockRedirectUriValidationService.validateRedirectUri,
      ).mockImplementation(() => {
        throw new BadRequestException('Invalid redirect URI');
      });

      await controller.discordCallback(
        'auth-code-123',
        'state-token',
        '' as string,
        '' as string,
        redirectUri,
        mockResponse,
      );

      expect(
        mockRedirectUriValidationService.validateRedirectUri,
      ).toHaveBeenCalledWith(redirectUri, allowedUris, defaultUri);

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/auth/error'),
      );
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('invalid_redirect_uri'),
      );
    });

    it('should_normalize_trailing_slashes_in_redirect_uri', async () => {
      const redirectUri = 'https://example.com/';
      const normalizedUri = 'https://example.com';
      const allowedUris = ['https://example.com', 'http://localhost:3000'];
      const defaultUri = 'http://localhost:3000';

      setupConfigServiceMock({ defaultUri, allowedUris });
      vi.mocked(
        mockRedirectUriValidationService.validateRedirectUri,
      ).mockReturnValue(normalizedUri);
      const { stateToken } = createOAuthSuccessMocks();

      await controller.discordCallback(
        'auth-code-123',
        stateToken,
        '' as string,
        '' as string,
        redirectUri,
        mockResponse,
      );

      expect(
        mockRedirectUriValidationService.validateRedirectUri,
      ).toHaveBeenCalledWith(redirectUri, allowedUris, defaultUri);
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        `${normalizedUri}/auth/callback`,
      );
    });
  });
});
