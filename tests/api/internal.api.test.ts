/**
 * Internal API Integration Tests (Bot API)
 *
 * Demonstrates contract verification using Axios.
 * Focus: API contracts, stateless tests, synthetic data.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { apiClient, API_BASE_URL } from '../setup/api-setup';
import { createUserData } from '../factories/user.factory';
import { createLeagueData } from '../factories/league.factory';
import { createGuildData } from '../factories/guild.factory';
import {
  generateTestId,
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
  'Internal API - Contract Verification',
  () => {
    const testId = generateTestId();
    let testUser: any = null;
    let testGuildId: string = '';
    let testLeagueId: string = '';

    beforeEach(async () => {
      // Create test user via bot API
      const userData = createUserData();
      const userResponse = await apiClient.post('/internal/users', userData, {
        headers: {
          Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
        },
      });
      testUser = userResponse.data;

      // Create test guild via bot API
      const guildData = createGuildData({
        ownerId: testUser.id,
      });
      testGuildId = guildData.id!;

      const guildResponse = await apiClient.post(
        '/internal/guilds',
        guildData,
        {
          headers: {
            Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
          },
        },
      );
      // testGuild assignment kept for potential future use
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _testGuild = guildResponse.data;

      // Create test league via bot API
      const leagueData = createLeagueData({
        guildId: testGuildId,
        createdBy: testUser.id,
      });
      testLeagueId = leagueData.id!;

      const leagueResponse = await apiClient.post(
        '/internal/leagues',
        leagueData,
        {
          headers: {
            Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
          },
        },
      );
      // testLeague assignment kept for potential future use
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _testLeague = leagueResponse.data;
    });

    afterEach(async () => {
      // Clean up test league - always attempt, catch errors
      try {
        await apiClient.delete(`/internal/leagues/${testLeagueId}`, {
          headers: {
            Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
          },
        });
      } catch {
        // Ignore cleanup errors (resource may not exist or already deleted)
      }

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
        await cleanupTestUser(apiClient, testUser?.id);
      } catch {
        // Ignore cleanup errors (resource may not exist or already deleted)
      }

      // Reset state for next test
      testUser = null;
      testGuildId = '';
      testLeagueId = '';
    });

    describe('GET /internal/health - Bot Health Check', () => {
      it('should_return_health_status_when_authenticated_with_bot_key', async () => {
        const response = await apiClient.get('/internal/health', {
          headers: {
            Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
          },
        });

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('status', 'ok');
        expect(response.data).toHaveProperty('message');
        expect(response.data).toHaveProperty('timestamp');
      });

      it('should_return_401_when_authentication_is_missing', async () => {
        const response = await apiClient.get('/internal/health', {
          validateStatus: (status) => status < 500,
        });

        expect(response.status).toBe(401);
      });

      it('should_return_401_when_jwt_token_is_used_instead_of_bot_key', async () => {
        const userResult = await createTestUserWithToken(apiClient);
        const jwtToken = userResult.token;

        const response = await apiClient.get('/internal/health', {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
          },
          validateStatus: (status) => status < 500,
        });

        expect(response.status).toBe(401);

        // Cleanup
        await cleanupTestUser(apiClient, userResult.user.id);
      });
    });

    describe('GET /internal/users - List Users (Bot API)', () => {
      it('should_return_users_list_when_authenticated_with_bot_key', async () => {
        const response = await apiClient.get('/internal/users', {
          headers: {
            Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
          },
        });

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
      });

      it('should_return_401_when_authentication_is_missing', async () => {
        const response = await apiClient.get('/internal/users', {
          validateStatus: (status) => status < 500,
        });

        expect(response.status).toBe(401);
      });
    });

    describe('GET /internal/users/:id - Get User (Bot API)', () => {
      it('should_return_user_details_when_user_exists', async () => {
        const response = await apiClient.get(`/internal/users/${testUser.id}`, {
          headers: {
            Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
          },
        });

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('id', testUser.id);
        expect(response.data).toHaveProperty('username', testUser.username);
      });

      it('should_return_404_when_user_does_not_exist', async () => {
        const nonExistentUserId = `user_${testId}_nonexistent`;

        const response = await apiClient.get(
          `/internal/users/${nonExistentUserId}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        expect(response.status).toBe(404);
      });
    });

    describe('POST /internal/users - Create User (Bot API)', () => {
      it('should_create_user_and_return_201_status', async () => {
        const userData = createUserData({
          username: `newuser_${testId}`,
          email: `newuser_${testId}@example.com`,
        });

        const response = await apiClient.post('/internal/users', userData, {
          headers: {
            Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
          },
        });

        expect(response.status).toBe(201);
        expect(response.data).toHaveProperty('id');
        expect(response.data).toHaveProperty('username', userData.username);
        expect(response.data).toHaveProperty('email', userData.email);

        // Cleanup - always attempt, catch errors
        try {
          await cleanupTestUser(apiClient, response.data.id);
        } catch {
          // Ignore cleanup errors
        }
      });

      it('should_return_400_when_required_fields_are_missing', async () => {
        const invalidData = {};

        const response = await apiClient.post('/internal/users', invalidData, {
          headers: {
            Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
          },
          validateStatus: (status) => status < 500,
        });

        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.status).toBeLessThan(500);
      });
    });

    describe('PATCH /internal/users/:id - Update User (Bot API)', () => {
      it('should_update_user_and_return_200_status', async () => {
        const updateData = {
          username: `updated_${testUser.username}`,
        };

        const response = await apiClient.patch(
          `/internal/users/${testUser.id}`,
          updateData,
          {
            headers: {
              Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
            },
          },
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('id', testUser.id);
        expect(response.data).toHaveProperty('username', updateData.username);
      });

      it('should_return_404_when_user_does_not_exist', async () => {
        const nonExistentUserId = `user_${testId}_nonexistent`;
        const updateData = {
          username: 'updated_username',
        };

        const response = await apiClient.patch(
          `/internal/users/${nonExistentUserId}`,
          updateData,
          {
            headers: {
              Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        expect(response.status).toBe(404);
      });
    });

    describe('DELETE /internal/users/:id - Delete User (Bot API)', () => {
      it('should_delete_user_and_return_200_status', async () => {
        const userData = createUserData({
          username: `deleteuser_${testId}`,
        });
        const createResponse = await apiClient.post(
          '/internal/users',
          userData,
          {
            headers: {
              Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
            },
          },
        );
        const userIdToDelete = createResponse.data.id;

        const response = await apiClient.delete(
          `/internal/users/${userIdToDelete}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
            },
          },
        );

        expect(response.status).toBe(200);
      });

      it('should_return_404_when_user_does_not_exist', async () => {
        const nonExistentUserId = `user_${testId}_nonexistent`;

        const response = await apiClient.delete(
          `/internal/users/${nonExistentUserId}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        expect(response.status).toBe(404);
      });
    });

    describe('GET /internal/leagues/:id - Get League (Bot API)', () => {
      it('should_return_league_details_when_league_exists', async () => {
        const response = await apiClient.get(
          `/internal/leagues/${testLeagueId}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
            },
          },
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('id', testLeagueId);
        expect(response.data).toHaveProperty('name');
      });

      it('should_return_404_when_league_does_not_exist', async () => {
        const nonExistentLeagueId = 'clx999999999999999999';

        const response = await apiClient.get(
          `/internal/leagues/${nonExistentLeagueId}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        expect(response.status).toBe(404);
      });
    });

    describe('POST /internal/leagues - Create League (Bot API)', () => {
      it('should_create_league_and_return_201_status', async () => {
        const leagueData = createLeagueData({
          guildId: testGuildId,
          name: `New League ${testId}`,
          createdBy: testUser.id,
        });

        const response = await apiClient.post('/internal/leagues', leagueData, {
          headers: {
            Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
          },
        });

        expect(response.status).toBe(201);
        expect(response.data).toHaveProperty('id');
        expect(response.data).toHaveProperty('name', leagueData.name);

        // Cleanup - always attempt, catch errors
        try {
          await apiClient.delete(`/internal/leagues/${response.data.id}`, {
            headers: {
              Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
            },
          });
        } catch {
          // Ignore cleanup errors
        }
      });

      it('should_return_400_when_required_fields_are_missing', async () => {
        const invalidData = {};

        const response = await apiClient.post(
          '/internal/leagues',
          invalidData,
          {
            headers: {
              Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.status).toBeLessThan(500);
      });
    });

    describe('POST /internal/trackers/schedule - Schedule Tracker Processing', () => {
      it('should_create_schedule_and_return_201_when_data_is_valid', async () => {
        const futureDate = new Date(Date.now() + 86400000); // +1 day
        const scheduleData = {
          guildId: testGuildId,
          scheduledAt: futureDate.toISOString(),
          createdBy: testUser.id,
          metadata: { reason: 'Season 15 start' },
        };

        const response = await apiClient.post(
          '/internal/trackers/schedule',
          scheduleData,
          {
            headers: {
              Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        expect(response.status).toBe(201);
        expect(response.data).toMatchObject({
          id: expect.any(String),
          guildId: testGuildId,
          scheduledAt: expect.any(String),
          createdBy: testUser.id,
          status: 'PENDING',
        });

        // Cleanup - cancel the schedule
        try {
          await apiClient.post(
            `/internal/trackers/schedule/${response.data.id}/cancel`,
            {},
            {
              headers: {
                Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
              },
            },
          );
        } catch {
          // Ignore cleanup errors
        }
      });

      it('should_return_400_when_date_is_in_past', async () => {
        const pastDate = new Date(Date.now() - 86400000); // -1 day (past)
        const scheduleData = {
          guildId: testGuildId,
          scheduledAt: pastDate.toISOString(),
          createdBy: testUser.id,
        };

        const response = await apiClient.post(
          '/internal/trackers/schedule',
          scheduleData,
          {
            headers: {
              Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        expect(response.status).toBe(400);
      });

      it('should_return_400_when_required_fields_are_missing', async () => {
        const invalidData = {};

        const response = await apiClient.post(
          '/internal/trackers/schedule',
          invalidData,
          {
            headers: {
              Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.status).toBeLessThan(500);
      });

      it('should_return_404_when_guild_not_found', async () => {
        const futureDate = new Date(Date.now() + 86400000);
        const scheduleData = {
          guildId: '999999999999999999',
          scheduledAt: futureDate.toISOString(),
          createdBy: testUser.id,
        };

        const response = await apiClient.post(
          '/internal/trackers/schedule',
          scheduleData,
          {
            headers: {
              Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        expect(response.status).toBe(404);
      });

      it('should_return_401_when_authentication_is_missing', async () => {
        const futureDate = new Date(Date.now() + 86400000);
        const scheduleData = {
          guildId: testGuildId,
          scheduledAt: futureDate.toISOString(),
          createdBy: testUser.id,
        };

        const response = await apiClient.post(
          '/internal/trackers/schedule',
          scheduleData,
          {
            validateStatus: (status) => status < 500,
          },
        );

        expect(response.status).toBe(401);
      });
    });

    describe('GET /internal/trackers/schedule/guild/:guildId - Get Schedules for Guild', () => {
      let testScheduleId: string = '';

      beforeEach(async () => {
        // Create a test schedule for these tests
        const futureDate = new Date(Date.now() + 86400000);
        const scheduleData = {
          guildId: testGuildId,
          scheduledAt: futureDate.toISOString(),
          createdBy: testUser.id,
        };
        try {
          const createResponse = await apiClient.post(
            '/internal/trackers/schedule',
            scheduleData,
            {
              headers: {
                Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
              },
            },
          );
          testScheduleId = createResponse.data.id;
        } catch {
          // Ignore setup errors
        }
      });

      afterEach(async () => {
        // Cleanup test schedule
        if (testScheduleId) {
          try {
            await apiClient.post(
              `/internal/trackers/schedule/${testScheduleId}/cancel`,
              {},
              {
                headers: {
                  Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
                },
              },
            );
          } catch {
            // Ignore cleanup errors
          }
          testScheduleId = '';
        }
      });

      it('should_return_schedules_when_guild_exists', async () => {
        const response = await apiClient.get(
          `/internal/trackers/schedule/guild/${testGuildId}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
        expect(response.data.length).toBeGreaterThan(0);
      });

      it('should_filter_by_status_when_query_param_provided', async () => {
        const status = 'PENDING';

        const response = await apiClient.get(
          `/internal/trackers/schedule/guild/${testGuildId}?status=${status}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
        // All returned schedules should have the requested status
        response.data.forEach((schedule: any) => {
          expect(schedule.status).toBe(status);
        });
      });

      it('should_filter_by_includeCompleted_when_query_param_provided', async () => {
        const includeCompleted = 'false';

        const response = await apiClient.get(
          `/internal/trackers/schedule/guild/${testGuildId}?includeCompleted=${includeCompleted}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
        // Completed schedules should not be included
        response.data.forEach((schedule: any) => {
          expect(schedule.status).not.toBe('COMPLETED');
        });
      });

      it('should_return_empty_array_when_no_schedules_exist', async () => {
        const otherGuildData = createGuildData({
          ownerId: testUser.id,
        });
        let otherGuildId = '';
        try {
          const guildResponse = await apiClient.post(
            '/internal/guilds',
            otherGuildData,
            {
              headers: {
                Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
              },
            },
          );
          otherGuildId = guildResponse.data.id;

          const response = await apiClient.get(
            `/internal/trackers/schedule/guild/${otherGuildId}`,
            {
              headers: {
                Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
              },
              validateStatus: (status) => status < 500,
            },
          );

          expect(response.status).toBe(200);
          expect(Array.isArray(response.data)).toBe(true);
          expect(response.data.length).toBe(0);
        } finally {
          // Cleanup other guild
          if (otherGuildId) {
            try {
              await apiClient.delete(`/internal/guilds/${otherGuildId}`, {
                headers: {
                  Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
                },
              });
            } catch {
              // Ignore cleanup errors
            }
          }
        }
      });

      it('should_return_400_when_invalid_query_params_provided', async () => {
        const invalidStatus = 'INVALID_STATUS';

        const response = await apiClient.get(
          `/internal/trackers/schedule/guild/${testGuildId}?status=${invalidStatus}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        expect(response.status).toBe(400);
      });

      it('should_return_401_when_authentication_is_missing', async () => {
        const response = await apiClient.get(
          `/internal/trackers/schedule/guild/${testGuildId}`,
          {
            validateStatus: (status) => status < 500,
          },
        );

        expect(response.status).toBe(401);
      });
    });

    describe('POST /internal/trackers/schedule/:id/cancel - Cancel Schedule', () => {
      let testScheduleId: string = '';

      beforeEach(async () => {
        // Create a test schedule for cancellation tests
        const futureDate = new Date(Date.now() + 86400000);
        const scheduleData = {
          guildId: testGuildId,
          scheduledAt: futureDate.toISOString(),
          createdBy: testUser.id,
        };
        try {
          const createResponse = await apiClient.post(
            '/internal/trackers/schedule',
            scheduleData,
            {
              headers: {
                Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
              },
            },
          );
          testScheduleId = createResponse.data.id;
        } catch {
          // Ignore setup errors
        }
      });

      afterEach(async () => {
        // Cleanup - schedule should already be cancelled, but try anyway
        if (testScheduleId) {
          try {
            await apiClient.post(
              `/internal/trackers/schedule/${testScheduleId}/cancel`,
              {},
              {
                headers: {
                  Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
                },
              },
            );
          } catch {
            // Ignore cleanup errors (schedule may already be cancelled)
          }
          testScheduleId = '';
        }
      });

      it('should_cancel_schedule_and_return_200_when_schedule_is_pending', async () => {
        const response = await apiClient.post(
          `/internal/trackers/schedule/${testScheduleId}/cancel`,
          {},
          {
            headers: {
              Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('id', testScheduleId);
        expect(response.data).toHaveProperty('status', 'CANCELLED');
      });

      it('should_return_400_when_schedule_not_pending', async () => {
        expect(testScheduleId).toBeTruthy();

        // Cancel the schedule first, then try to cancel again
        try {
          await apiClient.post(
            `/internal/trackers/schedule/${testScheduleId}/cancel`,
            {},
            {
              headers: {
                Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
              },
            },
          );
        } catch {
          // Ignore if already cancelled
        }

        const response = await apiClient.post(
          `/internal/trackers/schedule/${testScheduleId}/cancel`,
          {},
          {
            headers: {
              Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        expect(response.status).toBe(400);
      });

      it('should_return_404_when_schedule_not_found', async () => {
        const nonExistentScheduleId = 'clx999999999999999999';

        const response = await apiClient.post(
          `/internal/trackers/schedule/${nonExistentScheduleId}/cancel`,
          {},
          {
            headers: {
              Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        expect(response.status).toBe(404);
      });

      it('should_return_401_when_authentication_is_missing', async () => {
        const response = await apiClient.post(
          `/internal/trackers/schedule/${testScheduleId}/cancel`,
          {},
          {
            validateStatus: (status) => status < 500,
          },
        );

        expect(response.status).toBe(401);
      });
    });
  },
);
