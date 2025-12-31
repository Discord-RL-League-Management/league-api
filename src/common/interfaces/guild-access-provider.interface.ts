import type { InjectionToken } from '@nestjs/common';
import { GuildSettings } from '../../guilds/interfaces/settings.interface';

/**
 * GuildMember - Minimal interface for guild member data needed by AdminGuard
 */
export interface GuildMember {
  id: string;
  userId: string;
  guildId: string;
  roles: string[];
  [key: string]: unknown;
}

/**
 * IGuildAccessProvider - Interface for guild access operations
 *
 * Abstracts GuildSettingsService and GuildMembersService to enable dependency inversion.
 * This interface allows CommonModule to depend on abstractions rather than
 * concrete implementations, breaking cross-boundary coupling.
 */
export interface IGuildAccessProvider {
  /**
   * Get guild settings with caching and defaults
   * Automatically creates default settings if they don't exist
   * @param guildId - Discord guild ID
   * @returns Guild settings
   */
  getSettings(guildId: string): Promise<GuildSettings>;

  /**
   * Find a specific guild member by user ID and guild ID
   * @param userId - Discord user ID
   * @param guildId - Discord guild ID
   * @returns Guild member or null if not found
   */
  findOne(userId: string, guildId: string): Promise<GuildMember | null>;
}

export const IGuildAccessProvider = Symbol(
  'IGuildAccessProvider',
) as InjectionToken<IGuildAccessProvider>;
