import { GuildSettings } from '../../guilds/interfaces/settings.interface';

/**
 * IPermissionProvider - Interface for permission checking operations
 *
 * Abstracts PermissionCheckService to enable dependency inversion.
 * This interface allows CommonModule to depend on abstractions rather than
 * concrete implementations, breaking cross-boundary coupling.
 */
export interface IPermissionProvider {
  /**
   * Check if user roles include admin roles from guild settings
   * @param userRoles - Array of role IDs the user has
   * @param guildId - Discord guild ID
   * @param guildSettings - Guild settings containing admin role configuration
   * @param validateWithDiscord - Whether to validate roles with Discord API
   * @returns true if user has admin role, false otherwise
   */
  checkAdminRoles(
    userRoles: string[],
    guildId: string,
    guildSettings: GuildSettings | Record<string, unknown>,
    validateWithDiscord: boolean,
  ): Promise<boolean>;
}
