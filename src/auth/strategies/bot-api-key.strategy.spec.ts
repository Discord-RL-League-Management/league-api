import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BotApiKeyStrategy } from './bot-api-key.strategy';
import { Request } from 'express';

describe('BotApiKeyStrategy', () => {
  let strategy: BotApiKeyStrategy;
  let configService: jest.Mocked<ConfigService>;

  const validBotApiKey = 'test-api-key-12345';
  const validApiKeySalt = 'test-salt-67890';

  const createMockConfigService = (botApiKey?: string, apiKeySalt?: string) => {
    const mockGet = jest.fn((key: string) => {
      if (key === 'auth.botApiKey') {
        return botApiKey;
      }
      if (key === 'auth.apiKeySalt') {
        return apiKeySalt;
      }
      return undefined;
    });

    return {
      get: mockGet,
    } as unknown as jest.Mocked<ConfigService>;
  };

  describe('constructor', () => {
    it('should throw error when BOT_API_KEY is missing', () => {
      // Arrange
      configService = createMockConfigService(undefined, validApiKeySalt);

      // Act & Assert
      expect(() => {
        new BotApiKeyStrategy(configService);
      }).toThrow('BOT_API_KEY environment variable is required');
    });

    it('should throw error when API_KEY_SALT is missing', () => {
      // Arrange
      configService = createMockConfigService(validBotApiKey, undefined);

      // Act & Assert
      expect(() => {
        new BotApiKeyStrategy(configService);
      }).toThrow('API_KEY_SALT environment variable is required');
    });

    it('should throw error when API_KEY_SALT is empty string', () => {
      // Arrange
      configService = createMockConfigService(validBotApiKey, '');

      // Act & Assert
      expect(() => {
        new BotApiKeyStrategy(configService);
      }).toThrow('API_KEY_SALT environment variable is required');
    });

    it('should successfully instantiate when both are provided', () => {
      // Arrange
      configService = createMockConfigService(validBotApiKey, validApiKeySalt);

      // Act
      const instance = new BotApiKeyStrategy(configService);

      // Assert
      expect(instance).toBeInstanceOf(BotApiKeyStrategy);
    });
  });

  describe('hashApiKey', () => {
    beforeEach(async () => {
      configService = createMockConfigService(validBotApiKey, validApiKeySalt);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          BotApiKeyStrategy,
          {
            provide: ConfigService,
            useValue: configService,
          },
        ],
      }).compile();

      strategy = module.get<BotApiKeyStrategy>(BotApiKeyStrategy);
    });

    it('should produce consistent hash for same input', () => {
      // Arrange
      const key = 'test-key';

      // Act
      const hash1 = (strategy as any).hashApiKey(key);
      const hash2 = (strategy as any).hashApiKey(key);

      // Assert
      expect(hash1).toBe(hash2);
      expect(hash1).toBeTruthy();
      expect(typeof hash1).toBe('string');
    });

    it('should produce different hashes for different salts', async () => {
      // Arrange
      const key = 'test-key';
      const salt1 = 'salt-1';
      const salt2 = 'salt-2';

      const configService1 = createMockConfigService(validBotApiKey, salt1);
      const configService2 = createMockConfigService(validBotApiKey, salt2);

      const module1: TestingModule = await Test.createTestingModule({
        providers: [
          BotApiKeyStrategy,
          {
            provide: ConfigService,
            useValue: configService1,
          },
        ],
      }).compile();

      const module2: TestingModule = await Test.createTestingModule({
        providers: [
          BotApiKeyStrategy,
          {
            provide: ConfigService,
            useValue: configService2,
          },
        ],
      }).compile();

      const strategy1 = module1.get<BotApiKeyStrategy>(BotApiKeyStrategy);
      const strategy2 = module2.get<BotApiKeyStrategy>(BotApiKeyStrategy);

      // Act
      const hash1 = (strategy1 as any).hashApiKey(key);
      const hash2 = (strategy2 as any).hashApiKey(key);

      // Assert
      expect(hash1).not.toBe(hash2);
    });

    it('should throw error if salt is missing', () => {
      // Arrange
      configService.get.mockImplementation((configKey: string) => {
        if (configKey === 'auth.botApiKey') return validBotApiKey;
        if (configKey === 'auth.apiKeySalt') return undefined;
        return undefined;
      });

      // Act & Assert
      expect(() => {
        (strategy as any).hashApiKey('test-key');
      }).toThrow('API_KEY_SALT environment variable is required');
    });
  });

  describe('validate', () => {
    beforeEach(async () => {
      configService = createMockConfigService(validBotApiKey, validApiKeySalt);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          BotApiKeyStrategy,
          {
            provide: ConfigService,
            useValue: configService,
          },
        ],
      }).compile();

      strategy = module.get<BotApiKeyStrategy>(BotApiKeyStrategy);
    });

    it('should return { type: "bot" } with valid API key', async () => {
      // Arrange
      const mockRequest = {
        headers: {
          authorization: `Bearer ${validBotApiKey}`,
        },
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-user-agent'),
      } as unknown as Request;

      // Act
      const result = await strategy.validate(mockRequest);

      // Assert
      expect(result).toEqual({ type: 'bot' });
    });

    it('should throw UnauthorizedException with invalid API key', async () => {
      // Arrange
      const invalidApiKey = 'invalid-key';
      const mockRequest = {
        headers: {
          authorization: `Bearer ${invalidApiKey}`,
        },
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-user-agent'),
      } as unknown as Request;

      // Act & Assert
      await expect(strategy.validate(mockRequest)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(mockRequest)).rejects.toThrow(
        'Invalid API key',
      );
    });

    it('should throw UnauthorizedException with missing authorization header', async () => {
      // Arrange
      const mockRequest = {
        headers: {},
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-user-agent'),
      } as unknown as Request;

      // Act & Assert
      await expect(strategy.validate(mockRequest)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(mockRequest)).rejects.toThrow(
        'Missing authorization header',
      );
    });

    it('should throw UnauthorizedException with malformed authorization header', async () => {
      // Arrange
      const mockRequest = {
        headers: {
          authorization: 'InvalidFormat token',
        },
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-user-agent'),
      } as unknown as Request;

      // Act & Assert
      await expect(strategy.validate(mockRequest)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(mockRequest)).rejects.toThrow(
        'Missing authorization header',
      );
    });

    it('should throw UnauthorizedException when authorization header does not start with Bearer', async () => {
      // Arrange
      const mockRequest = {
        headers: {
          authorization: 'Token some-token',
        },
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-user-agent'),
      } as unknown as Request;

      // Act & Assert
      await expect(strategy.validate(mockRequest)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(mockRequest)).rejects.toThrow(
        'Missing authorization header',
      );
    });
  });
});
