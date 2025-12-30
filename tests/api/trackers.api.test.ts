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
  beforeEach,
  afterEach,
  vi,
} from 'vitest';
import { apiClient, API_BASE_URL } from '../setup/api-setup';
import {
  generateTestId,
  createTestUserWithToken,
  cleanupTestUser,
} from '../utils/test-helpers';

// Check if API server is available before running tests
let isServerAvailable = false;

/**
 * Verifies a paginated API response structure
 * Reduces assertion count from 16+ to 1 function call
 */
function verifyPaginatedResponse(
  response: any,
  expectedPage?: number,
  expectedLimit?: number,
): void {
  /* eslint-disable vitest/max-expects */
  expect(response.status).toBe(200);
  expect(response.data).toHaveProperty('data');
  expect(response.data).toHaveProperty('pagination');
  expect(Array.isArray(response.data.data)).toBe(true);

  const pagination = response.data.pagination;
  expect(pagination).toHaveProperty('page');
  expect(pagination).toHaveProperty('limit');
  expect(pagination).toHaveProperty('total');
  expect(pagination).toHaveProperty('pages');
  expect(typeof pagination.page).toBe('number');
  expect(typeof pagination.limit).toBe('number');
  expect(typeof pagination.total).toBe('number');
  expect(typeof pagination.pages).toBe('number');
  expect(pagination.page).toBeGreaterThanOrEqual(1);
  expect(pagination.limit).toBeGreaterThan(0);
  expect(pagination.total).toBeGreaterThanOrEqual(0);
  expect(pagination.pages).toBeGreaterThanOrEqual(0);

  const pageMatches =
    expectedPage === undefined || pagination.page === expectedPage;
  const limitMatches =
    expectedLimit === undefined || pagination.limit === expectedLimit;
  expect(pageMatches).toBe(true);
  expect(limitMatches).toBe(true);
  /* eslint-enable vitest/max-expects */
}

/**
 * Registers a test tracker and returns its ID
 * Reduces duplication across tests
 */
async function registerTestTracker(
  token: string,
  trackerUrl = 'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview',
): Promise<string> {
  const trackerUrls = [trackerUrl];
  const registerResponse = await apiClient.post(
    '/api/trackers/register',
    { urls: trackerUrls },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      validateStatus: (status) => status < 500,
    },
  );
  expect(registerResponse.status).toBe(201);
  expect(registerResponse.data.length).toBeGreaterThan(0);
  return registerResponse.data[0].id;
}

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
  'Trackers API - Contract Verification',
  () => {
    const testId = generateTestId();
    let testUser: any = null;
    let testToken: string = '';
    let testTrackerId: string = '';

    beforeEach(async () => {
      // Create test user and get JWT token
      const userResult = await createTestUserWithToken(apiClient);
      testUser = userResult.user;
      testToken = userResult.token;
    });

    afterEach(async () => {
      // Capture state values before reset to prevent cross-test contamination
      const currentTrackerId = testTrackerId;
      const currentToken = testToken;
      const currentUser = testUser;

      // Reset state immediately to prevent cross-test contamination
      testTrackerId = '';
      testUser = null;
      testToken = '';

      // Clean up test tracker - always attempt, catch errors
      if (currentTrackerId) {
        try {
          await apiClient.delete(`/api/trackers/${currentTrackerId}`, {
            headers: {
              Authorization: `Bearer ${currentToken}`,
            },
          });
        } catch {
          // Ignore cleanup errors
        }
      }

      // Clean up test user - always attempt, catch errors
      if (currentUser?.id) {
        try {
          await cleanupTestUser(apiClient, currentUser.id);
        } catch {
          // Ignore cleanup errors
        }
      }

      // Clear mocks for test isolation (TQA: restore-mocks)
      vi.clearAllMocks();
    });

    describe('POST /api/trackers/register - Register Trackers', () => {
      it('should_register_trackers_and_return_201_status', async () => {
        const trackerUrls = [
          'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser1/overview',
        ];

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

        expect(response.status).toBe(201);
        expect(Array.isArray(response.data)).toBe(true);
        expect(response.data.length).toBeGreaterThan(0);
        testTrackerId = response.data[0].id;
      });

      it('should_return_400_when_urls_are_invalid', async () => {
        const invalidUrls = ['not-a-valid-url', 'http://invalid.com'];

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

        expect(response.status).toBe(400);
      });

      it('should_return_400_when_more_than_4_urls_provided', async () => {
        const tooManyUrls = Array.from(
          { length: 5 },
          (_, i) =>
            `https://rocketleague.tracker.network/rocket-league/profile/steam/testuser${i}/overview`,
        );

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

        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.status).toBeLessThan(500);
      });

      it('should_return_401_when_authentication_is_missing', async () => {
        const trackerUrls = [
          'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview',
        ];

        const response = await apiClient.post(
          '/api/trackers/register',
          { urls: trackerUrls },
          {
            validateStatus: (status) => status < 500,
          },
        );

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/trackers/me - Get Current User Trackers', () => {
      // eslint-disable-next-line vitest/expect-expect
      it('should_return_200_with_paginated_trackers_when_user_has_trackers', async () => {
        testTrackerId = await registerTestTracker(testToken);

        const response = await apiClient.get('/api/trackers/me', {
          headers: {
            Authorization: `Bearer ${testToken}`,
          },
          validateStatus: (status) => status < 500,
        });

        verifyPaginatedResponse(response);
      });

      it('should_return_404_when_user_has_no_trackers', async () => {
        const response = await apiClient.get('/api/trackers/me', {
          headers: {
            Authorization: `Bearer ${testToken}`,
          },
          validateStatus: (status) => status < 500,
        });

        expect(response.status).toBe(404);
      });

      it('should_return_401_when_authentication_is_missing', async () => {
        const response = await apiClient.get('/api/trackers/me', {
          validateStatus: (status) => status < 500,
        });

        expect(response.status).toBe(401);
      });

      it('should_filter_by_platform_when_platform_query_param_provided', async () => {
        testTrackerId = await registerTestTracker(testToken);

        const response = await apiClient.get('/api/trackers/me', {
          params: { platform: 'STEAM' },
          headers: {
            Authorization: `Bearer ${testToken}`,
          },
          validateStatus: (status) => status < 500,
        });

        verifyPaginatedResponse(response);
        // If results exist, verify platform filter
        const allMatchPlatform = response.data.data.every(
          (tracker: any) => tracker.platform === 'STEAM',
        );
        expect(allMatchPlatform || response.data.data.length === 0).toBe(true);
      });

      it('should_paginate_results_when_page_and_limit_provided', async () => {
        testTrackerId = await registerTestTracker(testToken);

        const response = await apiClient.get('/api/trackers/me', {
          params: { page: 1, limit: 10 },
          headers: {
            Authorization: `Bearer ${testToken}`,
          },
          validateStatus: (status) => status < 500,
        });

        verifyPaginatedResponse(response, 1, 10);
        expect(response.data.data.length).toBeLessThanOrEqual(10);
      });

      // eslint-disable-next-line vitest/expect-expect
      it('should_sort_results_when_sortBy_and_sortOrder_provided', async () => {
        testTrackerId = await registerTestTracker(testToken);

        const response = await apiClient.get('/api/trackers/me', {
          params: { sortBy: 'createdAt', sortOrder: 'desc' },
          headers: {
            Authorization: `Bearer ${testToken}`,
          },
          validateStatus: (status) => status < 500,
        });

        verifyPaginatedResponse(response);
      });

      it('should_filter_by_isActive_when_isActive_query_param_provided', async () => {
        testTrackerId = await registerTestTracker(testToken);

        const response = await apiClient.get('/api/trackers/me', {
          params: { isActive: true },
          headers: {
            Authorization: `Bearer ${testToken}`,
          },
          validateStatus: (status) => status < 500,
        });

        verifyPaginatedResponse(response);
        // If results exist, verify isActive filter
        const allMatchActive = response.data.data.every(
          (tracker: any) => tracker.isActive === true,
        );
        expect(allMatchActive || response.data.data.length === 0).toBe(true);
      });
    });

    describe('GET /api/trackers - Get Trackers', () => {
      // eslint-disable-next-line vitest/expect-expect
      it('should_return_200_with_paginated_trackers_when_user_has_trackers', async () => {
        testTrackerId = await registerTestTracker(testToken);

        const response = await apiClient.get('/api/trackers', {
          headers: {
            Authorization: `Bearer ${testToken}`,
          },
          validateStatus: (status) => status < 500,
        });

        verifyPaginatedResponse(response);
      });

      it('should_return_404_when_user_has_no_trackers', async () => {
        const response = await apiClient.get('/api/trackers', {
          headers: {
            Authorization: `Bearer ${testToken}`,
          },
          validateStatus: (status) => status < 500,
        });

        expect(response.status).toBe(404);
      });

      it('should_return_401_when_authentication_is_missing', async () => {
        const response = await apiClient.get('/api/trackers', {
          validateStatus: (status) => status < 500,
        });

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
      });

      it('should_return_200_with_tracker_details_when_tracker_exists', async () => {
        expect(testTrackerId).toBeDefined();

        const response = await apiClient.get(`/api/trackers/${testTrackerId}`, {
          headers: {
            Authorization: `Bearer ${testToken}`,
          },
          validateStatus: (status) => status < 500,
        });

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('id', testTrackerId);
        expect(response.data).toHaveProperty('url');
      });

      it('should_return_404_when_tracker_does_not_exist', async () => {
        const nonExistentTrackerId = 'clx999999999999999999';

        const response = await apiClient.get(
          `/api/trackers/${nonExistentTrackerId}`,
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
      });

      it('should_return_200_with_tracker_and_seasons_when_tracker_exists', async () => {
        expect(testTrackerId).toBeDefined();

        const response = await apiClient.get(
          `/api/trackers/${testTrackerId}/detail`,
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('tracker');
        expect(response.data).toHaveProperty('seasons');
        expect(Array.isArray(response.data.seasons)).toBe(true);
      });

      it('should_return_404_when_tracker_does_not_exist', async () => {
        const nonExistentTrackerId = 'clx999999999999999999';

        const response = await apiClient.get(
          `/api/trackers/${nonExistentTrackerId}/detail`,
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
      });

      it('should_return_200_with_scraping_status_when_tracker_exists', async () => {
        expect(testTrackerId).toBeDefined();

        const response = await apiClient.get(
          `/api/trackers/${testTrackerId}/status`,
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('status');
      });

      it('should_return_404_when_tracker_does_not_exist', async () => {
        const nonExistentTrackerId = 'clx999999999999999999';

        const response = await apiClient.get(
          `/api/trackers/${nonExistentTrackerId}/status`,
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
      });

      it('should_return_200_with_seasons_array_when_tracker_exists', async () => {
        expect(testTrackerId).toBeDefined();

        const response = await apiClient.get(
          `/api/trackers/${testTrackerId}/seasons`,
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
      });

      it('should_return_404_when_tracker_does_not_exist', async () => {
        const nonExistentTrackerId = 'clx999999999999999999';

        const response = await apiClient.get(
          `/api/trackers/${nonExistentTrackerId}/seasons`,
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
      });

      it('should_update_tracker_and_return_200_status', async () => {
        expect(testTrackerId).toBeDefined();

        const updateData = {
          displayName: `Updated Tracker ${testId}`,
          isActive: true,
        };

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

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('id', testTrackerId);
      });

      it('should_return_404_when_tracker_does_not_exist', async () => {
        const nonExistentTrackerId = 'clx999999999999999999';
        const updateData = {
          displayName: `Updated Tracker ${testId}`,
          isActive: true,
        };

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
      });

      it('should_delete_tracker_and_return_200_status', async () => {
        expect(testTrackerId).toBeDefined();

        const response = await apiClient.delete(
          `/api/trackers/${testTrackerId}`,
          {
            headers: {
              Authorization: `Bearer ${testToken}`,
            },
            validateStatus: (status) => status < 500,
          },
        );

        expect(response.status).toBe(200);

        // Clear tracker ID so it's not cleaned up again
        testTrackerId = '';
      });

      it('should_return_404_when_tracker_does_not_exist', async () => {
        const nonExistentTrackerId = 'clx999999999999999999';

        const response = await apiClient.delete(
          `/api/trackers/${nonExistentTrackerId}`,
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

    describe('POST /api/trackers/add - Add Additional Tracker', () => {
      it('should_add_tracker_and_return_201_status', async () => {
        const trackerUrl =
          'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser2/overview';

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

        expect(response.status).toBe(201);
        expect(response.data).toHaveProperty('id');
        testTrackerId = response.data.id;
      });

      it('should_return_400_when_url_is_invalid', async () => {
        const invalidUrl = 'not-a-valid-url';

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

        expect(response.status).toBe(400);
      });

      it('should_return_401_when_authentication_is_missing', async () => {
        const trackerUrl =
          'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview';

        const response = await apiClient.post(
          '/api/trackers/add',
          { url: trackerUrl },
          {
            validateStatus: (status) => status < 500,
          },
        );

        expect(response.status).toBe(401);
      });
    });
  },
);
