/**
 * Player query options for flexible data retrieval
 * Single Responsibility: Define query options for Player queries
 */

export interface PlayerQueryOptions {
  /**
   * Include related user data
   */
  includeUser?: boolean;

  /**
   * Include related guild data
   */
  includeGuild?: boolean;

  /**
   * Filter by status
   */
  status?: string | string[];

  /**
   * Pagination options
   */
  page?: number;
  limit?: number;

  /**
   * Sort options
   */
  sortBy?: 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Default player query options
 */
export const defaultPlayerQueryOptions: Required<
  Omit<PlayerQueryOptions, 'status' | 'sortBy' | 'sortOrder'>
> &
  Pick<PlayerQueryOptions, 'status' | 'sortBy' | 'sortOrder'> = {
  includeUser: false,
  includeGuild: false,
  page: 1,
  limit: 50,
};
