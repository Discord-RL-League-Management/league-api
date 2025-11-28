/**
 * League query options for flexible data retrieval
 * Single Responsibility: Define query options for League queries
 */

export interface LeagueQueryOptions {
  /**
   * Include related guild data
   */
  includeGuild?: boolean;

  /**
   * Include league members (future - when LeagueMember model exists)
   */
  includeMembers?: boolean;

  /**
   * Include teams (future - when Team model exists)
   */
  includeTeams?: boolean;

  /**
   * Include tournaments (future - when Tournament model exists)
   */
  includeTournaments?: boolean;

  /**
   * Include series (future - when Series model exists)
   */
  includeSeries?: boolean;

  /**
   * Pagination options
   */
  page?: number;
  limit?: number;

  /**
   * Filter by status
   */
  status?: string | string[];

  /**
   * Filter by game
   */
  game?: string | string[];

  /**
   * Filter by guild ID
   */
  guildId?: string;

  /**
   * Sort options
   */
  sortBy?: 'name' | 'createdAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Default league query options
 */
export const defaultLeagueQueryOptions: Required<
  Omit<
    LeagueQueryOptions,
    'status' | 'game' | 'guildId' | 'sortBy' | 'sortOrder'
  >
> &
  Pick<
    LeagueQueryOptions,
    'status' | 'game' | 'guildId' | 'sortBy' | 'sortOrder'
  > = {
  includeGuild: false,
  includeMembers: false,
  includeTeams: false,
  includeTournaments: false,
  includeSeries: false,
  page: 1,
  limit: 50,
};
