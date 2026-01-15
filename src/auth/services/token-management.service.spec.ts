/**
 * TokenManagementService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import * as rxjs from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';
import { TokenManagementService } from './token-management.service';
import { UsersService } from '../../users/users.service';

describe('TokenManagementService', () => {
  let service: TokenManagementService;
  let mockUsersService: UsersService;
  let mockHttpService: HttpService;
  let mockConfigService: ConfigService;
  let firstValueFromSpy: ReturnType<typeof vi.spyOn>;

  const userId = 'user-123';
  const accessToken = 'access-token-123';
  const refreshToken = 'refresh-token-123';

  beforeEach(async () => {
    vi.restoreAllMocks();

    mockConfigService = {
      get: vi.fn().mockImplementation((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          'discord.apiUrl': 'https://discord.com/api',
          'discord.timeout': 10000,
          'discord.retryAttempts': 3,
          'discord.clientId': 'test-client-id',
          'discord.clientSecret': 'test-client-secret',
        };
        return config[key] ?? defaultValue;
      }),
    } as unknown as ConfigService;

    mockHttpService = {
      get: vi.fn(),
      post: vi.fn(),
    } as unknown as HttpService;

    mockUsersService = {
      getUserTokens: vi.fn(),
      updateUserTokens: vi.fn(),
    } as unknown as UsersService;

    const module = await Test.createTestingModule({
      providers: [
        TokenManagementService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<TokenManagementService>(TokenManagementService);
  });

  afterEach(() => {
    if (firstValueFromSpy) {
      firstValueFromSpy.mockRestore();
    }
    vi.restoreAllMocks();
  });

  describe('validateDiscordToken', () => {
    it('should_return_true_when_token_is_valid', async () => {
      const mockResponse: AxiosResponse = {
        data: { id: 'user-123', username: 'testuser' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };

      vi.mocked(mockHttpService.get).mockReturnValue(
        of(mockResponse).pipe() as never,
      );

      firstValueFromSpy = vi
        .spyOn(rxjs, 'firstValueFrom')
        .mockResolvedValue(mockResponse);

      const result = await service.validateDiscordToken(accessToken);

      expect(result).toBe(true);
      firstValueFromSpy.mockRestore();
    });

    it('should_return_false_when_token_validation_fails', async () => {
      const axiosError = new AxiosError('Unauthorized');
      axiosError.response = {
        status: 401,
        statusText: 'Unauthorized',
        data: {},
        headers: {},
        config: {} as never,
      };

      vi.mocked(mockHttpService.get).mockReturnValue(
        throwError(() => axiosError) as never,
      );

      firstValueFromSpy = vi
        .spyOn(rxjs, 'firstValueFrom')
        .mockRejectedValue(new UnauthorizedException('Invalid Discord token'));

      const result = await service.validateDiscordToken('invalid-token');

      expect(result).toBe(false);
      firstValueFromSpy.mockRestore();
    });

    it('should_return_false_when_http_error_occurs', async () => {
      const axiosError = new AxiosError('Network Error');

      vi.mocked(mockHttpService.get).mockReturnValue(
        throwError(() => axiosError) as never,
      );

      firstValueFromSpy = vi
        .spyOn(rxjs, 'firstValueFrom')
        .mockRejectedValue(new UnauthorizedException('Invalid Discord token'));

      const result = await service.validateDiscordToken(accessToken);

      expect(result).toBe(false);
      firstValueFromSpy.mockRestore();
    });
  });

  describe('refreshDiscordToken', () => {
    it('should_return_access_token_when_refresh_succeeds', async () => {
      const mockTokens = {
        accessToken: null,
        refreshToken: refreshToken,
      };

      const mockRefreshResponse: AxiosResponse = {
        data: {
          access_token: 'new-access-token-456',
          refresh_token: 'new-refresh-token-456',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };

      const mockUpdatedUser = {
        id: userId,
        accessToken: 'new-access-token-456',
        refreshToken: 'new-refresh-token-456',
      };

      vi.mocked(mockUsersService.getUserTokens).mockResolvedValue(mockTokens);
      vi.mocked(mockHttpService.post).mockReturnValue(
        of(mockRefreshResponse).pipe() as never,
      );
      vi.mocked(mockUsersService.updateUserTokens).mockResolvedValue(
        mockUpdatedUser as never,
      );

      firstValueFromSpy = vi
        .spyOn(rxjs, 'firstValueFrom')
        .mockResolvedValue(mockRefreshResponse);

      const result = await service.refreshDiscordToken(userId);

      expect(result).toBe('new-access-token-456');
      expect(mockUsersService.updateUserTokens).toHaveBeenCalledWith(userId, {
        accessToken: 'new-access-token-456',
        refreshToken: 'new-refresh-token-456',
      });
      firstValueFromSpy.mockRestore();
    });

    it('should_return_null_when_no_refresh_token_exists', async () => {
      const mockTokens = {
        accessToken: null,
        refreshToken: null,
      };

      vi.mocked(mockUsersService.getUserTokens).mockResolvedValue(mockTokens);

      const result = await service.refreshDiscordToken(userId);

      expect(result).toBe(null);
      expect(mockHttpService.post).not.toHaveBeenCalled();
    });

    it('should_return_null_when_refresh_fails', async () => {
      const mockTokens = {
        accessToken: null,
        refreshToken: refreshToken,
      };

      const axiosError = new AxiosError('Refresh failed');
      axiosError.response = {
        status: 400,
        statusText: 'Bad Request',
        data: {},
        headers: {},
        config: {} as never,
      };

      vi.mocked(mockUsersService.getUserTokens).mockResolvedValue(mockTokens);
      vi.mocked(mockHttpService.post).mockReturnValue(
        throwError(() => axiosError) as never,
      );

      firstValueFromSpy = vi
        .spyOn(rxjs, 'firstValueFrom')
        .mockRejectedValue(
          new UnauthorizedException('Failed to refresh Discord token'),
        );

      const result = await service.refreshDiscordToken(userId);

      expect(result).toBe(null);
      firstValueFromSpy.mockRestore();
    });
  });

  describe('getValidAccessToken', () => {
    it('should_return_existing_token_when_token_is_valid', async () => {
      const mockTokens = {
        accessToken: accessToken,
        refreshToken: refreshToken,
      };

      const mockResponse: AxiosResponse = {
        data: { id: 'user-123' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };

      vi.mocked(mockUsersService.getUserTokens).mockResolvedValue(mockTokens);
      vi.mocked(mockHttpService.get).mockReturnValue(
        of(mockResponse).pipe() as never,
      );

      firstValueFromSpy = vi
        .spyOn(rxjs, 'firstValueFrom')
        .mockResolvedValue(mockResponse);

      const result = await service.getValidAccessToken(userId);

      expect(result).toBe(accessToken);
      expect(mockUsersService.getUserTokens).toHaveBeenCalledWith(userId);
      firstValueFromSpy.mockRestore();
    });

    it('should_return_null_when_no_access_token_exists', async () => {
      const mockTokens = {
        accessToken: null,
        refreshToken: null,
      };

      vi.mocked(mockUsersService.getUserTokens).mockResolvedValue(mockTokens);

      const result = await service.getValidAccessToken(userId);

      expect(result).toBe(null);
    });

    it('should_refresh_token_when_existing_token_is_invalid', async () => {
      const mockTokens = {
        accessToken: accessToken,
        refreshToken: refreshToken,
      };

      const mockRefreshResponse: AxiosResponse = {
        data: {
          access_token: 'new-access-token-456',
          refresh_token: 'new-refresh-token-456',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };

      const mockUpdatedUser = {
        id: userId,
        accessToken: 'new-access-token-456',
        refreshToken: 'new-refresh-token-456',
      };

      vi.mocked(mockUsersService.getUserTokens).mockResolvedValue(mockTokens);
      vi.mocked(mockHttpService.get).mockReturnValue(
        throwError(() => new AxiosError('Unauthorized')) as never,
      );
      vi.mocked(mockHttpService.post).mockReturnValue(
        of(mockRefreshResponse).pipe() as never,
      );
      vi.mocked(mockUsersService.updateUserTokens).mockResolvedValue(
        mockUpdatedUser as never,
      );

      firstValueFromSpy = vi
        .spyOn(rxjs, 'firstValueFrom')
        .mockImplementationOnce(() =>
          Promise.reject(new UnauthorizedException('Invalid Discord token')),
        )
        .mockImplementationOnce(() => Promise.resolve(mockRefreshResponse));

      const result = await service.getValidAccessToken(userId);

      expect(result).toBe('new-access-token-456');
      firstValueFromSpy.mockRestore();
    });

    it('should_return_null_when_error_occurs', async () => {
      vi.mocked(mockUsersService.getUserTokens).mockRejectedValue(
        new Error('Database error'),
      );

      const result = await service.getValidAccessToken(userId);

      expect(result).toBe(null);
    });
  });

  describe('revokeTokens', () => {
    it('should_revoke_tokens_and_clear_from_database', async () => {
      const mockTokens = {
        accessToken: accessToken,
        refreshToken: refreshToken,
      };

      const mockRevokeResponse: AxiosResponse = {
        data: undefined,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };

      const mockUpdatedUser = {
        id: userId,
        accessToken: null,
        refreshToken: null,
      };

      vi.mocked(mockUsersService.getUserTokens).mockResolvedValue(mockTokens);
      vi.mocked(mockHttpService.post).mockReturnValue(
        of(mockRevokeResponse).pipe() as never,
      );
      vi.mocked(mockUsersService.updateUserTokens).mockResolvedValue(
        mockUpdatedUser as never,
      );

      firstValueFromSpy = vi
        .spyOn(rxjs, 'firstValueFrom')
        .mockResolvedValue(mockRevokeResponse);

      await service.revokeTokens(userId);

      expect(mockUsersService.updateUserTokens).toHaveBeenCalledWith(userId, {
        accessToken: undefined,
        refreshToken: undefined,
      });
      firstValueFromSpy.mockRestore();
    });

    it('should_clear_tokens_even_when_revoke_api_fails', async () => {
      const mockTokens = {
        accessToken: accessToken,
        refreshToken: refreshToken,
      };

      const mockRevokeResponse: AxiosResponse = {
        data: undefined,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };

      const mockUpdatedUser = {
        id: userId,
        accessToken: null,
        refreshToken: null,
      };

      const axiosError = new AxiosError('Revoke failed');

      vi.mocked(mockUsersService.getUserTokens).mockResolvedValue(mockTokens);
      vi.mocked(mockHttpService.post).mockReturnValue(
        throwError(() => axiosError) as never,
      );
      vi.mocked(mockUsersService.updateUserTokens).mockResolvedValue(
        mockUpdatedUser as never,
      );

      firstValueFromSpy = vi
        .spyOn(rxjs, 'firstValueFrom')
        .mockResolvedValue(mockRevokeResponse);

      await service.revokeTokens(userId);

      expect(mockUsersService.updateUserTokens).toHaveBeenCalledWith(userId, {
        accessToken: undefined,
        refreshToken: undefined,
      });
      firstValueFromSpy.mockRestore();
    });

    it('should_clear_tokens_when_no_access_token_exists', async () => {
      const mockTokens = {
        accessToken: null,
        refreshToken: refreshToken,
      };

      const mockUpdatedUser = {
        id: userId,
        accessToken: null,
        refreshToken: null,
      };

      vi.mocked(mockUsersService.getUserTokens).mockResolvedValue(mockTokens);
      vi.mocked(mockUsersService.updateUserTokens).mockResolvedValue(
        mockUpdatedUser as never,
      );

      await service.revokeTokens(userId);

      expect(mockUsersService.updateUserTokens).toHaveBeenCalledWith(userId, {
        accessToken: undefined,
        refreshToken: undefined,
      });
      expect(mockHttpService.post).not.toHaveBeenCalled();
    });

    it('should_throw_error_when_update_fails', async () => {
      const mockTokens = {
        accessToken: accessToken,
        refreshToken: refreshToken,
      };

      const mockRevokeResponse: AxiosResponse = {
        data: undefined,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as never,
      };

      vi.mocked(mockUsersService.getUserTokens).mockResolvedValue(mockTokens);
      vi.mocked(mockHttpService.post).mockReturnValue(
        of(mockRevokeResponse).pipe() as never,
      );
      vi.mocked(mockUsersService.updateUserTokens).mockRejectedValue(
        new Error('Database error'),
      );

      firstValueFromSpy = vi
        .spyOn(rxjs, 'firstValueFrom')
        .mockResolvedValue(mockRevokeResponse);

      await expect(service.revokeTokens(userId)).rejects.toThrow(
        'Database error',
      );
      firstValueFromSpy.mockRestore();
    });
  });
});
