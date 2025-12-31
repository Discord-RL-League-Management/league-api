import type { InjectionToken } from '@nestjs/common';

/**
 * GuildPermissions - Result of guild permission check
 */
export interface GuildPermissions {
  isMember: boolean;
  permissions: string[];
  roles: string[];
  hasAdministratorPermission?: boolean;
}

/**
 * IDiscordProvider - Interface for Discord API operations
 *
 * Abstracts DiscordApiService to enable dependency inversion.
 * This interface allows CommonModule to depend on abstractions rather than
 * concrete implementations, breaking cross-boundary coupling.
 */
export interface IDiscordProvider {
  /**
   * Check user's permissions in a Discord guild
   * @param accessToken - User's Discord access token
   * @param guildId - Discord guild ID
   * @returns Guild permissions information
   */
  checkGuildPermissions(
    accessToken: string,
    guildId: string,
  ): Promise<GuildPermissions>;
}

export const IDiscordProvider = Symbol(
  'IDiscordProvider',
) as InjectionToken<IDiscordProvider>;
