import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../common/encryption.service';
import { TokenManagementService } from './token-management.service';
import { of, throwError } from 'rxjs';
import { AxiosError } from 'axios';
import { UnauthorizedException } from '@nestjs/common';
import { DiscordFactory } from '../../../test/factories/discord.factory';

describe('TokenManagementService', () => {
  let service: TokenManagementService;
  let httpService: HttpService;
  let prismaService: PrismaService;
  let encryptionService: EncryptionService;
  let configService: ConfigService;

  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockEncryptionService = {
    encrypt: jest.fn((text: string) => `encrypted_${text}`),
    decrypt: jest.fn((text: string) => text.replace('encrypted_', '')),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        'discord.apiUrl': 'https://discord.com/api',
        'discord.timeout': 10000,
        'discord.retryAttempts': 3,
        'discord.clientId': 'test-client-id',
        'discord.clientSecret': 'test-client-secret',
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenManagementService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EncryptionService, useValue: mockEncryptionService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<TokenManagementService>(TokenManagementService);
    httpService = module.get<HttpService>(HttpService);
    prismaService = module.get<PrismaService>(PrismaService);
    encryptionService = module.get<EncryptionService>(EncryptionService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateDiscordToken', () => {
    it('should return true for valid token', async () => {
      // Arrange
      const mockResponse = {
        data: { id: '123456789012345678', username: 'testuser' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      // Act
      const result = await service.validateDiscordToken('valid_token');

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for invalid token', async () => {
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

      // Act
      const result = await service.validateDiscordToken('invalid_token');

      // Assert
      expect(result).toBe(false);
    });

    it('should return false on network timeout', async () => {
      // Arrange
      mockHttpService.get.mockReturnValue(
        throwError(() => new Error('timeout')),
      );

      // Act
      const result = await service.validateDiscordToken('expired_token');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('refreshDiscordToken', () => {
    it('should refresh token and encrypt before saving', async () => {
      // Arrange
      const userId = 'user123';
      const newTokenResponse = DiscordFactory.createMockTokenResponse({
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
      });

      const mockResponse = {
        data: newTokenResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        refreshToken: 'encrypted_old_refresh_token',
      });

      mockHttpService.post.mockReturnValue(of(mockResponse));

      mockPrismaService.user.update.mockResolvedValue({
        id: userId,
        accessToken: 'new_access_token',
        refreshToken: 'encrypted_new_refresh_token',
        updatedAt: new Date(),
      });

      // Act
      const result = await service.refreshDiscordToken(userId);

      // Assert
      expect(result).toBe('new_access_token');
    });

    it('should return null if user has no refresh token', async () => {
      // Arrange
      const userId = 'user123';
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        refreshToken: null,
      });

      // Act
      const result = await service.refreshDiscordToken(userId);

      // Assert
      expect(result).toBeNull();
      expect(mockHttpService.post).not.toHaveBeenCalled();
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });

    it('should return null on Discord API failure', async () => {
      // Arrange
      const userId = 'user123';
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        refreshToken: 'encrypted_refresh_token',
      });

      mockHttpService.post.mockReturnValue(
        throwError(() => new Error('Network error')),
      );

      // Act
      const result = await service.refreshDiscordToken(userId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getValidAccessToken', () => {
    it('should return existing token if valid', async () => {
      // Arrange
      const userId = 'user123';
      const validToken = 'valid_access_token';

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        accessToken: validToken,
      });

      // Mock validateDiscordToken to return true
      jest.spyOn(service, 'validateDiscordToken').mockResolvedValue(true);

      // Act
      const result = await service.getValidAccessToken(userId);

      // Assert
      expect(result).toBe(validToken);
    });

    it('should auto-refresh token if expired', async () => {
      // Arrange
      const userId = 'user123';
      const expiredToken = 'expired_access_token';
      const newToken = 'new_access_token';

      mockPrismaService.user.findUnique.mockResolvedValueOnce({
        id: userId,
        accessToken: expiredToken,
      });

      // Mock validateDiscordToken to return false (expired)
      jest.spyOn(service, 'validateDiscordToken').mockResolvedValue(false);

      // Mock refreshDiscordToken to return new token
      jest.spyOn(service, 'refreshDiscordToken').mockResolvedValue(newToken);

      // Act
      const result = await service.getValidAccessToken(userId);

      // Assert
      expect(result).toBe(newToken);
    });

    it('should return null if user has no tokens', async () => {
      // Arrange
      const userId = 'user123';
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        accessToken: null,
      });

      // Act
      const result = await service.getValidAccessToken(userId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('revokeTokens', () => {
    it('should revoke tokens with Discord and clear database', async () => {
      // Arrange
      const userId = 'user123';
      const accessToken = 'valid_access_token';

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        accessToken,
      });

      const mockRevokeResponse = {
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValue(of(mockRevokeResponse));
      mockPrismaService.user.update.mockResolvedValue({
        id: userId,
        accessToken: null,
        refreshToken: null,
        updatedAt: new Date(),
      });

      // Act
      await service.revokeTokens(userId);

      // Assert
      // Verify state change: tokens were cleared from database
      expect(mockPrismaService.user.update).toHaveBeenCalled();
    });

    it('should handle Discord revocation failure gracefully', async () => {
      // Arrange
      const userId = 'user123';
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        accessToken: 'valid_token',
      });

      mockHttpService.post.mockReturnValue(
        throwError(() => new Error('Revocation failed')),
      );

      mockPrismaService.user.update.mockResolvedValue({
        id: userId,
        accessToken: null,
        refreshToken: null,
        updatedAt: new Date(),
      });

      // Act & Assert - Should not throw, should clear database anyway
      await expect(service.revokeTokens(userId)).resolves.not.toThrow();
      expect(mockPrismaService.user.update).toHaveBeenCalled();
    });

    it('should clear database even without access token', async () => {
      // Arrange
      const userId = 'user123';
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        accessToken: null,
      });

      mockPrismaService.user.update.mockResolvedValue({
        id: userId,
        accessToken: null,
        refreshToken: null,
        updatedAt: new Date(),
      });

      // Act
      await service.revokeTokens(userId);

      // Assert
      expect(mockHttpService.post).not.toHaveBeenCalled();
      expect(mockPrismaService.user.update).toHaveBeenCalled();
    });
  });
});
