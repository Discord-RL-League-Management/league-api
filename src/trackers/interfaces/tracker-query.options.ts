/**
 * Tracker query options for flexible data retrieval
 * Single Responsibility: Define query options for Tracker queries
 */

import { GamePlatform, TrackerScrapingStatus } from '@prisma/client';

export interface TrackerQueryOptions {
  /**
   * Filter by platform
   */
  platform?: GamePlatform | GamePlatform[];

  /**
   * Filter by scraping status
   */
  status?: TrackerScrapingStatus | TrackerScrapingStatus[];

  /**
   * Filter by active status
   */
  isActive?: boolean;

  /**
   * Pagination options
   */
  page?: number;
  limit?: number;

  /**
   * Sort options
   */
  sortBy?: 'createdAt' | 'updatedAt' | 'lastScrapedAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Default tracker query options
 */
export const defaultTrackerQueryOptions: Required<
  Omit<
    TrackerQueryOptions,
    'platform' | 'status' | 'isActive' | 'sortBy' | 'sortOrder'
  >
> &
  Pick<
    TrackerQueryOptions,
    'platform' | 'status' | 'isActive' | 'sortBy' | 'sortOrder'
  > = {
  page: 1,
  limit: 50,
};
