/**
 * Configuration Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import configuration from './configuration';

describe('configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('app configuration', () => {
    it('should_use_default_node_env_when_not_set', () => {
      delete process.env.NODE_ENV;
      const config = configuration();

      expect(config.app.nodeEnv).toBe('development');
    });

    it('should_use_provided_node_env_when_set', () => {
      process.env.NODE_ENV = 'production';
      const config = configuration();

      expect(config.app.nodeEnv).toBe('production');
    });

    it('should_use_default_port_when_not_set', () => {
      delete process.env.PORT;
      const config = configuration();

      expect(config.app.port).toBe(3000);
    });

    it('should_parse_port_when_provided', () => {
      process.env.PORT = '8080';
      const config = configuration();

      expect(config.app.port).toBe(8080);
    });
  });

  describe('database configuration', () => {
    it('should_use_empty_string_when_database_url_not_set', () => {
      delete process.env.DATABASE_URL;
      const config = configuration();

      expect(config.database.url).toBe('');
    });

    it('should_use_provided_database_url_when_set', () => {
      process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
      const config = configuration();

      expect(config.database.url).toBe('postgresql://localhost:5432/test');
    });
  });

  describe('auth configuration', () => {
    it('should_use_default_values_when_auth_env_vars_not_set', () => {
      delete process.env.BOT_API_KEY;
      delete process.env.API_KEY_SALT;
      delete process.env.JWT_EXPIRES_IN;
      delete process.env.NODE_ENV;
      const config = configuration();

      expect(config.auth.botApiKey).toBe('');
      expect(config.auth.apiKeySalt).toBe('');
      expect(config.auth.jwtExpiresIn).toBe('7d');
      expect(config.auth.cookieSecure).toBe(false);
      expect(config.auth.cookieSameSite).toBe('lax');
    });

    it('should_use_provided_auth_values_when_set', () => {
      process.env.BOT_API_KEY = 'test-key';
      process.env.API_KEY_SALT = 'test-salt';
      process.env.JWT_EXPIRES_IN = '30d';
      const config = configuration();

      expect(config.auth.botApiKey).toBe('test-key');
      expect(config.auth.apiKeySalt).toBe('test-salt');
      expect(config.auth.jwtExpiresIn).toBe('30d');
    });

    it('should_set_cookie_secure_to_true_when_in_production', () => {
      process.env.NODE_ENV = 'production';
      const config = configuration();

      expect(config.auth.cookieSecure).toBe(true);
    });

    it('should_set_cookie_secure_to_false_when_not_in_production', () => {
      process.env.NODE_ENV = 'development';
      const config = configuration();

      expect(config.auth.cookieSecure).toBe(false);
    });

    it('should_parse_cookie_same_site_when_provided', () => {
      process.env.COOKIE_SAME_SITE = 'strict';
      const config = configuration();

      expect(config.auth.cookieSameSite).toBe('strict');
    });

    it('should_calculate_cookie_max_age_correctly', () => {
      const config = configuration();

      expect(config.auth.cookieMaxAge).toBe(7 * 24 * 60 * 60 * 1000);
    });
  });

  describe('discord configuration', () => {
    it('should_use_default_discord_values_when_not_set', () => {
      delete process.env.DISCORD_CLIENT_ID;
      delete process.env.DISCORD_CLIENT_SECRET;
      delete process.env.DISCORD_CALLBACK_URL;
      delete process.env.DISCORD_BOT_TOKEN;
      delete process.env.DISCORD_TIMEOUT;
      delete process.env.DISCORD_RETRY_ATTEMPTS;
      delete process.env.DISCORD_API_URL;
      const config = configuration();

      expect(config.discord.clientId).toBe('');
      expect(config.discord.clientSecret).toBe('');
      expect(config.discord.callbackUrl).toBe('');
      expect(config.discord.botToken).toBe('');
      expect(config.discord.timeout).toBe(10000);
      expect(config.discord.retryAttempts).toBe(3);
      expect(config.discord.apiUrl).toBe('https://discord.com/api/v10');
    });

    it('should_parse_discord_timeout_when_provided', () => {
      process.env.DISCORD_TIMEOUT = '5000';
      const config = configuration();

      expect(config.discord.timeout).toBe(5000);
    });

    it('should_parse_discord_retry_attempts_when_provided', () => {
      process.env.DISCORD_RETRY_ATTEMPTS = '5';
      const config = configuration();

      expect(config.discord.retryAttempts).toBe(5);
    });
  });

  describe('oauth configuration', () => {
    it('should_include_frontend_url_in_redirect_uris_when_set', () => {
      process.env.FRONTEND_URL = 'https://example.com';
      delete process.env.OAUTH_REDIRECT_URIS;
      const config = configuration();

      expect(config.oauth.redirectUris).toContain('https://example.com');
      expect(config.oauth.redirectUris[0]).toBe('https://example.com');
    });

    it('should_parse_oauth_redirect_uris_when_provided', () => {
      process.env.OAUTH_REDIRECT_URIS =
        'https://example.com,https://app.example.com';
      delete process.env.FRONTEND_URL;
      const config = configuration();

      expect(config.oauth.redirectUris).toContain('https://example.com');
      expect(config.oauth.redirectUris).toContain('https://app.example.com');
    });

    it('should_combine_frontend_url_and_redirect_uris', () => {
      process.env.FRONTEND_URL = 'https://example.com';
      process.env.OAUTH_REDIRECT_URIS = 'https://app.example.com';
      const config = configuration();

      expect(config.oauth.redirectUris).toContain('https://example.com');
      expect(config.oauth.redirectUris).toContain('https://app.example.com');
      expect(config.oauth.redirectUris[0]).toBe('https://example.com');
    });

    it('should_not_duplicate_frontend_url_in_redirect_uris', () => {
      process.env.FRONTEND_URL = 'https://example.com';
      process.env.OAUTH_REDIRECT_URIS =
        'https://example.com,https://app.example.com';
      const config = configuration();

      const exampleCount = config.oauth.redirectUris.filter(
        (uri) => uri === 'https://example.com',
      ).length;
      expect(exampleCount).toBe(1);
    });

    it('should_filter_empty_redirect_uris', () => {
      delete process.env.FRONTEND_URL;
      process.env.OAUTH_REDIRECT_URIS =
        'https://example.com,,https://app.example.com,  ';
      const config = configuration();

      expect(config.oauth.redirectUris).not.toContain('');
      expect(config.oauth.redirectUris.length).toBe(2);
    });
  });

  describe('throttler configuration', () => {
    it('should_use_default_throttler_values_when_not_set', () => {
      delete process.env.THROTTLE_TTL;
      delete process.env.THROTTLE_LIMIT;
      const config = configuration();

      expect(config.throttler.ttl).toBe(60000);
      expect(config.throttler.limit).toBe(100);
    });

    it('should_parse_throttler_values_when_provided', () => {
      process.env.THROTTLE_TTL = '30000';
      process.env.THROTTLE_LIMIT = '50';
      const config = configuration();

      expect(config.throttler.ttl).toBe(30000);
      expect(config.throttler.limit).toBe(50);
    });
  });

  describe('systemAdmin configuration', () => {
    it('should_use_empty_array_when_system_admin_user_ids_not_set', () => {
      delete process.env.SYSTEM_ADMIN_USER_IDS;
      const config = configuration();

      expect(config.systemAdmin.userIds).toEqual([]);
    });

    it('should_parse_system_admin_user_ids_when_provided', () => {
      process.env.SYSTEM_ADMIN_USER_IDS = 'user-1,user-2,user-3';
      const config = configuration();

      expect(config.systemAdmin.userIds).toEqual([
        'user-1',
        'user-2',
        'user-3',
      ]);
    });

    it('should_filter_empty_user_ids', () => {
      process.env.SYSTEM_ADMIN_USER_IDS = 'user-1,,user-2,  ';
      const config = configuration();

      expect(config.systemAdmin.userIds).not.toContain('');
      expect(config.systemAdmin.userIds.length).toBe(2);
    });
  });
});
