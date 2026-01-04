import { Team } from '@prisma/client';

/**
 * ITeamProvider - Interface for team access from LeaguesModule
 *
 * This interface breaks the circular dependency between LeaguesModule and TeamsModule
 * by allowing LeaguesModule to depend on an abstraction rather than concrete repository.
 */
export interface ITeamProvider {
  /**
   * Find teams without an organization in a league
   */
  findTeamsWithoutOrganization(leagueId: string): Promise<Team[]>;
}
