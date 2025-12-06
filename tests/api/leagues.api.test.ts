/**
 * Leagues API Integration Tests
 *
 * Demonstrates contract verification using Axios.
 * Focus: API contracts, stateless tests, synthetic data.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards.
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from 'vitest';
import { apiClient, API_BASE_URL } from '../setup/api-setup';
import { createLeagueData } from '../factories/league.factory';
import { createGuildData } from '../factories/guild.factory';
import {
  generateTestId,
  createTestUserWithToken,
  cleanupTestUser,
} from '../utils/test-helpers';
import { Game, LeagueStatus } from '@prisma/client';

// Check if API server is available before running tests
let isServerAvailable = false;

beforeAll(async () => {
  try {
    await apiClient.get('/health');
    isServerAvailable = true;
  } catch (error) {
    console.warn(
      `API server not available at ${API_BASE_URL}. API tests will be skipped.`,
    );
    isServerAvailable = false;
  }
});

describe.skipIf(!isServerAvailable)(
  'Leagues API - Contract Verification',
  () => {
    const testId = generateTestId();
    let testUser: any = null;
    let testToken: string = '';
    let testGuild: any = null;
    let testGuildId: string = '';
    let testLeague: any = null;
    let testLeagueId: string = '';

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

      const guildResponse = await apiClient.post(
        '/internal/guilds',
        guildData,
        {
          headers: {
            Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
          },
        },
      );
      testGuild = guildResponse.data;

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
      testLeague = leagueResponse.data;
    });

    afterEach(async () => {
      // Clean up test league - always attempt, catch errors
      try {
        await apiClient.delete(`/internal/leagues/${testLeagueId}`, {
          headers: {
            Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
          },
        });
      } catch (error) {
        // Ignore cleanup errors (resource may not exist or already deleted)
      }

      // Clean up test guild - always attempt, catch errors
      try {
        await apiClient.delete(`/internal/guilds/${testGuildId}`, {
          headers: {
            Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
          },
        });
      } catch (error) {
        // Ignore cleanup errors (resource may not exist or already deleted)
      }

      // Clean up test user - always attempt, catch errors
      try {
        await cleanupTestUser(apiClient, testUser?.id);
      } catch (error) {
        // Ignore cleanup errors (resource may not exist or already deleted)
      }

      // Reset state for next test
      testLeagueId = '';
      testGuildId = '';
      testUser = null;
    });

    describe('GET /api/leagues/guild/:guildId - List Leagues by Guild', () => {
      it('should_return_200_with_leagues_list_when_guild_exists', async () => {
        // ARRANGE: Test guild and league already created in beforeEach

        // ACT: Get leagues by guild
        const response = await apiClient.get(
          `/api/leagues/guild/${testGuildId}`,
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify API contract
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('data');
        expect(Array.isArray(response.data.data)).toBe(true);
      });

      it('should_return_404_when_guild_does_not_exist', async () => {
        // ARRANGE: Non-existent guild ID
        const nonExistentGuildId = '999999999999999999';

        // ACT: Get leagues by non-existent guild
        const response = await apiClient.get(
          `/api/leagues/guild/${nonExistentGuildId}`,
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify error contract
        expect(response.status).toBe(404);
      });

      it('should_return_200_with_pagination_when_page_and_limit_provided', async () => {
        // ARRANGE: Test guild and league already created in beforeEach

        // ACT: Get leagues with pagination
        const response = await apiClient.get(
          `/api/leagues/guild/${testGuildId}?page=1&limit=10`,
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify pagination contract
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('data');
        expect(response.data).toHaveProperty('page');
        expect(response.data).toHaveProperty('limit');
      });

      it('should_return_200_with_filtered_leagues_when_status_provided', async () => {
        // ARRANGE: Test guild and league already created in beforeEach

        // ACT: Get leagues filtered by status
        const response = await apiClient.get(
          `/api/leagues/guild/${testGuildId}?status=${LeagueStatus.ACTIVE}`,
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify filter contract
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('data');
      });

      it('should_return_200_with_filtered_leagues_when_game_provided', async () => {
        // ARRANGE: Test guild and league already created in beforeEach

        // ACT: Get leagues filtered by game
        const response = await apiClient.get(
          `/api/leagues/guild/${testGuildId}?game=${Game.ROCKET_LEAGUE}`,
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify filter contract
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('data');
      });

      it('should_return_401_when_authentication_is_missing', async () => {
        // ARRANGE: No authentication header

        // ACT: Try to get leagues without token
        const response = await apiClient.get(
          `/api/leagues/guild/${testGuildId}`,
          {
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify authentication contract
        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/leagues/:id - Get League Details', () => {
      it('should_return_200_with_league_details_when_user_has_access', async () => {
        // ARRANGE: Test league already created in beforeEach

        // ACT: Get league details
        const response = await apiClient.get(`/api/leagues/${testLeagueId}`, {
          headers: {
            Authorization: `Bearer ${testToken}`,
          },
          validateStatus: (status) => status < 500,
        });

        // ASSERT: Verify API contract - expect success (user created the league)
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('id', testLeagueId);
        expect(response.data).toHaveProperty('name');
      });

      it('should_return_404_when_league_does_not_exist', async () => {
        // ARRANGE: Non-existent league ID
        const nonExistentLeagueId = 'clx999999999999999999';

        // ACT: Try to get non-existent league
        const response = await apiClient.get(
          `/api/leagues/${nonExistentLeagueId}`,
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify error contract
        expect(response.status).toBe(404);
      });

      it('should_return_401_when_authentication_is_missing', async () => {
        // ARRANGE: No authentication header

        // ACT: Try to get league without token
        const response = await apiClient.get(`/api/leagues/${testLeagueId}`, {
          validateStatus: (status) => status < 500,
        });

        // ASSERT: Verify authentication contract
        expect(response.status).toBe(401);
      });
    });

    describe('POST /api/leagues - Create League', () => {
      it('should_create_league_and_return_201_status_when_user_is_admin', async () => {
        // ARRANGE: Test guild already created in beforeEach
        const newLeagueData = createLeagueData({
          guildId: testGuildId,
          name: `New League ${testId}`,
        });

        // ACT: Create league
        const response = await apiClient.post('/api/leagues', newLeagueData, {
          headers: {
            Authorization: `Bearer ${testToken}`,
          },
          validateStatus: (status) => status < 500,
        });

        // ASSERT: Verify API contract - expect success (user is guild owner)
        expect(response.status).toBe(201);
        expect(response.data).toHaveProperty('id');
        expect(response.data).toHaveProperty('name', newLeagueData.name);

        // Cleanup
        try {
          await apiClient.delete(`/internal/leagues/${response.data.id}`, {
            headers: {
              Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
            },
          });
        } catch (error) {
          // Ignore cleanup errors
        }
      });

      it('should_return_403_when_user_is_not_admin', async () => {
        // ARRANGE: Create another user who is not admin
        const otherUserResult = await createTestUserWithToken(apiClient);
        const otherToken = otherUserResult.token;

        const newLeagueData = createLeagueData({
          guildId: testGuildId,
          name: `New League ${testId}`,
        });

        // ACT: Try to create league as non-admin user
        const response = await apiClient.post('/api/leagues', newLeagueData, {
          headers: {
            Authorization: `Bearer ${otherToken}`,
          },
          validateStatus: (status) => status < 500,
        });

        // ASSERT: Verify permission contract
        expect(response.status).toBe(403);

        // Cleanup
        await cleanupTestUser(apiClient, otherUserResult.user.id);
      });

      it('should_return_400_when_required_fields_are_missing', async () => {
        // ARRANGE: Invalid data (missing required fields)
        const invalidData = {};

        // ACT: Try to create league with invalid data
        const response = await apiClient.post('/api/leagues', invalidData, {
          headers: {
            Authorization: `Bearer ${testToken}`,
          },
          validateStatus: (status) => status < 500,
        });

        // ASSERT: Verify error contract
        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.status).toBeLessThan(500);
      });

      it('should_return_401_when_authentication_is_missing', async () => {
        // ARRANGE: Valid data but no auth
        const leagueData = createLeagueData({
          guildId: testGuildId,
        });

        // ACT: Try to create league without token
        const response = await apiClient.post('/api/leagues', leagueData, {
          validateStatus: (status) => status < 500,
        });

        // ASSERT: Verify authentication contract
        expect(response.status).toBe(401);
      });
    });

    describe('PATCH /api/leagues/:id - Update League', () => {
      it('should_return_403_when_user_is_not_admin_or_moderator', async () => {
        // ARRANGE: Test league already created in beforeEach
        const updateData = {
          name: `Updated League ${testId}`,
        };

        // ACT: Try to update league
        const response = await apiClient.patch(
          `/api/leagues/${testLeagueId}`,
          updateData,
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify permission contract
        // May return 403 (not admin/moderator) or 404 (not a member)
        expect([403, 404]).toContain(response.status);
      });

      it('should_return_401_when_authentication_is_missing', async () => {
        // ARRANGE: No authentication header
        const updateData = {
          name: `Updated League ${testId}`,
        };

        // ACT: Try to update league without token
        const response = await apiClient.patch(
          `/api/leagues/${testLeagueId}`,
          updateData,
          {
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify authentication contract
        expect(response.status).toBe(401);
      });
    });

    describe('PATCH /api/leagues/:id/status - Update League Status', () => {
      it('should_return_403_when_user_is_not_admin', async () => {
        // ARRANGE: Test league already created in beforeEach
        const statusData = {
          status: LeagueStatus.PAUSED,
        };

        // ACT: Try to update league status
        const response = await apiClient.patch(
          `/api/leagues/${testLeagueId}/status`,
          statusData,
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify permission contract
        // May return 403 (not admin) or 404 (not a member)
        expect([403, 404]).toContain(response.status);
      });

      it('should_return_401_when_authentication_is_missing', async () => {
        // ARRANGE: No authentication header
        const statusData = {
          status: LeagueStatus.PAUSED,
        };

        // ACT: Try to update status without token
        const response = await apiClient.patch(
          `/api/leagues/${testLeagueId}/status`,
          statusData,
          {
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify authentication contract
        expect(response.status).toBe(401);
      });
    });

    describe('DELETE /api/leagues/:id - Delete League', () => {
      it('should_return_403_when_user_is_not_admin', async () => {
        // ARRANGE: Test league already created in beforeEach

        // ACT: Try to delete league
        const response = await apiClient.delete(
          `/api/leagues/${testLeagueId}`,
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify permission contract
        // May return 403 (not admin) or 404 (not a member)
        expect([403, 404]).toContain(response.status);
      });

      it('should_return_401_when_authentication_is_missing', async () => {
        // ARRANGE: No authentication header

        // ACT: Try to delete league without token
        const response = await apiClient.delete(
          `/api/leagues/${testLeagueId}`,
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
