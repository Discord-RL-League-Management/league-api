import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { DiscordApiService } from './discord-api.service';
import { of, throwError } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';
import {
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DiscordFactory } from '../../test/factories/discord.factory';

describe('DiscordApiService', () => {
  let service: DiscordApiService;

  const mockHttpService = {
    get: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn<unknown, [string, unknown?]>(
      (key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          'discord.apiUrl': 'https://discord.com/api',
          'discord.timeout': 10000,
          'discord.retryAttempts': 3,
        };
        return config[key] || defaultValue;
      },
    ),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DiscordApiService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<DiscordApiService>(DiscordApiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserGuilds', () => {
    it('should return guilds on successful API call', async () => {
      // Arrange
      const mockGuilds = DiscordFactory.createMockGuilds(3);
      const mockResponse: AxiosResponse = {
        data: mockGuilds,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      // Act
      const result = await service.getUserGuilds('valid_token');

      // Assert
      expect(result).toEqual(mockGuilds);
      expect(mockHttpService.get).toHaveBeenCalledTimes(1);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining('/users/@me/guilds'),
        expect.objectContaining({
          headers: { Authorization: 'Bearer valid_token' },
        }),
      );
    });

    it('should throw UnauthorizedException on 401 response', async () => {
      // Arrange
      const mockError: Partial<AxiosError> = {
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: {},
          headers: {},
          config: {} as any,
        },
        message: 'Unauthorized',
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(throwError(() => mockError));

      // Act & Assert
      await expect(service.getUserGuilds('invalid_token')).rejects.toThrow(
        UnauthorizedException,
      );
      // Should only make 1 HTTP call (no retries for 401)
      expect(mockHttpService.get).toHaveBeenCalledTimes(1);
    });

    it('should throw ServiceUnavailableException on 429 (rate limit)', async () => {
      // Arrange
      const mockError: Partial<AxiosError> = {
        response: {
          status: 429,
          statusText: 'Too Many Requests',
          data: {},
          headers: {},
          config: {} as any,
        },
        message: 'Rate limited',
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(throwError(() => mockError));

      // Act & Assert
      await expect(service.getUserGuilds('valid_token')).rejects.toThrow(
        ServiceUnavailableException,
      );
      // Should only make 1 HTTP call (no retries for 429)
      expect(mockHttpService.get).toHaveBeenCalledTimes(1);
    });

    it('should throw ServiceUnavailableException on network error', async () => {
      // Arrange
      const mockError: Partial<AxiosError> = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: {},
          headers: {},
          config: {} as any,
        },
        message: 'Network error',
        config: {} as any,
      };

      // Always fail with 500 error
      mockHttpService.get.mockReturnValue(throwError(() => mockError));

      // Act & Assert
      await expect(service.getUserGuilds('valid_token')).rejects.toThrow(
        ServiceUnavailableException,
      );
      // Should retry up to max attempts (1 initial + 3 retries = 4 total)
      expect(mockHttpService.get).toHaveBeenCalledTimes(4);
    });

    it('should handle timeout errors', async () => {
      // Arrange
      const timeoutError = new Error('timeout');
      (timeoutError as any).code = 'ECONNABORTED';
      (timeoutError as any).config = {};

      // Always fail with timeout
      mockHttpService.get.mockReturnValue(throwError(() => timeoutError));

      // Act & Assert
      await expect(service.getUserGuilds('valid_token')).rejects.toThrow();
      // Should retry up to max attempts (1 initial + 3 retries = 4 total)
      expect(mockHttpService.get).toHaveBeenCalledTimes(4);
    });
  });

  describe('getUserGuilds - Retry Behavior', () => {
    it('should NOT retry on 429 rate limit error (only 1 HTTP call)', async () => {
      // Input: 429 error with retry-after header
      const mockError: Partial<AxiosError> = {
        response: {
          status: 429,
          statusText: 'Too Many Requests',
          data: {
            message: 'You are being rate limited.',
            retry_after: 0.3,
            global: false,
          },
          headers: {
            'retry-after': '0.3',
          },
          config: {} as any,
        },
        message: 'Rate limited',
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(throwError(() => mockError));

      // Act
      await expect(service.getUserGuilds('valid_token')).rejects.toThrow(
        ServiceUnavailableException,
      );

      // Output: Should only make 1 HTTP call (no retries)
      expect(mockHttpService.get).toHaveBeenCalledTimes(1);
    });

    it('should NOT retry on 401 unauthorized error (only 1 HTTP call)', async () => {
      // Input: 401 error
      const mockError: Partial<AxiosError> = {
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: {},
          headers: {},
          config: {} as any,
        },
        message: 'Unauthorized',
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(throwError(() => mockError));

      // Act
      await expect(service.getUserGuilds('valid_token')).rejects.toThrow(
        UnauthorizedException,
      );

      // Output: Should only make 1 HTTP call (no retries)
      expect(mockHttpService.get).toHaveBeenCalledTimes(1);
    });

    it('should retry on 500 server error (multiple HTTP calls with exponential backoff)', async () => {
      // Input: 500 error that eventually succeeds
      const mockError: Partial<AxiosError> = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: {},
          headers: {},
          config: {} as any,
        },
        message: 'Server error',
        config: {} as any,
      };

      const mockSuccess: AxiosResponse = {
        data: [],
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      // Fail twice, then succeed on 3rd attempt
      mockHttpService.get
        .mockReturnValueOnce(throwError(() => mockError))
        .mockReturnValueOnce(throwError(() => mockError))
        .mockReturnValueOnce(of(mockSuccess));

      // Act
      const result = await service.getUserGuilds('valid_token');

      // Output: Should retry (3 total calls: 1 initial + 2 retries)
      expect(mockHttpService.get).toHaveBeenCalledTimes(3);
      expect(result).toEqual([]);
    });

    it('should retry on timeout error (multiple HTTP calls)', async () => {
      // Input: Timeout error
      const timeoutError = new Error('timeout');
      (timeoutError as any).code = 'ECONNABORTED';
      (timeoutError as any).config = {};

      const mockSuccess: AxiosResponse = {
        data: [],
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      // Fail once, then succeed
      mockHttpService.get
        .mockReturnValueOnce(throwError(() => timeoutError))
        .mockReturnValueOnce(of(mockSuccess));

      // Act
      const result = await service.getUserGuilds('valid_token');

      // Output: Should retry (2 total calls)
      expect(mockHttpService.get).toHaveBeenCalledTimes(2);
      expect(result).toEqual([]);
    });

    it('should succeed on first attempt (only 1 HTTP call)', async () => {
      // Input: Successful response
      const mockGuilds = DiscordFactory.createMockGuilds(3);
      const mockResponse: AxiosResponse = {
        data: mockGuilds,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      // Act
      const result = await service.getUserGuilds('valid_token');

      // Output: Should only make 1 HTTP call
      expect(mockHttpService.get).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockGuilds);
    });

    it('should NOT retry 429 error even with high retryAttempts config', async () => {
      // Input: High retry attempts config
      const highRetryConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config: Record<string, unknown> = {
            'discord.apiUrl': 'https://discord.com/api',
            'discord.timeout': 10000,
            'discord.retryAttempts': 10, // High retry count
          };
          return config[key] || defaultValue;
        }),
      };

      // Recreate service with new config
      const module = await Test.createTestingModule({
        providers: [
          DiscordApiService,
          { provide: HttpService, useValue: mockHttpService },
          { provide: ConfigService, useValue: highRetryConfigService },
        ],
      }).compile();

      const serviceWithHighRetries =
        module.get<DiscordApiService>(DiscordApiService);

      const mockError: Partial<AxiosError> = {
        response: {
          status: 429,
          statusText: 'Too Many Requests',
          data: { retry_after: 0.3 },
          headers: {},
          config: {} as any,
        },
        message: 'Rate limited',
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(throwError(() => mockError));

      // Act
      await expect(
        serviceWithHighRetries.getUserGuilds('valid_token'),
      ).rejects.toThrow();

      // Output: Should still only make 1 call (no retries)
      expect(mockHttpService.get).toHaveBeenCalledTimes(1);
    });

    it('should NOT retry 401 error even with high retryAttempts config', async () => {
      // Input: High retry attempts config
      const highRetryConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config: Record<string, unknown> = {
            'discord.apiUrl': 'https://discord.com/api',
            'discord.timeout': 10000,
            'discord.retryAttempts': 10,
          };
          return config[key] || defaultValue;
        }),
      };

      // Recreate service with new config
      const module = await Test.createTestingModule({
        providers: [
          DiscordApiService,
          { provide: HttpService, useValue: mockHttpService },
          { provide: ConfigService, useValue: highRetryConfigService },
        ],
      }).compile();

      const serviceWithHighRetries =
        module.get<DiscordApiService>(DiscordApiService);

      const mockError: Partial<AxiosError> = {
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: {},
          headers: {},
          config: {} as any,
        },
        message: 'Unauthorized',
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(throwError(() => mockError));

      // Act
      await expect(
        serviceWithHighRetries.getUserGuilds('valid_token'),
      ).rejects.toThrow();

      // Output: Should still only make 1 call (no retries)
      expect(mockHttpService.get).toHaveBeenCalledTimes(1);
    });

    it('should respect max retry attempts for retryable errors (500 errors)', async () => {
      // Input: 500 error that never succeeds
      const mockError: Partial<AxiosError> = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: {},
          headers: {},
          config: {} as any,
        },
        message: 'Server error',
        config: {} as any,
      };

      // Always fail
      mockHttpService.get.mockReturnValue(throwError(() => mockError));

      // Act
      await expect(service.getUserGuilds('valid_token')).rejects.toThrow(
        ServiceUnavailableException,
      );

      // Output: Should retry up to max attempts (1 initial + 3 retries = 4 total)
      expect(mockHttpService.get).toHaveBeenCalledTimes(4);
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile on successful API call', async () => {
      // Arrange
      const mockUser = DiscordFactory.createMockUser();
      const mockResponse: AxiosResponse = {
        data: mockUser,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      // Act
      const result = await service.getUserProfile('valid_token');

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockHttpService.get).toHaveBeenCalledTimes(1);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining('/users/@me'),
        expect.objectContaining({
          headers: { Authorization: 'Bearer valid_token' },
        }),
      );
    });

    it('should throw ServiceUnavailableException on API error', async () => {
      // Arrange
      const mockError: Partial<AxiosError> = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: {},
          headers: {},
          config: {} as any,
        },
        message: 'Server error',
        config: {} as any,
      };

      // Always fail
      mockHttpService.get.mockReturnValue(throwError(() => mockError));

      // Act & Assert
      await expect(service.getUserProfile('valid_token')).rejects.toThrow(
        ServiceUnavailableException,
      );
      // Should retry up to max attempts (1 initial + 3 retries = 4 total)
      expect(mockHttpService.get).toHaveBeenCalledTimes(4);
    });
  });

  describe('getUserProfile - Retry Behavior', () => {
    it('should NOT retry on 429 rate limit error', async () => {
      const mockError: Partial<AxiosError> = {
        response: {
          status: 429,
          statusText: 'Too Many Requests',
          data: {},
          headers: {},
          config: {} as any,
        },
        message: 'Rate limited',
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(throwError(() => mockError));

      await expect(service.getUserProfile('valid_token')).rejects.toThrow();

      expect(mockHttpService.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('getGuildMember - Retry Behavior', () => {
    it('should NOT retry on 429 rate limit error', async () => {
      const mockError: Partial<AxiosError> = {
        response: {
          status: 429,
          statusText: 'Too Many Requests',
          data: {},
          headers: {},
          config: {} as any,
        },
        message: 'Rate limited',
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(throwError(() => mockError));

      await expect(
        service.getGuildMember('valid_token', 'guild123'),
      ).rejects.toThrow();

      expect(mockHttpService.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('checkGuildPermissions', () => {
    it('should return permissions for guild member', async () => {
      // Arrange
      const mockResponse = {
        data: {
          permissions: ['ADMINISTRATOR', 'MANAGE_GUILD'],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      // Act
      const result = await service.checkGuildPermissions(
        'valid_token',
        'guild123',
      );

      // Assert
      expect(result).toEqual({
        isMember: true,
        permissions: ['ADMINISTRATOR', 'MANAGE_GUILD'],
        roles: [],
        hasAdministratorPermission: true,
      });
    });

    it('should return not a member (404)', async () => {
      // Arrange
      const mockError: Partial<AxiosError> = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: {},
          headers: {},
          config: {} as any,
        },
        message: 'Not Found',
      };

      mockHttpService.get.mockReturnValue(throwError(() => mockError));

      // Act
      const result = await service.checkGuildPermissions(
        'valid_token',
        'guild123',
      );

      // Assert
      expect(result).toEqual({
        isMember: false,
        permissions: [],
        roles: [],
        hasAdministratorPermission: false,
      });
    });

    it('should return not a member on other errors', async () => {
      // Arrange
      mockHttpService.get.mockReturnValue(
        throwError(() => new Error('Network error')),
      );

      // Act
      const result = await service.checkGuildPermissions(
        'valid_token',
        'guild123',
      );

      // Assert
      expect(result).toEqual({
        isMember: false,
        permissions: [],
        roles: [],
        hasAdministratorPermission: false,
      });
    });

    it('should handle empty permissions', async () => {
      // Arrange
      const mockResponse = {
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      // Act
      const result = await service.checkGuildPermissions(
        'valid_token',
        'guild123',
      );

      // Assert
      expect(result).toEqual({
        isMember: true,
        permissions: [],
        roles: [],
        hasAdministratorPermission: false,
      });
    });
  });

  describe('getGuildMember', () => {
    it('should return guild member with roles', async () => {
      // Arrange
      const mockResponse = {
        data: {
          roles: ['role1', 'role2'],
          nick: 'TestNick',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      // Act
      const result = await service.getGuildMember('valid_token', 'guild123');

      // Assert
      expect(result).toEqual({
        roles: ['role1', 'role2'],
        nick: 'TestNick',
      });
    });

    it('should return null on 404 (user not in guild)', async () => {
      // Arrange
      const mockError: Partial<AxiosError> = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: {},
          headers: {},
          config: {} as any,
        },
        message: 'Not Found',
      };

      mockHttpService.get.mockReturnValue(throwError(() => mockError));

      // Act
      const result = await service.getGuildMember('valid_token', 'guild123');

      // Assert
      expect(result).toBeNull();
    });

    it('should return member with empty roles if roles missing', async () => {
      // Arrange
      const mockResponse = {
        data: {
          nick: 'TestNick',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      // Act
      const result = await service.getGuildMember('valid_token', 'guild123');

      // Assert
      expect(result).toEqual({
        roles: [],
        nick: 'TestNick',
      });
    });

    it('should throw ServiceUnavailableException on non-404 errors', async () => {
      // Arrange
      const mockError: Partial<AxiosError> = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: {},
          headers: {},
          config: {} as any,
        },
        message: 'Server error',
      };

      mockHttpService.get.mockReturnValue(throwError(() => mockError));

      // Act & Assert
      await expect(
        service.getGuildMember('valid_token', 'guild123'),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });
});
