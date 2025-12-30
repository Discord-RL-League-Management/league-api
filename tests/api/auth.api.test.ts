/**
 * Auth API Integration Tests
 *
 * Demonstrates contract verification using Axios.
 * Focus: API contracts, stateless tests, synthetic data.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { apiClient, API_BASE_URL } from '../setup/api-setup';
import {
  createTestUserWithToken,
  cleanupTestUser,
} from '../utils/test-helpers';
import { createInvalidJwtToken } from '../factories/token.factory';

// Check if API server is available before running tests
let isServerAvailable = false;

beforeAll(async () => {
  try {
    await apiClient.get('/health');
    isServerAvailable = true;
  } catch {
    console.warn(
      `API server not available at ${API_BASE_URL}. API tests will be skipped.`,
    );
    isServerAvailable = false;
  }
});

describe.skipIf(!isServerAvailable)('Auth API - Contract Verification', () => {
  let testUser: { id: string; username: string; email: string } | null = null;
  let testToken: string = '';

  beforeEach(async () => {
    // Create test user and get JWT token for each test
    const result = await createTestUserWithToken(apiClient);
    testUser = result.user;
    testToken = result.token;
  });

  afterEach(async () => {
    // Clean up test user - always attempt, catch errors
    try {
      if (testUser?.id) {
        await cleanupTestUser(apiClient, testUser.id);
      }
    } catch {
      // Ignore cleanup errors (resource may not exist or already deleted)
    }
    testUser = null;
  });

  describe('GET /auth/me - Get Current User', () => {
    it('should_return_current_user_data_when_authenticated', async () => {
      const response = await apiClient.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${testToken}`,
        },
      });

      expect(response.status).toBe(200);
      expect(testUser).not.toBeNull();
      expect(response.data).toHaveProperty('id', testUser!.id);
      expect(response.data).toHaveProperty('username', testUser!.username);
      expect(response.data).toHaveProperty('email', testUser!.email);
    });

    it('should_return_401_when_authentication_is_missing', async () => {
      const response = await apiClient.get('/auth/me', {
        validateStatus: (status) => status < 500,
      });

      expect(response.status).toBe(401);
    });

    it('should_return_401_when_token_is_invalid', async () => {
      const invalidToken = createInvalidJwtToken();

      const response = await apiClient.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${invalidToken}`,
        },
        validateStatus: (status) => status < 500,
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /auth/guilds - Get User Guilds', () => {
    it('should_return_user_guilds_when_authenticated', async () => {
      const response = await apiClient.get('/auth/guilds', {
        headers: {
          Authorization: `Bearer ${testToken}`,
        },
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it('should_return_401_when_authentication_is_missing', async () => {
      const response = await apiClient.get('/auth/guilds', {
        validateStatus: (status) => status < 500,
      });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /auth/logout - Logout User', () => {
    it('should_logout_user_and_return_200_status', async () => {
      const response = await apiClient.post(
        '/auth/logout',
        {},
        {
          headers: {
            Authorization: `Bearer ${testToken}`,
          },
        },
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message');
    });

    it('should_return_401_when_authentication_is_missing', async () => {
      const response = await apiClient.post(
        '/auth/logout',
        {},
        {
          validateStatus: (status) => status < 500,
        },
      );

      expect(response.status).toBe(401);
    });
  });

  describe('GET /auth/discord - OAuth Initiation', () => {
    it('should_redirect_to_discord_oauth_when_accessed', async () => {
      const response = await apiClient.get('/auth/discord', {
        maxRedirects: 0,
        validateStatus: (status) => status < 500,
      });

      expect([302, 307]).toContain(response.status);
      expect(response.headers.location).toBeDefined();
      expect(response.headers.location).toContain('discord.com');
    });
  });

  describe('GET /auth/discord/callback - OAuth Callback', () => {
    it('should_return_error_when_code_is_missing', async () => {
      const response = await apiClient.get('/auth/discord/callback', {
        maxRedirects: 0,
        validateStatus: (status) => status < 500,
      });

      expect([302, 307]).toContain(response.status);
      expect(response.headers.location).toBeDefined();
      expect(response.headers.location).toContain('error');
    });

    it('should_return_error_when_code_is_invalid', async () => {
      const response = await apiClient.get(
        '/auth/discord/callback?code=invalid_code',
        {
          maxRedirects: 0,
          validateStatus: (status) => status < 500,
        },
      );

      expect([302, 307]).toContain(response.status);
      expect(response.headers.location).toBeDefined();
      expect(response.headers.location).toContain('error');
    });
  });
});
