/**
 * LeagueMember query options for flexible data retrieval
 * Single Responsibility: Define query options for LeagueMember queries
 */

export interface LeagueMemberQueryOptions {
  /**
   * Include related player data
   */
  includePlayer?: boolean;

  /**
   * Include related league data
   */
  includeLeague?: boolean;

  /**
   * Filter by status
   */
  status?: string | string[];

  /**
   * Filter by role
   */
  role?: string | string[];

  /**
   * Pagination options
   */
  page?: number;
  limit?: number;

  /**
   * Sort options
   */
  sortBy?: 'joinedAt' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Default league member query options
 */
export const defaultLeagueMemberQueryOptions: Required<
  Omit<LeagueMemberQueryOptions, 'status' | 'role' | 'sortBy' | 'sortOrder'>
> &
  Pick<LeagueMemberQueryOptions, 'status' | 'role' | 'sortBy' | 'sortOrder'> = {
  includePlayer: false,
  includeLeague: false,
  page: 1,
  limit: 50,
};


