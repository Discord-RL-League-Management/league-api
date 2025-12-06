/**
 * Matches API Integration Tests
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
import { createMatchData } from '../factories/match.factory';
import { createLeagueData } from '../factories/league.factory';
import { createGuildData } from '../factories/guild.factory';
import {
  generateTestId,
  createTestUserWithToken,
  cleanupTestUser,
} from '../utils/test-helpers';
import { MatchStatus } from '@prisma/client';

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
  'Matches API - Contract Verification',
  () => {
    const testId = generateTestId();
    let testUser: any = null;
    let testToken: string = '';
    let testGuild: any = null;
    let testGuildId: string = '';
    let testLeague: any = null;
    let testLeagueId: string = '';
    let testMatch: any = null;
    let testMatchId: string = '';

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
      // Clean up test match - always attempt, catch errors
      try {
        await apiClient.delete(`/internal/matches/${testMatchId}`, {
          headers: {
            Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
          },
        });
      } catch (error) {
        // Ignore cleanup errors (resource may not exist or already deleted)
      }

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
      testMatchId = '';
      testLeagueId = '';
      testGuildId = '';
      testUser = null;
    });

    describe('GET /api/matches/:id - Get Match Details', () => {
      beforeEach(async () => {
        // Create test match via bot API
        const matchData = createMatchData({
          leagueId: testLeagueId,
        });

        const matchResponse = await apiClient.post(
          '/internal/matches',
          matchData,
          {
            headers: {
              Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        expect(matchResponse.status).toBe(201);
        testMatchId = matchResponse.data.id;
        testMatch = matchResponse.data;
      });

      it('should_return_200_with_match_details_when_match_exists', async () => {
        // ARRANGE: Test match already created in beforeEach
        expect(testMatchId).toBeDefined();

        // ACT: Get match details
        const response = await apiClient.get(`/api/matches/${testMatchId}`, {
          headers: {
            Authorization: `Bearer ${testToken}`,
          },
          validateStatus: (status) => status < 500,
        });

        // ASSERT: Verify API contract
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('id', testMatchId);
        expect(response.data).toHaveProperty('leagueId', testLeagueId);
        expect(response.data).toHaveProperty('status');
      });

      it('should_return_404_when_match_does_not_exist', async () => {
        // ARRANGE: Non-existent match ID
        const nonExistentMatchId = 'clx999999999999999999';

        // ACT: Try to get non-existent match
        const response = await apiClient.get(
          `/api/matches/${nonExistentMatchId}`,
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
        // ARRANGE: Test match already created in beforeEach
        expect(testMatchId).toBeDefined();

        // ACT: Try to get match without token
        const response = await apiClient.get(`/api/matches/${testMatchId}`, {
          validateStatus: (status) => status < 500,
        });

        // ASSERT: Verify authentication contract
        expect(response.status).toBe(401);
      });
    });

    describe('POST /api/matches - Create Match', () => {
      it('should_create_match_and_return_201_status', async () => {
        // ARRANGE: Test league already created in beforeEach
        const matchData = createMatchData({
          leagueId: testLeagueId,
        });

        // ACT: Create match
        const response = await apiClient.post('/api/matches', matchData, {
          headers: {
            Authorization: `Bearer ${testToken}`,
          },
          validateStatus: (status) => status < 500,
        });

        // ASSERT: Verify API contract - expect success
        expect(response.status).toBe(201);
        expect(response.data).toHaveProperty('id');
        expect(response.data).toHaveProperty('leagueId', testLeagueId);
        testMatchId = response.data.id;
      });

      it('should_return_400_when_required_fields_are_missing', async () => {
        // ARRANGE: Invalid data (missing required fields)
        const invalidData = {};

        // ACT: Try to create match with invalid data
        const response = await apiClient.post('/api/matches', invalidData, {
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
        const matchData = createMatchData({
          leagueId: testLeagueId,
        });

        // ACT: Try to create match without token
        const response = await apiClient.post('/api/matches', matchData, {
          validateStatus: (status) => status < 500,
        });

        // ASSERT: Verify authentication contract
        expect(response.status).toBe(401);
      });
    });

    describe('POST /api/matches/:id/participants - Add Match Participant', () => {
      beforeEach(async () => {
        // Create test match via bot API
        const matchData = createMatchData({
          leagueId: testLeagueId,
        });

        const matchResponse = await apiClient.post(
          '/internal/matches',
          matchData,
          {
            headers: {
              Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        expect(matchResponse.status).toBe(201);
        testMatchId = matchResponse.data.id;
        testMatch = matchResponse.data;
      });

      it('should_add_participant_and_return_201_status', async () => {
        // ARRANGE: Test match already created in beforeEach
        expect(testMatchId).toBeDefined();

        // Note: In a real scenario, we'd need to create a player first
        // For contract verification, we test the endpoint structure
        const participantData = {
          playerId: `player_${testId}`,
          isWinner: false,
        };

        // ACT: Add participant
        const response = await apiClient.post(
          `/api/matches/${testMatchId}/participants`,
          participantData,
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify API contract - expect success
        expect(response.status).toBe(201);
        expect(response.data).toHaveProperty('id');
      });

      it('should_return_400_when_required_fields_are_missing', async () => {
        // ARRANGE: Test match already created in beforeEach
        expect(testMatchId).toBeDefined();

        const invalidData = {};

        // ACT: Try to add participant with invalid data
        const response = await apiClient.post(
          `/api/matches/${testMatchId}/participants`,
          invalidData,
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify error contract
        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.status).toBeLessThan(500);
      });

      it('should_return_401_when_authentication_is_missing', async () => {
        // ARRANGE: Test match already created in beforeEach
        expect(testMatchId).toBeDefined();

        const participantData = {
          playerId: `player_${testId}`,
          isWinner: false,
        };

        // ACT: Try to add participant without token
        const response = await apiClient.post(
          `/api/matches/${testMatchId}/participants`,
          participantData,
          {
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify authentication contract
        expect(response.status).toBe(401);
      });
    });

    describe('PATCH /api/matches/:id/status - Update Match Status', () => {
      beforeEach(async () => {
        // Create test match via bot API
        const matchData = createMatchData({
          leagueId: testLeagueId,
        });

        const matchResponse = await apiClient.post(
          '/internal/matches',
          matchData,
          {
            headers: {
              Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        expect(matchResponse.status).toBe(201);
        testMatchId = matchResponse.data.id;
        testMatch = matchResponse.data;
      });

      it('should_update_status_and_return_200_status', async () => {
        // ARRANGE: Test match already created in beforeEach
        expect(testMatchId).toBeDefined();

        const statusData = {
          status: MatchStatus.IN_PROGRESS,
        };

        // ACT: Update match status
        const response = await apiClient.patch(
          `/api/matches/${testMatchId}/status`,
          statusData,
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify API contract
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('id', testMatchId);
        expect(response.data).toHaveProperty('status', MatchStatus.IN_PROGRESS);
      });

      it('should_return_400_when_status_is_invalid', async () => {
        // ARRANGE: Test match already created in beforeEach
        expect(testMatchId).toBeDefined();

        const invalidStatusData = {
          status: 'INVALID_STATUS',
        };

        // ACT: Try to update with invalid status
        const response = await apiClient.patch(
          `/api/matches/${testMatchId}/status`,
          invalidStatusData,
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify error contract
        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.status).toBeLessThan(500);
      });

      it('should_return_401_when_authentication_is_missing', async () => {
        // ARRANGE: Test match already created in beforeEach
        expect(testMatchId).toBeDefined();

        const statusData = {
          status: MatchStatus.IN_PROGRESS,
        };

        // ACT: Try to update status without token
        const response = await apiClient.patch(
          `/api/matches/${testMatchId}/status`,
          statusData,
          {
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify authentication contract
        expect(response.status).toBe(401);
      });
    });

    describe('POST /api/matches/:id/complete - Complete Match', () => {
      beforeEach(async () => {
        // Create test match via bot API
        const matchData = createMatchData({
          leagueId: testLeagueId,
          status: MatchStatus.IN_PROGRESS,
        });

        const matchResponse = await apiClient.post(
          '/internal/matches',
          matchData,
          {
            headers: {
              Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        expect(matchResponse.status).toBe(201);
        testMatchId = matchResponse.data.id;
        testMatch = matchResponse.data;
      });

      it('should_complete_match_and_return_200_status', async () => {
        // ARRANGE: Test match already created in beforeEach
        expect(testMatchId).toBeDefined();

        const completeData = {
          winnerId: `player_${testId}`,
        };

        // ACT: Complete match
        const response = await apiClient.post(
          `/api/matches/${testMatchId}/complete`,
          completeData,
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify API contract - expect success
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('id', testMatchId);
        expect(response.data).toHaveProperty('status', MatchStatus.COMPLETED);
      });

      it('should_return_400_when_winnerId_is_missing', async () => {
        // ARRANGE: Test match already created in beforeEach
        expect(testMatchId).toBeDefined();

        const invalidData = {};

        // ACT: Try to complete match without winnerId
        const response = await apiClient.post(
          `/api/matches/${testMatchId}/complete`,
          invalidData,
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify error contract
        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.status).toBeLessThan(500);
      });

      it('should_return_401_when_authentication_is_missing', async () => {
        // ARRANGE: Test match already created in beforeEach
        expect(testMatchId).toBeDefined();

        const completeData = {
          winnerId: `player_${testId}`,
        };

        // ACT: Try to complete match without token
        const response = await apiClient.post(
          `/api/matches/${testMatchId}/complete`,
          completeData,
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
