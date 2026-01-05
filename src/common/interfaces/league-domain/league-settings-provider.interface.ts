import { LeagueConfiguration } from '../../../leagues/interfaces/league-settings.interface';

/**
 * ILeagueSettingsProvider - Interface for league settings access
 *
 * This interface breaks the circular dependency between LeagueMembersModule and LeaguesModule
 * by allowing LeagueMembersModule to depend on an abstraction rather than concrete service.
 */
export interface ILeagueSettingsProvider {
  /**
   * Get league settings with caching and defaults
   * @param leagueId - League ID
   * @returns League configuration
   */
  getSettings(leagueId: string): Promise<LeagueConfiguration>;
}
