import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { DiscordApiService } from './discord-api.service';
import { of, throwError } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';
import { UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { DiscordFactory } from '../../test/factories/discord.factory';

describe('DiscordApiService', () => {
  let service: DiscordApiService;
  let httpService: HttpService;

  const mockHttpService = {
    get: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        'discord.apiUrl': 'https://discord.com/api',
        'discord.timeout': 10000,
        'discord.retryAttempts': 3,
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscordApiService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<DiscordApiService>(DiscordApiService);
    httpService = module.get<HttpService>(HttpService);
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
      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining('/users/@me/guilds'),
        expect.objectContaining({
          headers: { Authorization: 'Bearer valid_token' },
        })
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
      };

      mockHttpService.get.mockReturnValue(throwError(() => mockError));

      // Act & Assert
      await expect(service.getUserGuilds('invalid_token'))
        .rejects
        .toThrow(UnauthorizedException);
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
      };

      mockHttpService.get.mockReturnValue(throwError(() => mockError));

      // Act & Assert
      await expect(service.getUserGuilds('valid_token'))
        .rejects
        .toThrow(ServiceUnavailableException);
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
      };

      mockHttpService.get.mockReturnValue(throwError(() => mockError));

      // Act & Assert
      await expect(service.getUserGuilds('valid_token'))
        .rejects
        .toThrow(ServiceUnavailableException);
    });

    it('should handle timeout errors', async () => {
      // Arrange
      mockHttpService.get.mockReturnValue(throwError(() => new Error('timeout')));

      // Act & Assert
      await expect(service.getUserGuilds('valid_token'))
        .rejects
        .toThrow();
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
      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining('/users/@me'),
        expect.objectContaining({
          headers: { Authorization: 'Bearer valid_token' },
        })
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
      };

      mockHttpService.get.mockReturnValue(throwError(() => mockError));

      // Act & Assert
      await expect(service.getUserProfile('valid_token'))
        .rejects
        .toThrow(ServiceUnavailableException);
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
      const result = await service.checkGuildPermissions('valid_token', 'guild123');

      // Assert
      expect(result).toEqual({
        isMember: true,
        permissions: ['ADMINISTRATOR', 'MANAGE_GUILD'],
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
      const result = await service.checkGuildPermissions('valid_token', 'guild123');

      // Assert
      expect(result).toEqual({ isMember: false, permissions: [] });
    });

    it('should return not a member on other errors', async () => {
      // Arrange
      mockHttpService.get.mockReturnValue(throwError(() => new Error('Network error')));

      // Act
      const result = await service.checkGuildPermissions('valid_token', 'guild123');

      // Assert
      expect(result).toEqual({ isMember: false, permissions: [] });
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
      const result = await service.checkGuildPermissions('valid_token', 'guild123');

      // Assert
      expect(result).toEqual({
        isMember: true,
        permissions: [],
      });
    });
  });
});

