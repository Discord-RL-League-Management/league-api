import { LeagueSettingsDto } from '../dto/league-settings.dto';
import { LeagueConfiguration } from './league-settings.interface';

/**
 * ILeagueSettingsService - Interface for league settings operations
 *
 * Abstracts league settings management to enable dependency inversion.
 * This interface allows other modules to depend on abstractions rather than
 * concrete implementations, reducing coupling and improving testability.
 */
export interface ILeagueSettingsService {
  /**
   * Get league settings with caching and defaults
   * Automatically persists default settings if they don't exist (lazy initialization).
   * @param leagueId - League ID
   * @returns League configuration
   */
  getSettings(leagueId: string): Promise<LeagueConfiguration>;

  /**
   * Update league settings with validation and caching
   * Validates new settings, merges with existing, and persists.
   * @param leagueId - League ID
   * @param newSettings - Partial league settings to update
   * @returns Updated league configuration
   */
  updateSettings(
    leagueId: string,
    newSettings: Partial<LeagueSettingsDto>,
  ): Promise<LeagueConfiguration>;
}
