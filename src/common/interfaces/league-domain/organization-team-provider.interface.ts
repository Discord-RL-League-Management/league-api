import { Team } from '@prisma/client';

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
   * @returns Updated team
   */
  update(
    teamId: string,
    data: { organizationId: string | null },
  ): Promise<Team>;
}
