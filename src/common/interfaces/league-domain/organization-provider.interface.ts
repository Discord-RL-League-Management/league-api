import { Organization } from '@prisma/client';
import { LeagueConfiguration } from '../../../leagues/interfaces/league-settings.interface';
import { CreateOrganizationDto } from '../../../organizations/dto/create-organization.dto';

/**
 * IOrganizationProvider - Interface for organization access from LeaguesModule
 *
 * This interface breaks the circular dependency between LeaguesModule and OrganizationsModule
 * by allowing LeaguesModule to depend on an abstraction rather than concrete service.
 */
export interface IOrganizationProvider {
  /**
   * Find all organizations in a league
   */
  findByLeagueId(leagueId: string): Promise<Organization[]>;

  /**
   * Create an organization
   */
  create(
    createDto: CreateOrganizationDto,
    userId: string,
    settings?: LeagueConfiguration,
  ): Promise<Organization>;

  /**
   * Assign teams to an organization
   */
  assignTeamsToOrganization(
    leagueId: string,
    organizationId: string,
    teamIds: string[],
    settings?: LeagueConfiguration,
  ): Promise<void>;

  /**
   * Delete an organization
   */
  delete(organizationId: string, userId: string): Promise<void>;
}
