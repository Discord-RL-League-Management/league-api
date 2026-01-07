/**
 * Configuration Unit Tests
 *
 * Tests verify that the application fails to start when required JWT keys are missing.
 * Aligned with ISO/IEC/IEEE 29119 standards and TQA Quality Gates.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { configurationSchema } from '@/config/configuration.schema';

describe('Configuration', () => {
  const mockPrivateKey =
    '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----';
  const mockPublicKey =
    '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A\n-----END PUBLIC KEY-----';

  const baseEnv = {
    NODE_ENV: 'test',
    PORT: '3000',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    BOT_API_KEY: 'test-bot-api-key',
    API_KEY_SALT: 'test-salt',
    ENCRYPTION_KEY: 'test-encryption-key-hex-string-32-chars-long',
    DISCORD_CLIENT_ID: 'test-client-id',
    DISCORD_CLIENT_SECRET: 'test-client-secret',
    DISCORD_CALLBACK_URL: 'http://localhost:3000/auth/callback',
    DISCORD_BOT_TOKEN: 'test-bot-token',
    FRONTEND_URL: 'http://localhost:3000',
    REDIS_PASSWORD: 'test-redis-password',
    DECODO_API_KEY: 'test-decodo-key',
    DECODO_PROXY_USERNAME: 'test-proxy-user',
    DECODO_PROXY_PASSWORD: 'test-proxy-pass',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('JWT Key Validation', () => {
    it('should_require_jwt_private_key_in_schema', () => {
      const schema = configurationSchema;
      const envWithoutPrivateKey = {
        ...baseEnv,
        JWT_PUBLIC_KEY: mockPublicKey,
      };

      const { error } = schema.validate(envWithoutPrivateKey, {
        abortEarly: false,
      });

      expect(error).toBeDefined();
      expect(
        error?.details.some((d) => d.path.includes('JWT_PRIVATE_KEY')),
      ).toBe(true);
    });

    it('should_require_jwt_public_key_in_schema', () => {
      const schema = configurationSchema;
      const envWithoutPublicKey = {
        ...baseEnv,
        JWT_PRIVATE_KEY: mockPrivateKey,
      };

      const { error } = schema.validate(envWithoutPublicKey, {
        abortEarly: false,
      });

      expect(error).toBeDefined();
      expect(
        error?.details.some((d) => d.path.includes('JWT_PUBLIC_KEY')),
      ).toBe(true);
    });

    it('should_validate_jwt_private_key_format', () => {
      const schema = configurationSchema;
      const envWithInvalidPrivateKey = {
        ...baseEnv,
        JWT_PRIVATE_KEY: 'invalid-key-format',
        JWT_PUBLIC_KEY: mockPublicKey,
      };

      const { error } = schema.validate(envWithInvalidPrivateKey, {
        abortEarly: false,
      });

      expect(error).toBeDefined();
      expect(
        error?.details.some(
          (d) =>
            d.path.includes('JWT_PRIVATE_KEY') &&
            d.type === 'string.pattern.base',
        ),
      ).toBe(true);
    });

    it('should_validate_jwt_public_key_format', () => {
      const schema = configurationSchema;
      const envWithInvalidPublicKey = {
        ...baseEnv,
        JWT_PRIVATE_KEY: mockPrivateKey,
        JWT_PUBLIC_KEY: 'invalid-key-format',
      };

      const { error } = schema.validate(envWithInvalidPublicKey, {
        abortEarly: false,
      });

      expect(error).toBeDefined();
      expect(
        error?.details.some(
          (d) =>
            d.path.includes('JWT_PUBLIC_KEY') &&
            d.type === 'string.pattern.base',
        ),
      ).toBe(true);
    });

    it('should_accept_valid_jwt_keys', () => {
      const schema = configurationSchema;
      const envWithValidKeys = {
        ...baseEnv,
        JWT_PRIVATE_KEY: mockPrivateKey,
        JWT_PUBLIC_KEY: mockPublicKey,
      };

      const { error } = schema.validate(envWithValidKeys, {
        abortEarly: false,
      });

      expect(error).toBeUndefined();
    });

    it('should_validate_that_schema_requires_jwt_keys_for_startup', () => {
      // This test documents that schema validation will prevent startup
      // The actual startup failure is verified manually by running: npm start without JWT keys
      const envWithoutKeys = { ...baseEnv };

      const { error } = configurationSchema.validate(envWithoutKeys, {
        abortEarly: false,
      });

      expect(error).toBeDefined();
      expect(
        error?.details.some((d) => d.path.includes('JWT_PRIVATE_KEY')),
      ).toBe(true);
      expect(
        error?.details.some((d) => d.path.includes('JWT_PUBLIC_KEY')),
      ).toBe(true);
    });
  });
});
