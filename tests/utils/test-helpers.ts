/**
 * Test Helpers
 * 
 * Shared utilities for test execution.
 * Ensures stateless, parallel-executable tests.
 */

import { vi } from 'vitest';
import type { ILoggingService } from '@/infrastructure/logging/interfaces/logging.interface';
import type {
  ITransactionService,
  ITransactionClient,
} from '@/infrastructure/transactions/interfaces/transaction.interface';
import type { IConfigurationService } from '@/infrastructure/configuration/interfaces/configuration.interface';
import type { ICachingService } from '@/infrastructure/caching/interfaces/caching.interface';

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
export function cleanupTestData(testId: string): void {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiClient: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userData: Record<string, unknown> = {},
): Promise<{ 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any; 
  token: string 
}> {
  const { createUserData } = await import('../factories/user.factory.js');
  const { generateJwtToken, createAuthData } = await import('../factories/auth.factory.js');
  
  const testUserData = createUserData(userData as import('../factories/user.factory.js').UserFactoryData);
  
  // Create user via bot API
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  const createResponse = await apiClient.post('/internal/users', testUserData, {
    headers: {
      Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
    },
  });
  
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const createdUser = createResponse.data;
  
  // Generate JWT token for the user
  const authData = createAuthData({
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    userId: createdUser.id,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    username: createdUser.username,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    globalName: createdUser.globalName,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    avatar: createdUser.avatar,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    email: createdUser.email,
  });
  
  const token = generateJwtToken(authData, process.env.JWT_SECRET || 'test-secret-key');
  
  return {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiClient: any,
  userId?: string | null,
): Promise<void> {
  // Always attempt cleanup - function handles undefined/null userId gracefully
  if (!userId) {
    return;
  }
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await apiClient.delete(`/internal/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${process.env.BOT_API_KEY || ''}`,
      },
    });
  } catch {
    // Ignore errors during cleanup (user may not exist)
    console.log(`Cleanup warning: Could not delete user ${userId}`);
  }
}

/**
 * Creates a mock ILoggingService for unit tests
 * 
 * @returns Mock ILoggingService with all methods stubbed
 */
export function createMockLoggingService(): ILoggingService {
  return {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    verbose: vi.fn(),
  };
}

/**
 * Creates a mock ITransactionService for unit tests
 * 
 * @param mockTransactionClient - Optional mock transaction client to use
 * @returns Mock ITransactionService with executeTransaction stubbed
 */
export function createMockTransactionService(
  mockTransactionClient?: ITransactionClient,
): ITransactionService {
  return {
    executeTransaction: vi.fn().mockImplementation(
      async <T>(callback: (tx: ITransactionClient) => Promise<T>): Promise<T> => {
        const tx = mockTransactionClient || ({} as ITransactionClient);
        return callback(tx);
      },
    ),
  };
}

/**
 * Creates a mock IConfigurationService for unit tests
 * 
 * @param initialConfig - Optional initial configuration values
 * @returns Mock IConfigurationService with get method stubbed
 */
export function createMockConfigurationService(
  initialConfig: Record<string, unknown> = {},
): IConfigurationService {
  const config = { ...initialConfig };
  return {
    get: vi.fn().mockImplementation(<T>(key: string, defaultValue?: T): T | undefined => {
      const keys = key.split('.');
      let value: unknown = config;
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = (value as Record<string, unknown>)[k];
        } else {
          return defaultValue;
        }
      }
      return (value as T) ?? defaultValue;
    }),
  };
}

/**
 * Creates a mock ICachingService for unit tests
 * 
 * @returns Mock ICachingService with all methods stubbed
 */
export function createMockCachingService(): ICachingService {
  return {
    get: vi.fn().mockResolvedValue(undefined),
    set: vi.fn().mockResolvedValue(undefined),
    del: vi.fn().mockResolvedValue(undefined),
    reset: vi.fn().mockResolvedValue(undefined),
  };
}

