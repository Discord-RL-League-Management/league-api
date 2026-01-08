/**
 * DiscordOAuthService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 *
 * Reference: https://docs.nestjs.com/fundamentals/testing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { DiscordOAuthService } from './discord-oauth.service';

describe('DiscordOAuthService', () => {
  let service: DiscordOAuthService;
  let mockConfigService: ConfigService;
  let mockHttpService: HttpService;

  beforeEach(async () => {
    mockConfigService = {
      get: vi.fn().mockImplementation((key: string) => {
        const config: Record<string, string> = {
          'discord.clientId': 'test-client-id',
          'discord.clientSecret': 'test-client-secret',
          'discord.callbackUrl': 'http://localhost:3000/auth/discord/callback',
        };
        return config[key];
      }),
    } as unknown as ConfigService;

    mockHttpService = {
      post: vi.fn(),
    } as unknown as HttpService;

    const moduleRef = await Test.createTestingModule({
      providers: [
        DiscordOAuthService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: HttpService, useValue: mockHttpService },
      ],
    }).compile();

    service = moduleRef.get<DiscordOAuthService>(DiscordOAuthService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAuthorizationUrl', () => {
    it('should_generate_authorization_url_without_state_when_state_not_provided', () => {
      const url = service.getAuthorizationUrl();

      expect(url).toMatch(
        /^https:\/\/discord\.com\/api\/oauth2\/authorize\?.*client_id=test-client-id.*redirect_uri=.*response_type=code.*scope=identify\+email\+guilds\+guilds\.members\.read/,
      );
      expect(url).not.toContain('state=');
    });

    it('should_generate_authorization_url_with_state_when_state_provided', () => {
      const stateToken = 'test-state-token-12345';

      const url = service.getAuthorizationUrl(stateToken);

      expect(url).toMatch(
        /^https:\/\/discord\.com\/api\/oauth2\/authorize\?.*client_id=test-client-id.*redirect_uri=.*response_type=code.*scope=identify\+email\+guilds\+guilds\.members\.read/,
      );
      expect(url).toContain('state=test-state-token-12345');
    });

    it('should_include_state_parameter_in_url_when_state_is_url_safe_base64', () => {
      const stateToken = 'test-state-token_with-dashes_and.underscores';

      const url = service.getAuthorizationUrl(stateToken);

      expect(url).toContain(`state=${encodeURIComponent(stateToken)}`);
    });
  });

  describe('exchangeCode', () => {
    it('should_return_token_response_when_exchange_succeeds', async () => {
      const mockTokenResponse = {
        access_token: 'access-token-123',
        token_type: 'Bearer',
        expires_in: 604800,
        refresh_token: 'refresh-token-123',
        scope: 'identify email guilds',
      };

      vi.mocked(mockHttpService.post).mockReturnValue(
        of({ data: mockTokenResponse } as never),
      );

      const result = await service.exchangeCode('auth-code-123');

      expect(result).toEqual(mockTokenResponse);
    });

    it('should_call_http_service_with_correct_parameters_when_exchanging_code', async () => {
      const mockTokenResponse = {
        access_token: 'access-token-123',
        token_type: 'Bearer',
        expires_in: 604800,
        refresh_token: 'refresh-token-123',
        scope: 'identify email guilds',
      };

      vi.mocked(mockHttpService.post).mockReturnValue(
        of({ data: mockTokenResponse } as never),
      );

      await service.exchangeCode('auth-code-123');

      expect(mockHttpService.post).toHaveBeenCalledWith(
        'https://discord.com/api/oauth2/token',
        expect.stringContaining('grant_type=authorization_code'),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }),
      );
    });

    it('should_throw_http_exception_when_token_exchange_fails', async () => {
      vi.mocked(mockHttpService.post).mockReturnValue(
        throwError(() => new Error('Network error')),
      );

      const promise = service.exchangeCode('invalid-code');
      await expect(promise).rejects.toThrow(HttpException);
      await expect(promise).rejects.toThrow(
        'Failed to exchange authorization code',
      );
    });

    it('should_include_authorization_code_in_request_when_exchanging', async () => {
      const mockTokenResponse = {
        access_token: 'access-token-123',
        token_type: 'Bearer',
        expires_in: 604800,
        refresh_token: 'refresh-token-123',
        scope: 'identify email guilds',
      };

      vi.mocked(mockHttpService.post).mockReturnValue(
        of({ data: mockTokenResponse } as never),
      );

      await service.exchangeCode('test-auth-code-456');

      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('code=test-auth-code-456'),
        expect.any(Object),
      );
    });
  });
});
