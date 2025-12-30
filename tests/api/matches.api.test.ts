/**
 * Matches API Integration Tests
 *
 * Demonstrates contract verification using Axios.
 * Focus: API contracts, stateless tests, synthetic data.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
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
  } catch {
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
    let testGuildId: string = '';
    let testLeagueId: string = '';
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

      await apiClient.post('/internal/guilds', guildData, {
        headers: {
          Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
        },
      });
      // Create test league via bot API
      const leagueData = createLeagueData({
        guildId: testGuildId,
        createdBy: testUser.id,
      });
      testLeagueId = leagueData.id!;

      await apiClient.post('/internal/leagues', leagueData, {
        headers: {
          Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
        },
      });
    });

    afterEach(async () => {
      // Clean up test match - always attempt, catch errors
      try {
        await apiClient.delete(`/internal/matches/${testMatchId}`, {
          headers: {
            Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
          },
        });
      } catch {
        // Ignore cleanup errors (resource may not exist or already deleted)
      }

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
      });

      it('should_return_200_with_match_details_when_match_exists', async () => {
        expect(testMatchId).toBeDefined();

        const response = await apiClient.get(`/api/matches/${testMatchId}`, {
          headers: {
            Authorization: `Bearer ${testToken}`,
          },
          validateStatus: (status) => status < 500,
        });

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('id', testMatchId);
        expect(response.data).toHaveProperty('leagueId', testLeagueId);
        expect(response.data).toHaveProperty('status');
      });

      it('should_return_404_when_match_does_not_exist', async () => {
        const nonExistentMatchId = 'clx999999999999999999';

        const response = await apiClient.get(
          `/api/matches/${nonExistentMatchId}`,
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        expect(response.status).toBe(404);
      });

      it('should_return_401_when_authentication_is_missing', async () => {
        expect(testMatchId).toBeDefined();

        const response = await apiClient.get(`/api/matches/${testMatchId}`, {
          validateStatus: (status) => status < 500,
        });

        expect(response.status).toBe(401);
      });
    });

    describe('POST /api/matches - Create Match', () => {
      it('should_create_match_and_return_201_status', async () => {
        const matchData = createMatchData({
          leagueId: testLeagueId,
        });

        const response = await apiClient.post('/api/matches', matchData, {
          headers: {
            Authorization: `Bearer ${testToken}`,
          },
          validateStatus: (status) => status < 500,
        });

        expect(response.status).toBe(201);
        expect(response.data).toHaveProperty('id');
        expect(response.data).toHaveProperty('leagueId', testLeagueId);
        testMatchId = response.data.id;
      });

      it('should_return_400_when_required_fields_are_missing', async () => {
        const invalidData = {};

        const response = await apiClient.post('/api/matches', invalidData, {
          headers: {
            Authorization: `Bearer ${testToken}`,
          },
          validateStatus: (status) => status < 500,
        });

        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.status).toBeLessThan(500);
      });

      it('should_return_401_when_authentication_is_missing', async () => {
        const matchData = createMatchData({
          leagueId: testLeagueId,
        });

        const response = await apiClient.post('/api/matches', matchData, {
          validateStatus: (status) => status < 500,
        });

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
      });

      it('should_add_participant_and_return_201_status', async () => {
        expect(testMatchId).toBeDefined();

        // Note: In a real scenario, we'd need to create a player first
        // For contract verification, we test the endpoint structure
        const participantData = {
          playerId: `player_${testId}`,
          isWinner: false,
        };

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

        expect(response.status).toBe(201);
        expect(response.data).toHaveProperty('id');
      });

      it('should_return_400_when_required_fields_are_missing', async () => {
        expect(testMatchId).toBeDefined();

        const invalidData = {};

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

        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.status).toBeLessThan(500);
      });

      it('should_return_401_when_authentication_is_missing', async () => {
        expect(testMatchId).toBeDefined();

        const participantData = {
          playerId: `player_${testId}`,
          isWinner: false,
        };

        const response = await apiClient.post(
          `/api/matches/${testMatchId}/participants`,
          participantData,
          {
            validateStatus: (status) => status < 500,
          },
        );

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
      });

      it('should_update_status_and_return_200_status', async () => {
        expect(testMatchId).toBeDefined();

        const statusData = {
          status: MatchStatus.IN_PROGRESS,
        };

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

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('id', testMatchId);
        expect(response.data).toHaveProperty('status', MatchStatus.IN_PROGRESS);
      });

      it('should_return_400_when_status_is_invalid', async () => {
        expect(testMatchId).toBeDefined();

        const invalidStatusData = {
          status: 'INVALID_STATUS',
        };

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

        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.status).toBeLessThan(500);
      });

      it('should_return_401_when_authentication_is_missing', async () => {
        expect(testMatchId).toBeDefined();

        const statusData = {
          status: MatchStatus.IN_PROGRESS,
        };

        const response = await apiClient.patch(
          `/api/matches/${testMatchId}/status`,
          statusData,
          {
            validateStatus: (status) => status < 500,
          },
        );

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
      });

      it('should_complete_match_and_return_200_status', async () => {
        expect(testMatchId).toBeDefined();

        const completeData = {
          winnerId: `player_${testId}`,
        };

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

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('id', testMatchId);
        expect(response.data).toHaveProperty('status', MatchStatus.COMPLETED);
      });

      it('should_return_400_when_winnerId_is_missing', async () => {
        expect(testMatchId).toBeDefined();

        const invalidData = {};

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

        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.status).toBeLessThan(500);
      });

      it('should_return_401_when_authentication_is_missing', async () => {
        expect(testMatchId).toBeDefined();

        const completeData = {
          winnerId: `player_${testId}`,
        };

        const response = await apiClient.post(
          `/api/matches/${testMatchId}/complete`,
          completeData,
          {
            validateStatus: (status) => status < 500,
          },
        );

        expect(response.status).toBe(401);
      });
    });
  },
);
