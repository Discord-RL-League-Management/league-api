import { LeagueMember } from '@prisma/client';

/**
 * ILeagueMemberAccess - Interface for league member access operations
 *
 * This interface breaks the circular dependency between LeaguesModule and LeagueMembersModule
 * by allowing LeaguesModule to depend on an abstraction rather than concrete repository.
 */
export interface ILeagueMemberAccess {
  /**
   * Find league member by player ID and league ID
   * @param playerId - Player ID
   * @param leagueId - League ID
   * @returns League member or null if not found
   * Note: Returns full LeagueMember to access status field (used in validation)
   */
  findByPlayerAndLeague(
    playerId: string,
    leagueId: string,
  ): Promise<LeagueMember | null>;
}
