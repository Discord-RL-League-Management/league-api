/**
 * User Factory
 *
 * Synthetic data factory for creating test user data.
 * Aligned with ISO/IEC/IEEE 29119 standards for Test Data Management.
 */

export interface UserFactoryData {
  id?: string;
  username?: string;
  globalName?: string;
  avatar?: string;
  email?: string;
  discordId?: string;
  isBanned?: boolean;
  isDeleted?: boolean;
}

/**
 * Creates synthetic user data for testing
 *
 * @param overrides - Optional overrides for default values
 * @returns User data object
 */
export function createUserData(
  overrides: UserFactoryData = {},
): UserFactoryData {
  const timestamp = Date.now();
  const randomSuffix = Math.floor(Math.random() * 10000);

  return {
    id: `user_${timestamp}_${randomSuffix}`,
    username: `testuser_${randomSuffix}`,
    globalName: `Test User ${randomSuffix}`,
    avatar: `avatar_hash_${randomSuffix}`,
    email: `test_${randomSuffix}@example.com`,
    discordId: `${timestamp}${randomSuffix}`,
    isBanned: false,
    isDeleted: false,
    ...overrides,
  };
}

/**
 * Creates multiple synthetic users
 *
 * @param count - Number of users to create
 * @returns Array of user data objects
 */
export function createMultipleUsers(count: number): UserFactoryData[] {
  return Array.from({ length: count }, () => createUserData());
}

