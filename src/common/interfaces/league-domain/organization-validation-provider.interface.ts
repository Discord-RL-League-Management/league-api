import { Organization } from '@prisma/client';

/**
 * IOrganizationValidationProvider - Interface for organization validation operations needed by TeamsModule
 *
 * This interface breaks the circular dependency between TeamsModule and OrganizationsModule
 * by allowing TeamsModule to depend on an abstraction rather than concrete services.
 */
export interface IOrganizationValidationProvider {
  /**
   * Find organization by ID and league ID
   * @param organizationId - Organization ID
   * @param leagueId - League ID
   * @returns Organization or null if not found
   */
  findByIdAndLeague(
    organizationId: string,
    leagueId: string,
  ): Promise<Organization | null>;

  /**
   * Validate organization capacity for teams
   * @param leagueId - League ID
   * @param organizationId - Organization ID
   * @throws OrganizationCapacityExceededException if capacity exceeded
   */
  validateOrganizationCapacity(
    leagueId: string,
    organizationId: string,
  ): Promise<void>;
}
