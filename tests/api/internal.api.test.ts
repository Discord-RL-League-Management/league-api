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
        // ARRANGE: Bot API key from environment

        // ACT: Get health status
        const response = await apiClient.get('/internal/health', {
          headers: {
            Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
          },
        });

        // ASSERT: Verify API contract
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('status', 'ok');
        expect(response.data).toHaveProperty('message');
        expect(response.data).toHaveProperty('timestamp');
      });

      it('should_return_401_when_authentication_is_missing', async () => {
        // ARRANGE: No authentication header

        // ACT: Try to get health without token
        const response = await apiClient.get('/internal/health', {
          validateStatus: (status) => status < 500,
        });

        // ASSERT: Verify authentication contract
        expect(response.status).toBe(401);
      });

      it('should_return_401_when_jwt_token_is_used_instead_of_bot_key', async () => {
        // ARRANGE: JWT token instead of bot API key
        const userResult = await createTestUserWithToken(apiClient);
        const jwtToken = userResult.token;

        // ACT: Try to access bot endpoint with JWT token
        const response = await apiClient.get('/internal/health', {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
          },
          validateStatus: (status) => status < 500,
        });

        // ASSERT: Verify bot-only access contract
        expect(response.status).toBe(401);

        // Cleanup
        await cleanupTestUser(apiClient, userResult.user.id);
      });
    });

    describe('GET /internal/users - List Users (Bot API)', () => {
      it('should_return_users_list_when_authenticated_with_bot_key', async () => {
        // ARRANGE: Bot API key from environment

        // ACT: List users
        const response = await apiClient.get('/internal/users', {
          headers: {
            Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
          },
        });

        // ASSERT: Verify API contract
        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
      });

      it('should_return_401_when_authentication_is_missing', async () => {
        // ARRANGE: No authentication header

        // ACT: Try to list users without token
        const response = await apiClient.get('/internal/users', {
          validateStatus: (status) => status < 500,
        });

        // ASSERT: Verify authentication contract
        expect(response.status).toBe(401);
      });
    });

    describe('GET /internal/users/:id - Get User (Bot API)', () => {
      it('should_return_user_details_when_user_exists', async () => {
        // ARRANGE: Test user already created in beforeEach

        // ACT: Get user details
        const response = await apiClient.get(`/internal/users/${testUser.id}`, {
          headers: {
            Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
          },
        });

        // ASSERT: Verify API contract
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('id', testUser.id);
        expect(response.data).toHaveProperty('username', testUser.username);
      });

      it('should_return_404_when_user_does_not_exist', async () => {
        // ARRANGE: Non-existent user ID
        const nonExistentUserId = `user_${testId}_nonexistent`;

        // ACT: Try to get non-existent user
        const response = await apiClient.get(
          `/internal/users/${nonExistentUserId}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify error contract
        expect(response.status).toBe(404);
      });
    });

    describe('POST /internal/users - Create User (Bot API)', () => {
      it('should_create_user_and_return_201_status', async () => {
        // ARRANGE: Valid user data
        const userData = createUserData({
          username: `newuser_${testId}`,
          email: `newuser_${testId}@example.com`,
        });

        // ACT: Create user
        const response = await apiClient.post('/internal/users', userData, {
          headers: {
            Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
          },
        });

        // ASSERT: Verify API contract
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
        // ARRANGE: Invalid data (missing required fields)
        const invalidData = {};

        // ACT: Try to create user with invalid data
        const response = await apiClient.post('/internal/users', invalidData, {
          headers: {
            Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
          },
          validateStatus: (status) => status < 500,
        });

        // ASSERT: Verify error contract
        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.status).toBeLessThan(500);
      });
    });

    describe('PATCH /internal/users/:id - Update User (Bot API)', () => {
      it('should_update_user_and_return_200_status', async () => {
        // ARRANGE: Test user already created in beforeEach
        const updateData = {
          username: `updated_${testUser.username}`,
        };

        // ACT: Update user
        const response = await apiClient.patch(
          `/internal/users/${testUser.id}`,
          updateData,
          {
            headers: {
              Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
            },
          },
        );

        // ASSERT: Verify API contract
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('id', testUser.id);
        expect(response.data).toHaveProperty('username', updateData.username);
      });

      it('should_return_404_when_user_does_not_exist', async () => {
        // ARRANGE: Non-existent user ID
        const nonExistentUserId = `user_${testId}_nonexistent`;
        const updateData = {
          username: 'updated_username',
        };

        // ACT: Try to update non-existent user
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

        // ASSERT: Verify error contract
        expect(response.status).toBe(404);
      });
    });

    describe('DELETE /internal/users/:id - Delete User (Bot API)', () => {
      it('should_delete_user_and_return_200_status', async () => {
        // ARRANGE: Create a separate user for deletion test
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

        // ACT: Delete user
        const response = await apiClient.delete(
          `/internal/users/${userIdToDelete}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
            },
          },
        );

        // ASSERT: Verify API contract
        expect(response.status).toBe(200);
      });

      it('should_return_404_when_user_does_not_exist', async () => {
        // ARRANGE: Non-existent user ID
        const nonExistentUserId = `user_${testId}_nonexistent`;

        // ACT: Try to delete non-existent user
        const response = await apiClient.delete(
          `/internal/users/${nonExistentUserId}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify error contract
        expect(response.status).toBe(404);
      });
    });

    describe('GET /internal/leagues/:id - Get League (Bot API)', () => {
      it('should_return_league_details_when_league_exists', async () => {
        // ARRANGE: Test league already created in beforeEach

        // ACT: Get league details
        const response = await apiClient.get(
          `/internal/leagues/${testLeagueId}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
            },
          },
        );

        // ASSERT: Verify API contract
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('id', testLeagueId);
        expect(response.data).toHaveProperty('name');
      });

      it('should_return_404_when_league_does_not_exist', async () => {
        // ARRANGE: Non-existent league ID
        const nonExistentLeagueId = 'clx999999999999999999';

        // ACT: Try to get non-existent league
        const response = await apiClient.get(
          `/internal/leagues/${nonExistentLeagueId}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify error contract
        expect(response.status).toBe(404);
      });
    });

    describe('POST /internal/leagues - Create League (Bot API)', () => {
      it('should_create_league_and_return_201_status', async () => {
        // ARRANGE: Valid league data
        const leagueData = createLeagueData({
          guildId: testGuildId,
          name: `New League ${testId}`,
          createdBy: testUser.id,
        });

        // ACT: Create league
        const response = await apiClient.post('/internal/leagues', leagueData, {
          headers: {
            Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
          },
        });

        // ASSERT: Verify API contract
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
        // ARRANGE: Invalid data (missing required fields)
        const invalidData = {};

        // ACT: Try to create league with invalid data
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

        // ASSERT: Verify error contract
        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.status).toBeLessThan(500);
      });
    });

    describe('POST /internal/trackers/schedule - Schedule Tracker Processing', () => {
      it('should_create_schedule_and_return_201_when_data_is_valid', async () => {
        // ARRANGE: Valid schedule data with future date
        const futureDate = new Date(Date.now() + 86400000); // +1 day
        const scheduleData = {
          guildId: testGuildId,
          scheduledAt: futureDate.toISOString(),
          createdBy: testUser.id,
          metadata: { reason: 'Season 15 start' },
        };

        // ACT: Create schedule
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

        // ASSERT: Verify API contract
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
        // ARRANGE: Schedule data with past date
        const pastDate = new Date(Date.now() - 86400000); // -1 day (past)
        const scheduleData = {
          guildId: testGuildId,
          scheduledAt: pastDate.toISOString(),
          createdBy: testUser.id,
        };

        // ACT: Try to create schedule with past date
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

        // ASSERT: Verify error contract
        expect(response.status).toBe(400);
      });

      it('should_return_400_when_required_fields_are_missing', async () => {
        // ARRANGE: Invalid data (missing required fields)
        const invalidData = {};

        // ACT: Try to create schedule with invalid data
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

        // ASSERT: Verify error contract
        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.status).toBeLessThan(500);
      });

      it('should_return_404_when_guild_not_found', async () => {
        // ARRANGE: Valid schedule data but with non-existent guild ID
        const futureDate = new Date(Date.now() + 86400000);
        const scheduleData = {
          guildId: '999999999999999999',
          scheduledAt: futureDate.toISOString(),
          createdBy: testUser.id,
        };

        // ACT: Try to create schedule for non-existent guild
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

        // ASSERT: Verify error contract
        expect(response.status).toBe(404);
      });

      it('should_return_401_when_authentication_is_missing', async () => {
        // ARRANGE: Valid schedule data but no authentication
        const futureDate = new Date(Date.now() + 86400000);
        const scheduleData = {
          guildId: testGuildId,
          scheduledAt: futureDate.toISOString(),
          createdBy: testUser.id,
        };

        // ACT: Try to create schedule without authentication
        const response = await apiClient.post(
          '/internal/trackers/schedule',
          scheduleData,
          {
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify authentication contract
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
        // ARRANGE: Test guild already created in beforeEach, schedule created in nested beforeEach

        // ACT: Get schedules for guild
        const response = await apiClient.get(
          `/internal/trackers/schedule/guild/${testGuildId}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify API contract
        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
        expect(response.data.length).toBeGreaterThan(0);
      });

      it('should_filter_by_status_when_query_param_provided', async () => {
        // ARRANGE: Query parameter for status filter
        const status = 'PENDING';

        // ACT: Get schedules with status filter
        const response = await apiClient.get(
          `/internal/trackers/schedule/guild/${testGuildId}?status=${status}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify API contract
        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
        // All returned schedules should have the requested status
        response.data.forEach((schedule: any) => {
          expect(schedule.status).toBe(status);
        });
      });

      it('should_filter_by_includeCompleted_when_query_param_provided', async () => {
        // ARRANGE: Query parameter for includeCompleted filter
        const includeCompleted = 'false';

        // ACT: Get schedules with includeCompleted filter
        const response = await apiClient.get(
          `/internal/trackers/schedule/guild/${testGuildId}?includeCompleted=${includeCompleted}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify API contract
        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
        // Completed schedules should not be included
        response.data.forEach((schedule: any) => {
          expect(schedule.status).not.toBe('COMPLETED');
        });
      });

      it('should_return_empty_array_when_no_schedules_exist', async () => {
        // ARRANGE: Use a different guild with no schedules
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

          // ACT: Get schedules for guild with no schedules
          const response = await apiClient.get(
            `/internal/trackers/schedule/guild/${otherGuildId}`,
            {
              headers: {
                Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
              },
              validateStatus: (status) => status < 500,
            },
          );

          // ASSERT: Verify API contract
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
        // ARRANGE: Invalid status value
        const invalidStatus = 'INVALID_STATUS';

        // ACT: Get schedules with invalid status
        const response = await apiClient.get(
          `/internal/trackers/schedule/guild/${testGuildId}?status=${invalidStatus}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify error contract
        expect(response.status).toBe(400);
      });

      it('should_return_401_when_authentication_is_missing', async () => {
        // ARRANGE: No authentication header

        // ACT: Try to get schedules without authentication
        const response = await apiClient.get(
          `/internal/trackers/schedule/guild/${testGuildId}`,
          {
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify authentication contract
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
        // ARRANGE: Test schedule already created in nested beforeEach

        // ACT: Cancel schedule
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

        // ASSERT: Verify API contract
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('id', testScheduleId);
        expect(response.data).toHaveProperty('status', 'CANCELLED');
      });

      it('should_return_400_when_schedule_not_pending', async () => {
        // ARRANGE: Ensure we have a schedule ID
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

        // ACT: Try to cancel already cancelled schedule
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

        // ASSERT: Verify error contract
        expect(response.status).toBe(400);
      });

      it('should_return_404_when_schedule_not_found', async () => {
        // ARRANGE: Non-existent schedule ID
        const nonExistentScheduleId = 'clx999999999999999999';

        // ACT: Try to cancel non-existent schedule
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

        // ASSERT: Verify error contract
        expect(response.status).toBe(404);
      });

      it('should_return_401_when_authentication_is_missing', async () => {
        // ARRANGE: No authentication header

        // ACT: Try to cancel schedule without authentication
        const response = await apiClient.post(
          `/internal/trackers/schedule/${testScheduleId}/cancel`,
          {},
          {
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify authentication contract
        expect(response.status).toBe(401);
      });
    });
  },
);
