/**
 * Test Helpers
 * 
 * Shared utilities for test execution.
 * Ensures stateless, parallel-executable tests.
 */

/**
 * Generates a unique identifier for test isolation
 * 
 * @returns Unique identifier string
 */
export function generateTestId(): string {
  return `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Waits for a condition to be true (for async operations)
 * 
 * @param condition - Function that returns true when condition is met
 * @param timeout - Maximum time to wait in milliseconds
 * @param interval - Check interval in milliseconds
 * @returns Promise that resolves when condition is met
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100,
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Cleans up test data (placeholder for database cleanup utilities)
 * 
 * @param testId - Test identifier for cleanup
 */
export async function cleanupTestData(testId: string): Promise<void> {
  // Implementation would depend on database setup
  // This is a placeholder for test data cleanup
  console.log(`Cleaning up test data for: ${testId}`);
}

/**
 * Creates a test user via bot API and returns user data with JWT token
 * 
 * @param apiClient - Axios instance for API calls
 * @param userData - Optional user data overrides
 * @returns Object containing user data and JWT token
 */
export async function createTestUserWithToken(
  apiClient: any,
  userData: any = {},
): Promise<{ user: any; token: string }> {
  const { createUserData } = await import('../factories/user.factory.js');
  const { generateJwtToken, createAuthData } = await import('../factories/auth.factory.js');
  
  const testUserData = createUserData(userData);
  
  // Create user via bot API
  const createResponse = await apiClient.post('/internal/users', testUserData, {
    headers: {
      Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
    },
  });
  
  const createdUser = createResponse.data;
  
  // Generate JWT token for the user
  const authData = createAuthData({
    userId: createdUser.id,
    username: createdUser.username,
    globalName: createdUser.globalName,
    avatar: createdUser.avatar,
    email: createdUser.email,
  });
  
  const token = generateJwtToken(authData, process.env.JWT_SECRET || 'test-secret-key');
  
  return {
    user: createdUser,
    token,
  };
}

/**
 * Generates a JWT token for a test user
 * 
 * @param userId - User ID
 * @param username - Username
 * @param options - Optional user data
 * @returns JWT token string
 */
export async function generateJwtTokenForUser(
  userId: string,
  username: string,
  options: {
    globalName?: string;
    avatar?: string;
    email?: string;
    guilds?: Array<{ id: string }>;
  } = {},
): Promise<string> {
  const { generateJwtToken } = await import('../factories/auth.factory.js');
  
  return generateJwtToken(
    {
      userId,
      username,
      ...options,
    },
    process.env.JWT_SECRET || 'test-secret-key',
  );
}

/**
 * Cleans up a test user
 * 
 * @param apiClient - Axios instance for API calls
 * @param userId - User ID to clean up (optional, handles undefined/null)
 */
export async function cleanupTestUser(
  apiClient: any,
  userId?: string | null,
): Promise<void> {
  // Always attempt cleanup - function handles undefined/null userId gracefully
  if (!userId) {
    return;
  }
  
  try {
    await apiClient.delete(`/internal/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
      },
    });
  } catch (error) {
    // Ignore errors during cleanup (user may not exist)
    console.log(`Cleanup warning: Could not delete user ${userId}`);
  }
}

