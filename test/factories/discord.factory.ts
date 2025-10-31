/**
 * Discord Factory - Creates test data for Discord API responses
 *
 * Single Responsibility: Generate mock Discord API response data
 * DRY: Reusable across all Phase 9 tests
 */

export class DiscordFactory {
  /**
   * Create a mock Discord guild object
   */
  static createMockGuild(
    overrides: Partial<{
      id: string;
      name: string;
      icon: string | null;
      owner: boolean;
      permissions: string;
    }> = {},
  ) {
    return {
      id: '123456789012345678',
      name: 'Test Guild',
      icon: 'icon_hash_123456789',
      owner: false,
      permissions: '2147483647',
      ...overrides,
    };
  }

  /**
   * Create multiple mock Discord guilds
   */
  static createMockGuilds(
    count: number,
    baseOverrides: Partial<{
      id: string;
      name: string;
      owner: boolean;
      permissions: string;
    }> = {},
  ): Array<{
    id: string;
    name: string;
    icon: string | null;
    owner: boolean;
    permissions: string;
  }> {
    return Array.from({ length: count }, (_, i) =>
      this.createMockGuild({
        id: `guild_${i + 1}`,
        name: `Test Guild ${i + 1}`,
        ...baseOverrides,
      }),
    );
  }

  /**
   * Create a mock Discord OAuth token response
   */
  static createMockTokenResponse(
    overrides: Partial<{
      access_token: string;
      refresh_token: string;
      expires_in: number;
      scope: string;
    }> = {},
  ) {
    return {
      access_token: 'mock_access_token_123456789',
      token_type: 'Bearer',
      expires_in: 604800,
      refresh_token: 'mock_refresh_token_123456789',
      scope: 'identify email guilds',
      ...overrides,
    };
  }

  /**
   * Create a mock Discord user profile
   */
  static createMockUser(
    overrides: Partial<{
      id: string;
      username: string;
      discriminator: string;
      global_name: string | null;
      avatar: string | null;
      email: string | null;
    }> = {},
  ) {
    return {
      id: '123456789012345678',
      username: 'testuser',
      discriminator: '1234',
      global_name: 'Test User',
      avatar: 'a_icon_hash_123456789',
      email: 'test@example.com',
      verified: true,
      ...overrides,
    };
  }

  /**
   * Create a mock Discord error response
   */
  static createMockErrorResponse(status: number, message: string) {
    return {
      response: {
        status,
        statusText: message,
        data: {
          message,
          code: status,
        },
        headers: {},
        config: {} as any,
      },
      message,
    };
  }
}
