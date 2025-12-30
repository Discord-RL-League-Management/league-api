/**
 * Guilds API Integration Tests
 *
 * Demonstrates contract verification using Axios.
 * Focus: API contracts, stateless tests, synthetic data.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { apiClient, API_BASE_URL } from '../setup/api-setup';
import { createGuildData } from '../factories/guild.factory';
import {
  createTestUserWithToken,
  cleanupTestUser,
} from '../utils/test-helpers';

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

describe.skipIf(!isServerAvailable)(
  'Guilds API - Contract Verification',
  () => {
    let testUser: any = null;
    let testToken: string = '';
    let testGuildId: string = '';

    beforeEach(async () => {
      // Create test user and get JWT token
      const userResult = await createTestUserWithToken(apiClient);
      testUser = userResult.user;
      testToken = userResult.token;

      // Create test guild via bot API
      const guildData = createGuildData({
        ownerId: testUser.id,
      });
      testGuildId = guildData.id!;

      await apiClient.post('/internal/guilds', guildData, {
        headers: {
          Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
        },
      });
    });

    afterEach(async () => {
      // Clean up test guild - always attempt, catch errors
      try {
        await apiClient.delete(`/internal/guilds/${testGuildId}`, {
          headers: {
            Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
          },
        });
      } catch {
        // Ignore cleanup errors (resource may not exist or already deleted)
      }

      // Clean up test user - always attempt, catch errors
      try {
        const userId = testUser?.id as string | undefined;
        await cleanupTestUser(apiClient, userId ?? null);
      } catch {
        // Ignore cleanup errors (resource may not exist or already deleted)
      }

      // Reset state for next test
      testGuildId = '';
      testUser = null;
    });

    describe('GET /api/guilds/:id - Get Guild Details', () => {
      it('should_return_200_with_guild_details_when_user_is_owner', async () => {
        // User is the owner of the guild

        const response = await apiClient.get(`/api/guilds/${testGuildId}`, {
          headers: {
            Authorization: `Bearer ${testToken}`,
          },
          validateStatus: (status) => status < 500,
        });

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('id', testGuildId);
        expect(response.data).toHaveProperty('name');
      });

      it('should_return_403_when_user_is_not_a_member', async () => {
        const otherUserResult = await createTestUserWithToken(apiClient);
        const otherToken = otherUserResult.token;

        const response = await apiClient.get(`/api/guilds/${testGuildId}`, {
          headers: {
            Authorization: `Bearer ${otherToken}`,
          },
          validateStatus: (status) => status < 500,
        });

        expect(response.status).toBe(403);

        // Cleanup
        const otherUserId = otherUserResult.user.id as string | undefined;
        await cleanupTestUser(apiClient, otherUserId ?? null);
      });

      it('should_return_401_when_authentication_is_missing', async () => {
        const response = await apiClient.get(`/api/guilds/${testGuildId}`, {
          validateStatus: (status) => status < 500,
        });

        expect(response.status).toBe(401);
      });

      it('should_return_404_when_guild_does_not_exist', async () => {
        const nonExistentGuildId = '999999999999999999';

        const response = await apiClient.get(
          `/api/guilds/${nonExistentGuildId}`,
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        expect(response.status).toBe(404);
      });
    });

    describe('GET /api/guilds/:id/settings - Get Guild Settings', () => {
      it('should_return_403_when_user_is_not_admin', async () => {
        // User is not an admin by default

        const response = await apiClient.get(
          `/api/guilds/${testGuildId}/settings`,
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // May return 403 (not admin) or 404 (not a member)
        expect([403, 404]).toContain(response.status);
      });

      it('should_return_401_when_authentication_is_missing', async () => {
        const response = await apiClient.get(
          `/api/guilds/${testGuildId}/settings`,
          {
            validateStatus: (status) => status < 500,
          },
        );

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/guilds/:id/channels - Get Guild Channels', () => {
      it('should_return_403_when_user_is_not_admin', async () => {
        // User is not an admin by default

        const response = await apiClient.get(
          `/api/guilds/${testGuildId}/channels`,
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // May return 403 (not admin) or 404 (not a member)
        expect([403, 404]).toContain(response.status);
      });

      it('should_return_401_when_authentication_is_missing', async () => {
        const response = await apiClient.get(
          `/api/guilds/${testGuildId}/channels`,
          {
            validateStatus: (status) => status < 500,
          },
        );

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/guilds/:id/roles - Get Guild Roles', () => {
      it('should_return_403_when_user_is_not_admin', async () => {
        // User is not an admin by default

        const response = await apiClient.get(
          `/api/guilds/${testGuildId}/roles`,
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // May return 403 (not admin) or 404 (not a member)
        expect([403, 404]).toContain(response.status);
      });

      it('should_return_401_when_authentication_is_missing', async () => {
        const response = await apiClient.get(
          `/api/guilds/${testGuildId}/roles`,
          {
            validateStatus: (status) => status < 500,
          },
        );

        expect(response.status).toBe(401);
      });
    });

    describe('PATCH /internal/guilds/:id/settings - Update Tracker Processing', () => {
      it('should_update_tracker_processing_enabled_to_false', async () => {
        const botApiKey = process.env.BOT_API_KEY || '';

        const updateResponse = await apiClient.patch(
          `/internal/guilds/${testGuildId}/settings`,
          {
            trackerProcessing: {
              enabled: false,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${botApiKey}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        expect(updateResponse.status).toBe(200);

        const getResponse = await apiClient.get(
          `/internal/guilds/${testGuildId}/settings`,
          {
            headers: {
              Authorization: `Bearer ${botApiKey}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        expect(getResponse.status).toBe(200);
        expect(getResponse.data).toHaveProperty('trackerProcessing');
        expect(getResponse.data.trackerProcessing).toHaveProperty('enabled');
        expect(getResponse.data.trackerProcessing.enabled).toBe(false);
      });

      it('should_update_tracker_processing_enabled_to_true', async () => {
        const botApiKey = process.env.BOT_API_KEY || '';

        const updateResponse = await apiClient.patch(
          `/internal/guilds/${testGuildId}/settings`,
          {
            trackerProcessing: {
              enabled: true,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${botApiKey}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        expect(updateResponse.status).toBe(200);

        const getResponse = await apiClient.get(
          `/internal/guilds/${testGuildId}/settings`,
          {
            headers: {
              Authorization: `Bearer ${botApiKey}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        expect(getResponse.status).toBe(200);
        expect(getResponse.data).toHaveProperty('trackerProcessing');
        expect(getResponse.data.trackerProcessing).toHaveProperty('enabled');
        expect(getResponse.data.trackerProcessing.enabled).toBe(true);
      });

      it('should_return_tracker_processing_in_get_settings', async () => {
        const botApiKey = process.env.BOT_API_KEY || '';

        const response = await apiClient.get(
          `/internal/guilds/${testGuildId}/settings`,
          {
            headers: {
              Authorization: `Bearer ${botApiKey}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('trackerProcessing');
        expect(response.data.trackerProcessing).toBeDefined();
        expect(response.data.trackerProcessing).toHaveProperty('enabled');
        expect(typeof response.data.trackerProcessing.enabled).toBe('boolean');
      });

      it('should_validate_tracker_processing_enabled_must_be_boolean', async () => {
        const botApiKey = process.env.BOT_API_KEY || '';

        const response = await apiClient.patch(
          `/internal/guilds/${testGuildId}/settings`,
          {
            trackerProcessing: {
              enabled: 'not a boolean' as any,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${botApiKey}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        expect(response.status).toBe(400);
      });
    });
  },
);
