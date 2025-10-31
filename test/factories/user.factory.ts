import {
  User,
  UserCreateDto,
  UserUpdateDto,
  UserProfile,
  UserStats,
} from '../../src/common/interfaces/user.interface';

/**
 * User Factory - Creates test user data following DRY principles
 *
 * Reduces duplication across tests and ensures consistent test data
 */

export class UserFactory {
  /**
   * Create a mock User object with default values
   */
  static createMockUser(overrides: Partial<User> = {}): User {
    const now = new Date();
    return {
      id: '123456789012345678',
      username: 'testuser',
      discriminator: '1234',
      globalName: 'Test User',
      avatar: 'avatar_hash_123',
      email: 'test@example.com',
      accessToken: 'access_token_123',
      refreshToken: 'refresh_token_123',
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
      ...overrides,
    };
  }

  /**
   * Create a mock UserCreateDto with default values
   */
  static createMockUserCreateDto(
    overrides: Partial<UserCreateDto> = {},
  ): UserCreateDto {
    return {
      id: '123456789012345678',
      username: 'testuser',
      discriminator: '1234',
      globalName: 'Test User',
      avatar: 'avatar_hash_123',
      email: 'test@example.com',
      accessToken: 'access_token_123',
      refreshToken: 'refresh_token_123',
      ...overrides,
    };
  }

  /**
   * Create a mock UserUpdateDto with default values
   */
  static createMockUserUpdateDto(
    overrides: Partial<UserUpdateDto> = {},
  ): UserUpdateDto {
    return {
      username: 'updateduser',
      globalName: 'Updated User',
      avatar: 'updated_avatar_hash',
      email: 'updated@example.com',
      ...overrides,
    };
  }

  /**
   * Create a mock UserProfile with default values
   */
  static createMockUserProfile(
    overrides: Partial<UserProfile> = {},
  ): UserProfile {
    const now = new Date();
    return {
      id: '123456789012345678',
      username: 'testuser',
      globalName: 'Test User',
      avatar: 'avatar_hash_123',
      email: 'test@example.com',
      createdAt: now,
      lastLoginAt: now,
      ...overrides,
    };
  }

  /**
   * Create a mock UserStats with default values
   */
  static createMockUserStats(overrides: Partial<UserStats> = {}): UserStats {
    return {
      userId: '123456789012345678',
      gamesPlayed: 10,
      wins: 7,
      losses: 3,
      winRate: 0.7,
      ...overrides,
    };
  }

  /**
   * Create multiple mock users for testing lists
   */
  static createMockUsers(
    count: number,
    baseOverrides: Partial<User> = {},
  ): User[] {
    return Array.from({ length: count }, (_, index) =>
      this.createMockUser({
        id: `${123456789012345678 + index}`,
        username: `testuser${index}`,
        globalName: `Test User ${index}`,
        ...baseOverrides,
      }),
    );
  }

  /**
   * Create Discord OAuth data for testing
   */
  static createMockDiscordData(overrides: Partial<any> = {}) {
    return {
      discordId: '123456789012345678',
      username: 'testuser',
      discriminator: '1234',
      globalName: 'Test User',
      avatar: 'avatar_hash_123',
      email: 'test@example.com',
      accessToken: 'access_token_123',
      refreshToken: 'refresh_token_123',
      ...overrides,
    };
  }
}
