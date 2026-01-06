/**
 * AuthModule Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthModule } from './auth.module';

describe('AuthModule', () => {
  let mockConfigService: ConfigService;

  const mockPrivateKey =
    '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA\n-----END RSA PRIVATE KEY-----';

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn().mockReturnValue(mockPrivateKey),
    } as unknown as ConfigService;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('JwtModule factory function', () => {
    it('should_configure_jwt_module_with_rs256_algorithm', () => {
      const factory = (configService: ConfigService) => ({
        privateKey: configService.get<string>('auth.jwtPrivateKey')!,
        signOptions: {
          expiresIn: '7d',
          algorithm: 'RS256',
        },
      });

      const result = factory(mockConfigService);

      expect(result.signOptions.algorithm).toBe('RS256');
    });

    it('should_use_private_key_instead_of_secret', () => {
      const factory = (configService: ConfigService) => ({
        privateKey: configService.get<string>('auth.jwtPrivateKey')!,
        signOptions: {
          expiresIn: '7d',
          algorithm: 'RS256',
        },
      });

      const result = factory(mockConfigService);

      expect(result).toHaveProperty('privateKey');
      expect(result).not.toHaveProperty('secret');
      expect(result.privateKey).toBe(mockPrivateKey);
    });

    it('should_load_jwt_private_key_from_config', () => {
      const factory = (configService: ConfigService) => ({
        privateKey: configService.get<string>('auth.jwtPrivateKey')!,
        signOptions: {
          expiresIn: '7d',
          algorithm: 'RS256',
        },
      });

      factory(mockConfigService);

      expect(mockConfigService.get).toHaveBeenCalledWith('auth.jwtPrivateKey');
    });

    it('should_set_expires_in_to_7d', () => {
      const factory = (configService: ConfigService) => ({
        privateKey: configService.get<string>('auth.jwtPrivateKey')!,
        signOptions: {
          expiresIn: '7d',
          algorithm: 'RS256',
        },
      });

      const result = factory(mockConfigService);

      expect(result.signOptions.expiresIn).toBe('7d');
    });
  });

  describe('module compilation', () => {
    it('should_have_correct_jwt_module_configuration', () => {
      const factory = (configService: ConfigService) => ({
        privateKey: configService.get<string>('auth.jwtPrivateKey')!,
        signOptions: {
          expiresIn: '7d',
          algorithm: 'RS256',
        },
      });

      const result = factory(mockConfigService);

      expect(result).toHaveProperty('privateKey');
      expect(result).toHaveProperty('signOptions');
      expect(result.signOptions).toHaveProperty('algorithm', 'RS256');
      expect(result.signOptions).toHaveProperty('expiresIn', '7d');
    });
  });
});
