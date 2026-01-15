/**
 * BotApiKeyStrategy Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BotApiKeyStrategy } from './bot-api-key.strategy';
import type { Request } from 'express';

describe('BotApiKeyStrategy', () => {
  let strategy: BotApiKeyStrategy;
  let mockConfigService: ConfigService;

  const mockBotApiKey = 'test-bot-api-key';
  const mockApiKeySalt = 'test-salt-value';

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'auth.botApiKey') return mockBotApiKey;
        if (key === 'auth.apiKeySalt') return mockApiKeySalt;
        return undefined;
      }),
    } as unknown as ConfigService;

    strategy = new BotApiKeyStrategy(mockConfigService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should_initialize_when_valid_config_provided', () => {
      const configService = {
        get: vi.fn().mockImplementation((key: string) => {
          if (key === 'auth.botApiKey') return mockBotApiKey;
          if (key === 'auth.apiKeySalt') return mockApiKeySalt;
          return undefined;
        }),
      } as unknown as ConfigService;

      const newStrategy = new BotApiKeyStrategy(configService);

      expect(newStrategy).toBeInstanceOf(BotApiKeyStrategy);
    });

    it('should_throw_error_when_bot_api_key_missing', () => {
      const configService = {
        get: vi.fn().mockImplementation((key: string) => {
          if (key === 'auth.botApiKey') return undefined;
          if (key === 'auth.apiKeySalt') return mockApiKeySalt;
          return undefined;
        }),
      } as unknown as ConfigService;

      expect(() => new BotApiKeyStrategy(configService)).toThrow(
        'BOT_API_KEY environment variable is required',
      );
    });

    it('should_throw_error_when_api_key_salt_missing', () => {
      const configService = {
        get: vi.fn().mockImplementation((key: string) => {
          if (key === 'auth.botApiKey') return mockBotApiKey;
          if (key === 'auth.apiKeySalt') return undefined;
          return undefined;
        }),
      } as unknown as ConfigService;

      expect(() => new BotApiKeyStrategy(configService)).toThrow(
        'API_KEY_SALT environment variable is required',
      );
    });

    it('should_call_config_service_for_bot_api_key', () => {
      const configService = {
        get: vi.fn().mockImplementation((key: string) => {
          if (key === 'auth.botApiKey') return mockBotApiKey;
          if (key === 'auth.apiKeySalt') return mockApiKeySalt;
          return undefined;
        }),
      } as unknown as ConfigService;

      new BotApiKeyStrategy(configService);

      expect(configService.get).toHaveBeenCalledWith('auth.botApiKey');
    });

    it('should_call_config_service_for_api_key_salt', () => {
      const configService = {
        get: vi.fn().mockImplementation((key: string) => {
          if (key === 'auth.botApiKey') return mockBotApiKey;
          if (key === 'auth.apiKeySalt') return mockApiKeySalt;
          return undefined;
        }),
      } as unknown as ConfigService;

      new BotApiKeyStrategy(configService);

      expect(configService.get).toHaveBeenCalledWith('auth.apiKeySalt');
    });
  });

  describe('validate', () => {
    it('should_return_bot_type_when_valid_api_key_provided', () => {
      const mockRequest = {
        headers: {
          authorization: `Bearer ${mockBotApiKey}`,
        },
        ip: '127.0.0.1',
        get: vi.fn().mockReturnValue('test-user-agent'),
      } as unknown as Request;

      const result = strategy.validate(mockRequest);

      expect(result).toEqual({ type: 'bot' });
    });

    it('should_throw_UnauthorizedException_when_authorization_header_missing', () => {
      const mockRequest = {
        headers: {},
        ip: '127.0.0.1',
        get: vi.fn().mockReturnValue('test-user-agent'),
      } as unknown as Request;

      expect(() => strategy.validate(mockRequest)).toThrow(
        UnauthorizedException,
      );
      expect(() => strategy.validate(mockRequest)).toThrow(
        'Missing authorization header',
      );
    });

    it('should_throw_UnauthorizedException_when_authorization_header_does_not_start_with_bearer', () => {
      const mockRequest = {
        headers: {
          authorization: 'InvalidFormat token',
        },
        ip: '127.0.0.1',
        get: vi.fn().mockReturnValue('test-user-agent'),
      } as unknown as Request;

      expect(() => strategy.validate(mockRequest)).toThrow(
        UnauthorizedException,
      );
      expect(() => strategy.validate(mockRequest)).toThrow(
        'Missing authorization header',
      );
    });

    it('should_throw_UnauthorizedException_when_api_key_does_not_match', () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer wrong-api-key',
        },
        ip: '127.0.0.1',
        get: vi.fn().mockReturnValue('test-user-agent'),
      } as unknown as Request;

      expect(() => strategy.validate(mockRequest)).toThrow(
        UnauthorizedException,
      );
      expect(() => strategy.validate(mockRequest)).toThrow('Invalid API key');
    });

    it('should_throw_UnauthorizedException_when_bearer_prefix_has_no_token', () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer ',
        },
        ip: '127.0.0.1',
        get: vi.fn().mockReturnValue('test-user-agent'),
      } as unknown as Request;

      expect(() => strategy.validate(mockRequest)).toThrow(
        UnauthorizedException,
      );
    });
  });
});
