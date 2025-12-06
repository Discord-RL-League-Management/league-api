/**
 * Users API Integration Tests
 * 
 * Demonstrates contract verification using Axios.
 * Focus: API contracts, stateless tests, synthetic data.
 * 
 * Aligned with ISO/IEC/IEEE 29119 standards.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { apiClient, API_BASE_URL } from '../setup/api-setup';
import { createUserData } from '../factories/user.factory';
import { generateTestId, cleanupTestData, cleanupTestUser } from '../utils/test-helpers';

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

describe.skipIf(!isServerAvailable)('Users API - Contract Verification', () => {
  const testId = generateTestId();
  let createdUserId: string | null = null;
  let testUser: any = null;

  beforeEach(async () => {
    // Create a test user for update/delete tests
    const userData = createUserData({
      username: `testuser_${testId}_${Date.now()}`,
    });
    const createResponse = await apiClient.post('/internal/users', userData, {
      headers: {
        Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
      },
    });
    testUser = createResponse.data;
  });

  afterEach(async () => {
    // Clean up test user - always attempt, catch errors
    try {
      await cleanupTestUser(apiClient, testUser?.id);
    } catch (error) {
      // Ignore cleanup errors (resource may not exist or already deleted)
    }
    testUser = null;
  });

  afterAll(async () => {
    // Teardown: Clean up test data - always attempt, catch errors
    try {
      await cleanupTestData(testId);
    } catch (error) {
      // Ignore cleanup errors (resource may not exist or already deleted)
    }
  });

  describe('POST /internal/users - Create User', () => {
    it('should_create_user_with_valid_data_and_return_201_status', async () => {
      // ARRANGE: Prepare synthetic test data
      const userData = createUserData({
        username: `testuser_${testId}`,
        email: `test_${testId}@example.com`,
      });

      // ACT: Make API request
      const response = await apiClient.post('/internal/users', userData, {
        headers: {
          Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
        },
      });

      // ASSERT: Verify API contract (status, response structure)
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      expect(response.data).toHaveProperty('username', userData.username);
      expect(response.data).toHaveProperty('email', userData.email);

      // Store for cleanup
      createdUserId = response.data.id;
    });

    it('should_return_400_when_required_fields_are_missing', async () => {
      // ARRANGE: Invalid data (missing required fields)
      const invalidData = {};

      // ACT
      const response = await apiClient.post('/internal/users', invalidData, {
        headers: {
          Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
        },
        validateStatus: (status) => status < 500, // Don't throw on 4xx
      });

      // ASSERT: Verify error contract
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    });

    it('should_return_401_when_authentication_is_missing', async () => {
      // ARRANGE: Valid data but no auth
      const userData = createUserData();

      // ACT
      const response = await apiClient.post('/internal/users', userData, {
        validateStatus: (status) => status < 500,
      });

      // ASSERT: Verify authentication contract
      expect(response.status).toBe(401);
    });
  });

  describe('GET /internal/users/:id - Get User', () => {
    it('should_return_user_data_when_user_exists', async () => {
      // ARRANGE: Create user first
      const userData = createUserData({
        username: `getuser_${testId}`,
      });

      const createResponse = await apiClient.post('/internal/users', userData, {
        headers: {
          Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
        },
      });

      const userId = createResponse.data.id;

      // ACT: Retrieve user
      const response = await apiClient.get(`/internal/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
        },
      });

      // ASSERT: Verify response contract
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id', userId);
      expect(response.data).toHaveProperty('username', userData.username);
    });

    it('should_return_404_when_user_does_not_exist', async () => {
      // ARRANGE: Non-existent user ID
      const nonExistentId = `user_${testId}_nonexistent`;

      // ACT
      const response = await apiClient.get(`/internal/users/${nonExistentId}`, {
        headers: {
          Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
        },
        validateStatus: (status) => status < 500,
      });

      // ASSERT: Verify error contract
      expect(response.status).toBe(404);
    });
  });

  describe('GET /internal/users - List Users', () => {
    it('should_return_array_of_users_with_valid_structure', async () => {
      // ACT: List users
      const response = await apiClient.get('/internal/users', {
        headers: {
          Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
        },
      });

      // ASSERT: Verify response contract
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it('should_return_users_with_valid_structure_when_array_contains_items', async () => {
      // ARRANGE: Ensure at least one user exists (created in beforeEach)
      // This test verifies structure when users exist
      
      // ACT: List users
      const response = await apiClient.get('/internal/users', {
        headers: {
          Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
        },
      });

      // ASSERT: Verify response contract
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      
      // Verify structure - test assumes users exist (created in beforeEach)
      // This test will fail if no users exist, which is acceptable test behavior
      expect(response.data.length).toBeGreaterThan(0);
      expect(response.data[0]).toHaveProperty('id');
      expect(response.data[0]).toHaveProperty('username');
    });
  });

  describe('PATCH /internal/users/:id - Update User', () => {
    it('should_update_user_and_return_200_status', async () => {
      // ARRANGE: Test user already created in beforeEach
      const updateData = {
        username: `updated_${testUser.username}`,
        globalName: `Updated Global Name ${testId}`,
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
      expect(response.data).toHaveProperty('globalName', updateData.globalName);
    });

    it('should_update_partial_fields_and_return_200_status', async () => {
      // ARRANGE: Test user already created in beforeEach
      const updateData = {
        email: `updated_${testId}@example.com`,
      };

      // ACT: Update user with partial data
      const response = await apiClient.patch(`/internal/users/${testUser.id}`, updateData, {
        headers: {
          Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
        },
      });

      // ASSERT: Verify API contract
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id', testUser.id);
      expect(response.data).toHaveProperty('email', updateData.email);
    });

    it('should_return_404_when_user_does_not_exist', async () => {
      // ARRANGE: Non-existent user ID
      const nonExistentId = `user_${testId}_nonexistent`;
      const updateData = {
        username: 'updated_username',
      };

      // ACT: Try to update non-existent user
      const response = await apiClient.patch(`/internal/users/${nonExistentId}`, updateData, {
        headers: {
          Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
        },
        validateStatus: (status) => status < 500,
      });

      // ASSERT: Verify error contract
      expect(response.status).toBe(404);
    });

    it('should_return_401_when_authentication_is_missing', async () => {
      // ARRANGE: Valid data but no auth
      const updateData = {
        username: 'updated_username',
      };

      // ACT: Try to update without token
      const response = await apiClient.patch(`/internal/users/${testUser.id}`, updateData, {
        validateStatus: (status) => status < 500,
      });

      // ASSERT: Verify authentication contract
      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /internal/users/:id - Delete User', () => {
    it('should_delete_user_and_return_200_status', async () => {
      // ARRANGE: Create a separate user for deletion test
      const userData = createUserData({
        username: `deleteuser_${testId}_${Date.now()}`,
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
      const nonExistentId = `user_${testId}_nonexistent`;

      // ACT: Try to delete non-existent user
      const response = await apiClient.delete(`/internal/users/${nonExistentId}`, {
        headers: {
          Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
        },
        validateStatus: (status) => status < 500,
      });

      // ASSERT: Verify error contract
      expect(response.status).toBe(404);
    });

    it('should_return_401_when_authentication_is_missing', async () => {
      // ARRANGE: No authentication header

      // ACT: Try to delete without token
      const response = await apiClient.delete(`/internal/users/${testUser.id}`, {
        validateStatus: (status) => status < 500,
      });

      // ASSERT: Verify authentication contract
      expect(response.status).toBe(401);
    });

    it('should_verify_user_is_deleted_after_deletion', async () => {
      // ARRANGE: Create a separate user for deletion verification test
      const userData = createUserData({
        username: `verifydelete_${testId}_${Date.now()}`,
      });
      const createResponse = await apiClient.post('/internal/users', userData, {
        headers: {
          Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
        },
      });
      const userIdToDelete = createResponse.data.id;

      // ACT: Delete user
      await apiClient.delete(`/internal/users/${userIdToDelete}`, {
        headers: {
          Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
        },
      });

      // ACT: Try to get deleted user
      const getResponse = await apiClient.get(`/internal/users/${userIdToDelete}`, {
        headers: {
          Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
        },
        validateStatus: (status) => status < 500,
      });

      // ASSERT: Verify user is deleted
      expect(getResponse.status).toBe(404);
    });
  });
});

