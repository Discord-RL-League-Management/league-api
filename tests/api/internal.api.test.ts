/**
 * Internal API Integration Tests (Bot API)
 * 
 * Demonstrates contract verification using Axios.
 * Focus: API contracts, stateless tests, synthetic data.
 * 
 * Aligned with ISO/IEC/IEEE 29119 standards.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { apiClient, API_BASE_URL } from '../setup/api-setup';
import { createUserData } from '../factories/user.factory';
import { createLeagueData } from '../factories/league.factory';
import { createGuildData } from '../factories/guild.factory';
import { generateTestId, createTestUserWithToken, cleanupTestUser } from '../utils/test-helpers';

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

describe.skipIf(!isServerAvailable)('Internal API - Contract Verification', () => {
  const testId = generateTestId();
  let testUser: any = null;
  let testGuild: any = null;
  let testGuildId: string = '';
  let testLeague: any = null;
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

    const guildResponse = await apiClient.post('/internal/guilds', guildData, {
      headers: {
        Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
      },
    });
    testGuild = guildResponse.data;

    // Create test league via bot API
    const leagueData = createLeagueData({
      guildId: testGuildId,
      createdBy: testUser.id,
    });
    testLeagueId = leagueData.id!;

    const leagueResponse = await apiClient.post('/internal/leagues', leagueData, {
      headers: {
        Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
      },
    });
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
    testUser = null;
    testGuild = null;
    testGuildId = '';
    testLeague = null;
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
      const response = await apiClient.get(`/internal/users/${nonExistentUserId}`, {
        headers: {
          Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
        },
        validateStatus: (status) => status < 500,
      });

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
      } catch (error) {
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
      const response = await apiClient.patch(`/internal/users/${testUser.id}`, updateData, {
        headers: {
          Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
        },
      });

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
      const response = await apiClient.patch(`/internal/users/${nonExistentUserId}`, updateData, {
        headers: {
          Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
        },
        validateStatus: (status) => status < 500,
      });

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
      const createResponse = await apiClient.post('/internal/users', userData, {
        headers: {
          Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
        },
      });
      const userIdToDelete = createResponse.data.id;

      // ACT: Delete user
      const response = await apiClient.delete(`/internal/users/${userIdToDelete}`, {
        headers: {
          Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
        },
      });

      // ASSERT: Verify API contract
      expect(response.status).toBe(200);
    });

    it('should_return_404_when_user_does_not_exist', async () => {
      // ARRANGE: Non-existent user ID
      const nonExistentUserId = `user_${testId}_nonexistent`;

      // ACT: Try to delete non-existent user
      const response = await apiClient.delete(`/internal/users/${nonExistentUserId}`, {
        headers: {
          Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
        },
        validateStatus: (status) => status < 500,
      });

      // ASSERT: Verify error contract
      expect(response.status).toBe(404);
    });
  });

  describe('GET /internal/leagues/:id - Get League (Bot API)', () => {
    it('should_return_league_details_when_league_exists', async () => {
      // ARRANGE: Test league already created in beforeEach

      // ACT: Get league details
      const response = await apiClient.get(`/internal/leagues/${testLeagueId}`, {
        headers: {
          Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
        },
      });

      // ASSERT: Verify API contract
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id', testLeagueId);
      expect(response.data).toHaveProperty('name');
    });

    it('should_return_404_when_league_does_not_exist', async () => {
      // ARRANGE: Non-existent league ID
      const nonExistentLeagueId = 'clx999999999999999999';

      // ACT: Try to get non-existent league
      const response = await apiClient.get(`/internal/leagues/${nonExistentLeagueId}`, {
        headers: {
          Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
        },
        validateStatus: (status) => status < 500,
      });

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
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should_return_400_when_required_fields_are_missing', async () => {
      // ARRANGE: Invalid data (missing required fields)
      const invalidData = {};

      // ACT: Try to create league with invalid data
      const response = await apiClient.post('/internal/leagues', invalidData, {
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
});

