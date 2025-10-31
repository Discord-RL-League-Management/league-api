/**
 * Guild Factory - Creates test data for Guild model
 *
 * Single Responsibility: Generate mock Guild database model data
 * DRY: Reusable across all Phase 9 tests
 */

export class GuildFactory {
  /**
   * Create a mock Guild database object
   */
  static createMockGuild(
    overrides: Partial<{
      id: string;
      name: string;
      icon: string | null;
      createdAt: Date;
      updatedAt: Date;
    }> = {},
  ) {
    const now = new Date();
    return {
      id: '123456789012345678',
      name: 'Test Guild',
      icon: 'icon_hash_123456789',
      createdAt: now,
      updatedAt: now,
      settings: {},
      ...overrides,
    };
  }

  /**
   * Create multiple mock Guilds
   */
  static createMockGuilds(
    count: number,
    baseOverrides: Partial<{
      id: string;
      name: string;
    }> = {},
  ) {
    return Array.from({ length: count }, (_, i) =>
      this.createMockGuild({
        id: `guild_${i + 1}`,
        name: `Test Guild ${i + 1}`,
        ...baseOverrides,
      }),
    );
  }

  /**
   * Create a mock GuildMember database object
   */
  static createMockGuildMember(
    overrides: Partial<{
      userId: string;
      guildId: string;
      isAdmin: boolean;
      createdAt: Date;
    }> = {},
  ) {
    const now = new Date();
    return {
      userId: 'user123',
      guildId: 'guild123',
      isAdmin: false,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  }

  /**
   * Create multiple mock GuildMembers
   */
  static createMockGuildMembers(
    count: number,
    userId: string,
    baseOverrides: Partial<{
      guildId: string;
      isAdmin: boolean;
    }> = {},
  ) {
    return Array.from({ length: count }, (_, i) =>
      this.createMockGuildMember({
        userId,
        guildId: `guild_${i + 1}`,
        ...baseOverrides,
      }),
    );
  }
}
