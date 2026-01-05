import { League } from '@prisma/client';

/**
 * ILeagueRepositoryAccess - Interface for league repository access operations
 *
 * This interface breaks the circular dependency between LeaguesModule and OrganizationsModule
 * by allowing OrganizationsModule to depend on an abstraction rather than concrete repository.
 */
export interface ILeagueRepositoryAccess {
  /**
   * Find league by ID
   * @param id - League ID
   * @returns League or null if not found
   */
  findById(id: string): Promise<League | null>;

  /**
   * Check if league exists
   * @param id - League ID
   * @returns true if league exists, false otherwise
   */
  exists(id: string): Promise<boolean>;
}
