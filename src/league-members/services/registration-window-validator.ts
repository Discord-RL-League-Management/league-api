import { Injectable } from '@nestjs/common';
import { LeagueJoinValidationException } from '../exceptions/league-member.exceptions';

/**
 * RegistrationWindowValidator - Single Responsibility: Registration window validation
 *
 * Validates that league registration is open and within the allowed time window.
 */
@Injectable()
export class RegistrationWindowValidator {
  /**
   * Validate registration window
   * Single Responsibility: Registration window validation
   *
   * @param membershipConfig - Membership configuration with registration settings
   * @throws LeagueJoinValidationException if registration window is invalid
   */
  validateRegistrationWindow(membershipConfig: {
    registrationOpen: boolean;
    registrationStartDate?: Date | string | null;
    registrationEndDate?: Date | string | null;
  }): void {
    if (!membershipConfig.registrationOpen) {
      throw new LeagueJoinValidationException(
        'League registration is currently closed',
      );
    }

    const now = new Date();

    if (membershipConfig.registrationStartDate) {
      const startDate = new Date(membershipConfig.registrationStartDate);
      if (now < startDate) {
        throw new LeagueJoinValidationException(
          `Registration opens on ${startDate.toISOString()}`,
        );
      }
    }

    if (membershipConfig.registrationEndDate) {
      const endDate = new Date(membershipConfig.registrationEndDate);
      if (now > endDate) {
        throw new LeagueJoinValidationException(
          `Registration closed on ${endDate.toISOString()}`,
        );
      }
    }
  }
}
