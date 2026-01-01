import { Injectable } from '@nestjs/common';
import { LeagueMemberRepository } from '../repositories/league-member.repository';
import { LeagueJoinValidationException } from '../exceptions/league-member.exceptions';

/**
 * CapacityValidator - Single Responsibility: League capacity validation
 *
 * Validates that league has not reached its maximum player capacity.
 */
@Injectable()
export class CapacityValidator {
  constructor(private leagueMemberRepository: LeagueMemberRepository) {}

  /**
   * Validate capacity limits
   * Single Responsibility: Capacity validation
   *
   * @param leagueId - League ID to check capacity for
   * @param membershipConfig - Membership configuration with capacity settings
   * @throws LeagueJoinValidationException if league is at capacity
   */
  async validateCapacity(
    leagueId: string,
    membershipConfig: { maxPlayers?: number | null; autoCloseOnFull: boolean },
  ): Promise<void> {
    if (membershipConfig.maxPlayers) {
      const activeCount =
        await this.leagueMemberRepository.countActiveMembers(leagueId);
      if (activeCount >= membershipConfig.maxPlayers) {
        if (membershipConfig.autoCloseOnFull) {
          throw new LeagueJoinValidationException(
            'League is full and registration is closed',
          );
        } else {
          throw new LeagueJoinValidationException(
            `League is full (${activeCount}/${membershipConfig.maxPlayers} players)`,
          );
        }
      }
    }
  }
}
