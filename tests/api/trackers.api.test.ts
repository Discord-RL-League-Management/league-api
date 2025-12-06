/**
 * Trackers API Integration Tests
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
import { createTrackerData } from '../factories/tracker.factory';
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
  } catch (error) {
    console.warn(
      `API server not available at ${API_BASE_URL}. API tests will be skipped.`,
    );
    isServerAvailable = false;
  }
});

describe.skipIf(!isServerAvailable)(
  'Trackers API - Contract Verification',
  () => {
    const testId = generateTestId();
    let testUser: any = null;
    let testToken: string = '';
    let testTracker: any = null;
    let testTrackerId: string = '';

    beforeEach(async () => {
      // Create test user and get JWT token
      const userResult = await createTestUserWithToken(apiClient);
      testUser = userResult.user;
      testToken = userResult.token;
    });

    afterEach(async () => {
      // Clean up test tracker - always attempt, catch errors
      try {
        await apiClient.delete(`/api/trackers/${testTrackerId}`, {
          headers: {
            Authorization: `Bearer ${testToken}`,
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
      testTrackerId = '';
      testUser = null;
    });

    describe('POST /api/trackers/register - Register Trackers', () => {
      it('should_register_trackers_and_return_201_status', async () => {
        // ARRANGE: Valid tracker URLs
        const trackerUrls = [
          'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser1/overview',
        ];

        // ACT: Register trackers
        const response = await apiClient.post(
          '/api/trackers/register',
          { urls: trackerUrls },
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify API contract - expect success
        expect(response.status).toBe(201);
        expect(Array.isArray(response.data)).toBe(true);
        expect(response.data.length).toBeGreaterThan(0);
        testTrackerId = response.data[0].id;
        testTracker = response.data[0];
      });

      it('should_return_400_when_urls_are_invalid', async () => {
        // ARRANGE: Invalid tracker URLs
        const invalidUrls = ['not-a-valid-url', 'http://invalid.com'];

        // ACT: Try to register invalid trackers
        const response = await apiClient.post(
          '/api/trackers/register',
          { urls: invalidUrls },
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify error contract
        expect(response.status).toBe(400);
      });

      it('should_return_400_when_more_than_4_urls_provided', async () => {
        // ARRANGE: More than 4 URLs
        const tooManyUrls = Array.from(
          { length: 5 },
          (_, i) =>
            `https://rocketleague.tracker.network/rocket-league/profile/steam/testuser${i}/overview`,
        );

        // ACT: Try to register too many trackers
        const response = await apiClient.post(
          '/api/trackers/register',
          { urls: tooManyUrls },
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
        // ARRANGE: Valid data but no auth
        const trackerUrls = [
          'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview',
        ];

        // ACT: Try to register without token
        const response = await apiClient.post(
          '/api/trackers/register',
          { urls: trackerUrls },
          {
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify authentication contract
        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/trackers/me - Get Current User Trackers', () => {
      it('should_return_200_with_trackers_array_when_user_has_trackers', async () => {
        // ARRANGE: Register a tracker first
        const trackerUrls = [
          'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview',
        ];
        const registerResponse = await apiClient.post(
          '/api/trackers/register',
          { urls: trackerUrls },
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );
        expect(registerResponse.status).toBe(201);
        expect(registerResponse.data.length).toBeGreaterThan(0);
        testTrackerId = registerResponse.data[0].id;

        // ACT: Get user's trackers
        const response = await apiClient.get('/api/trackers/me', {
          headers: {
            Authorization: `Bearer ${testToken}`,
          },
          validateStatus: (status) => status < 500,
        });

        // ASSERT: Verify API contract
        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
      });

      it('should_return_404_when_user_has_no_trackers', async () => {
        // ARRANGE: Test user with no trackers (already created in beforeEach)

        // ACT: Get user's trackers
        const response = await apiClient.get('/api/trackers/me', {
          headers: {
            Authorization: `Bearer ${testToken}`,
          },
          validateStatus: (status) => status < 500,
        });

        // ASSERT: Verify API contract
        expect(response.status).toBe(404);
      });

      it('should_return_401_when_authentication_is_missing', async () => {
        // ARRANGE: No authentication header

        // ACT: Try to get trackers without token
        const response = await apiClient.get('/api/trackers/me', {
          validateStatus: (status) => status < 500,
        });

        // ASSERT: Verify authentication contract
        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/trackers - Get Trackers', () => {
      it('should_return_200_with_trackers_array_when_user_has_trackers', async () => {
        // ARRANGE: Register a tracker first
        const trackerUrls = [
          'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview',
        ];
        const registerResponse = await apiClient.post(
          '/api/trackers/register',
          { urls: trackerUrls },
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );
        expect(registerResponse.status).toBe(201);
        expect(registerResponse.data.length).toBeGreaterThan(0);
        testTrackerId = registerResponse.data[0].id;

        // ACT: Get trackers without guild filter
        const response = await apiClient.get('/api/trackers', {
          headers: {
            Authorization: `Bearer ${testToken}`,
          },
          validateStatus: (status) => status < 500,
        });

        // ASSERT: Verify API contract
        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
      });

      it('should_return_404_when_user_has_no_trackers', async () => {
        // ARRANGE: Test user with no trackers (already created in beforeEach)

        // ACT: Get trackers without guild filter
        const response = await apiClient.get('/api/trackers', {
          headers: {
            Authorization: `Bearer ${testToken}`,
          },
          validateStatus: (status) => status < 500,
        });

        // ASSERT: Verify API contract
        expect(response.status).toBe(404);
      });

      it('should_return_200_with_trackers_array_when_guildId_provided_and_trackers_exist', async () => {
        // ARRANGE: Register a tracker first
        const trackerUrls = [
          'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview',
        ];
        const registerResponse = await apiClient.post(
          '/api/trackers/register',
          { urls: trackerUrls },
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );
        expect(registerResponse.status).toBe(201);
        expect(registerResponse.data.length).toBeGreaterThan(0);
        testTrackerId = registerResponse.data[0].id;

        const guildId = '123456789012345678';

        // ACT: Get trackers filtered by guild
        const response = await apiClient.get(
          `/api/trackers?guildId=${guildId}`,
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify API contract
        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
      });

      it('should_return_404_when_guildId_provided_but_no_trackers_exist', async () => {
        // ARRANGE: Test user with no trackers and guild ID
        const guildId = '123456789012345678';

        // ACT: Get trackers filtered by guild
        const response = await apiClient.get(
          `/api/trackers?guildId=${guildId}`,
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify API contract
        expect(response.status).toBe(404);
      });

      it('should_return_401_when_authentication_is_missing', async () => {
        // ARRANGE: No authentication header

        // ACT: Try to get trackers without token
        const response = await apiClient.get('/api/trackers', {
          validateStatus: (status) => status < 500,
        });

        // ASSERT: Verify authentication contract
        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/trackers/:id - Get Tracker Details', () => {
      beforeEach(async () => {
        // Register a tracker for these tests
        const trackerUrls = [
          'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview',
        ];
        const registerResponse = await apiClient.post(
          '/api/trackers/register',
          { urls: trackerUrls },
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );
        expect(registerResponse.status).toBe(201);
        expect(registerResponse.data.length).toBeGreaterThan(0);
        testTrackerId = registerResponse.data[0].id;
        testTracker = registerResponse.data[0];
      });

      it('should_return_200_with_tracker_details_when_tracker_exists', async () => {
        // ARRANGE: Test tracker already created in beforeEach
        expect(testTrackerId).toBeDefined();

        // ACT: Get tracker details
        const response = await apiClient.get(`/api/trackers/${testTrackerId}`, {
          headers: {
            Authorization: `Bearer ${testToken}`,
          },
          validateStatus: (status) => status < 500,
        });

        // ASSERT: Verify API contract
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('id', testTrackerId);
        expect(response.data).toHaveProperty('url');
      });

      it('should_return_404_when_tracker_does_not_exist', async () => {
        // ARRANGE: Non-existent tracker ID
        const nonExistentTrackerId = 'clx999999999999999999';

        // ACT: Try to get non-existent tracker
        const response = await apiClient.get(
          `/api/trackers/${nonExistentTrackerId}`,
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
    });

    describe('GET /api/trackers/:id/detail - Get Tracker Detail with Seasons', () => {
      beforeEach(async () => {
        // Register a tracker for these tests
        const trackerUrls = [
          'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview',
        ];
        const registerResponse = await apiClient.post(
          '/api/trackers/register',
          { urls: trackerUrls },
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );
        expect(registerResponse.status).toBe(201);
        expect(registerResponse.data.length).toBeGreaterThan(0);
        testTrackerId = registerResponse.data[0].id;
        testTracker = registerResponse.data[0];
      });

      it('should_return_200_with_tracker_and_seasons_when_tracker_exists', async () => {
        // ARRANGE: Test tracker already created in beforeEach
        expect(testTrackerId).toBeDefined();

        // ACT: Get tracker detail
        const response = await apiClient.get(
          `/api/trackers/${testTrackerId}/detail`,
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify API contract
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('tracker');
        expect(response.data).toHaveProperty('seasons');
        expect(Array.isArray(response.data.seasons)).toBe(true);
      });

      it('should_return_404_when_tracker_does_not_exist', async () => {
        // ARRANGE: Non-existent tracker ID
        const nonExistentTrackerId = 'clx999999999999999999';

        // ACT: Get tracker detail
        const response = await apiClient.get(
          `/api/trackers/${nonExistentTrackerId}/detail`,
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify API contract
        expect(response.status).toBe(404);
      });
    });

    describe('GET /api/trackers/:id/status - Get Scraping Status', () => {
      beforeEach(async () => {
        // Register a tracker for these tests
        const trackerUrls = [
          'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview',
        ];
        const registerResponse = await apiClient.post(
          '/api/trackers/register',
          { urls: trackerUrls },
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );
        expect(registerResponse.status).toBe(201);
        expect(registerResponse.data.length).toBeGreaterThan(0);
        testTrackerId = registerResponse.data[0].id;
        testTracker = registerResponse.data[0];
      });

      it('should_return_200_with_scraping_status_when_tracker_exists', async () => {
        // ARRANGE: Test tracker already created in beforeEach
        expect(testTrackerId).toBeDefined();

        // ACT: Get scraping status
        const response = await apiClient.get(
          `/api/trackers/${testTrackerId}/status`,
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify API contract
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('status');
      });

      it('should_return_404_when_tracker_does_not_exist', async () => {
        // ARRANGE: Non-existent tracker ID
        const nonExistentTrackerId = 'clx999999999999999999';

        // ACT: Get scraping status
        const response = await apiClient.get(
          `/api/trackers/${nonExistentTrackerId}/status`,
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify API contract
        expect(response.status).toBe(404);
      });
    });

    describe('GET /api/trackers/:id/seasons - Get Tracker Seasons', () => {
      beforeEach(async () => {
        // Register a tracker for these tests
        const trackerUrls = [
          'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview',
        ];
        const registerResponse = await apiClient.post(
          '/api/trackers/register',
          { urls: trackerUrls },
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );
        expect(registerResponse.status).toBe(201);
        expect(registerResponse.data.length).toBeGreaterThan(0);
        testTrackerId = registerResponse.data[0].id;
        testTracker = registerResponse.data[0];
      });

      it('should_return_200_with_seasons_array_when_tracker_exists', async () => {
        // ARRANGE: Test tracker already created in beforeEach
        expect(testTrackerId).toBeDefined();

        // ACT: Get tracker seasons
        const response = await apiClient.get(
          `/api/trackers/${testTrackerId}/seasons`,
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify API contract
        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
      });

      it('should_return_404_when_tracker_does_not_exist', async () => {
        // ARRANGE: Non-existent tracker ID
        const nonExistentTrackerId = 'clx999999999999999999';

        // ACT: Get tracker seasons
        const response = await apiClient.get(
          `/api/trackers/${nonExistentTrackerId}/seasons`,
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify API contract
        expect(response.status).toBe(404);
      });
    });

    describe('POST /api/trackers/:id/refresh - Refresh Tracker', () => {
      beforeEach(async () => {
        // Register a tracker for these tests
        const trackerUrls = [
          'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview',
        ];
        const registerResponse = await apiClient.post(
          '/api/trackers/register',
          { urls: trackerUrls },
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );
        expect(registerResponse.status).toBe(201);
        expect(registerResponse.data.length).toBeGreaterThan(0);
        testTrackerId = registerResponse.data[0].id;
        testTracker = registerResponse.data[0];
      });

      it('should_refresh_tracker_and_return_200_status', async () => {
        // ARRANGE: Test tracker already created in beforeEach
        expect(testTrackerId).toBeDefined();

        // ACT: Refresh tracker
        const response = await apiClient.post(
          `/api/trackers/${testTrackerId}/refresh`,
          {},
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify API contract
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('message');
      });

      it('should_return_403_when_user_does_not_own_tracker', async () => {
        // ARRANGE: Test tracker already created in beforeEach
        expect(testTrackerId).toBeDefined();

        const otherUserResult = await createTestUserWithToken(apiClient);
        const otherToken = otherUserResult.token;

        // ACT: Try to refresh tracker owned by different user
        const response = await apiClient.post(
          `/api/trackers/${testTrackerId}/refresh`,
          {},
          {
            headers: {
              Authorization: `Bearer ${otherToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify permission contract
        expect(response.status).toBe(403);

        // Cleanup other user
        await cleanupTestUser(apiClient, otherUserResult.user.id);
      });

      it('should_return_404_when_tracker_does_not_exist', async () => {
        // ARRANGE: Non-existent tracker ID
        const nonExistentTrackerId = 'clx999999999999999999';

        // ACT: Try to refresh non-existent tracker
        const response = await apiClient.post(
          `/api/trackers/${nonExistentTrackerId}/refresh`,
          {},
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
    });

    describe('PUT /api/trackers/:id - Update Tracker', () => {
      beforeEach(async () => {
        // Register a tracker for these tests
        const trackerUrls = [
          'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview',
        ];
        const registerResponse = await apiClient.post(
          '/api/trackers/register',
          { urls: trackerUrls },
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );
        expect(registerResponse.status).toBe(201);
        expect(registerResponse.data.length).toBeGreaterThan(0);
        testTrackerId = registerResponse.data[0].id;
        testTracker = registerResponse.data[0];
      });

      it('should_update_tracker_and_return_200_status', async () => {
        // ARRANGE: Test tracker already created in beforeEach
        expect(testTrackerId).toBeDefined();

        const updateData = {
          displayName: `Updated Tracker ${testId}`,
          isActive: true,
        };

        // ACT: Update tracker
        const response = await apiClient.put(
          `/api/trackers/${testTrackerId}`,
          updateData,
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify API contract
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('id', testTrackerId);
      });

      it('should_return_404_when_tracker_does_not_exist', async () => {
        // ARRANGE: Non-existent tracker ID
        const nonExistentTrackerId = 'clx999999999999999999';
        const updateData = {
          displayName: `Updated Tracker ${testId}`,
          isActive: true,
        };

        // ACT: Try to update non-existent tracker
        const response = await apiClient.put(
          `/api/trackers/${nonExistentTrackerId}`,
          updateData,
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
    });

    describe('DELETE /api/trackers/:id - Delete Tracker', () => {
      beforeEach(async () => {
        // Register a tracker for these tests
        const trackerUrls = [
          'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview',
        ];
        const registerResponse = await apiClient.post(
          '/api/trackers/register',
          { urls: trackerUrls },
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );
        expect(registerResponse.status).toBe(201);
        expect(registerResponse.data.length).toBeGreaterThan(0);
        testTrackerId = registerResponse.data[0].id;
        testTracker = registerResponse.data[0];
      });

      it('should_delete_tracker_and_return_200_status', async () => {
        // ARRANGE: Test tracker already created in beforeEach
        expect(testTrackerId).toBeDefined();

        // ACT: Delete tracker
        const response = await apiClient.delete(
          `/api/trackers/${testTrackerId}`,
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify API contract
        expect(response.status).toBe(200);

        // Clear tracker ID so it's not cleaned up again
        testTrackerId = '';
      });

      it('should_return_404_when_tracker_does_not_exist', async () => {
        // ARRANGE: Non-existent tracker ID
        const nonExistentTrackerId = 'clx999999999999999999';

        // ACT: Try to delete non-existent tracker
        const response = await apiClient.delete(
          `/api/trackers/${nonExistentTrackerId}`,
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
    });

    describe('POST /api/trackers/add - Add Additional Tracker', () => {
      it('should_add_tracker_and_return_201_status', async () => {
        // ARRANGE: Valid tracker URL
        const trackerUrl =
          'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser2/overview';

        // ACT: Add tracker
        const response = await apiClient.post(
          '/api/trackers/add',
          { url: trackerUrl },
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify API contract
        expect(response.status).toBe(201);
        expect(response.data).toHaveProperty('id');
        testTrackerId = response.data.id;
      });

      it('should_return_400_when_url_is_invalid', async () => {
        // ARRANGE: Invalid tracker URL
        const invalidUrl = 'not-a-valid-url';

        // ACT: Try to add invalid tracker
        const response = await apiClient.post(
          '/api/trackers/add',
          { url: invalidUrl },
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        // ASSERT: Verify error contract
        expect(response.status).toBe(400);
      });

      it('should_return_401_when_authentication_is_missing', async () => {
        // ARRANGE: Valid data but no auth
        const trackerUrl =
          'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview';

        // ACT: Try to add tracker without token
        const response = await apiClient.post(
          '/api/trackers/add',
          { url: trackerUrl },
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
