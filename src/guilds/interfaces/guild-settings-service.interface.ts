import { GuildSettingsDto } from '../dto/guild-settings.dto';
import { GuildSettings } from './settings.interface';
import { Settings } from '@prisma/client';

/**
 * IGuildSettingsService - Interface for guild settings operations
 *
 * Abstracts guild settings management to enable dependency inversion.
 * This interface allows other modules to depend on abstractions rather than
 * concrete implementations, reducing coupling and improving testability.
 */
export interface IGuildSettingsService {
  /**
   * Get guild settings with caching and defaults
   * Automatically persists default settings if they don't exist (lazy initialization).
   * @param guildId - Guild ID
   * @returns Guild settings
   */
  getSettings(guildId: string): Promise<GuildSettings>;

  /**
   * Update guild settings with validation and transaction management
   * @param guildId - Guild ID
   * @param newSettings - New settings data
   * @param userId - User ID performing the update
   * @returns Updated settings entity
   */
  updateSettings(
    guildId: string,
    newSettings: GuildSettingsDto,
    userId: string,
  ): Promise<Settings>;

  /**
   * Reset settings to defaults with transaction management
   * @param guildId - Guild ID
   * @param userId - User ID performing the reset
   * @returns Updated settings entity
   */
  resetSettings(guildId: string, userId: string): Promise<Settings>;

  /**
   * Get settings history for audit trail
   * @param guildId - Guild ID
   * @param limit - Maximum number of history entries to return (default: 50)
   * @returns Array of activity log entries
   */
  getSettingsHistory(guildId: string, limit?: number): Promise<unknown[]>;
}
