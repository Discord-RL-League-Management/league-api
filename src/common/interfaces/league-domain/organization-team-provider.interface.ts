import { Team, Prisma } from '@prisma/client';

/**
 * IOrganizationTeamProvider - Interface for team operations needed by OrganizationsModule
 *
 * This interface breaks the circular dependency between OrganizationsModule and TeamsModule
 * by allowing OrganizationsModule to depend on an abstraction rather than concrete repository.
 */
export interface IOrganizationTeamProvider {
  /**
   * Find a team by ID
   * @param teamId - Team ID
   * @returns Team or null if not found
   */
  findById(teamId: string): Promise<Team | null>;

  /**
   * Update a team's organization assignment
   * @param teamId - Team ID
   * @param data - Update data containing organizationId (can be null to remove from organization)
   * @param tx - Optional transaction client for atomic operations
   * @returns Updated team
   */
  update(
    teamId: string,
    data: { organizationId: string | null },
    tx?: Prisma.TransactionClient,
  ): Promise<Team>;

  /**
   * Count teams by organization ID
   * @param organizationId - Organization ID
   * @param tx - Optional transaction client for atomic operations
   * @returns Number of teams in the organization
   */
  countByOrganizationId(
    organizationId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number>;
}
