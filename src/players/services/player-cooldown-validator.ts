import { Injectable } from '@nestjs/common';
import { PlayerValidationException } from '../exceptions/player.exceptions';

/**
 * PlayerCooldownValidator - Single Responsibility: Cooldown period validation
 *
 * Validates that a player is not in a cooldown period after leaving a league.
 */
@Injectable()
export class PlayerCooldownValidator {
  /**
   * Validate cooldown period
   * Single Responsibility: Cooldown validation
   *
   * @param lastLeftLeagueAt - Date when player last left a league
   * @param cooldownDays - Number of days in cooldown period
   * @throws PlayerValidationException if player is still in cooldown period
   */
  validateCooldown(
    lastLeftLeagueAt: Date | null | undefined,
    cooldownDays: number | null | undefined,
  ): void {
    if (!lastLeftLeagueAt || !cooldownDays || cooldownDays <= 0) {
      return; // No cooldown or cooldown expired
    }

    const now = new Date();
    const cooldownEnd = new Date(lastLeftLeagueAt);
    cooldownEnd.setDate(cooldownEnd.getDate() + cooldownDays);

    if (now < cooldownEnd) {
      const daysRemaining = Math.ceil(
        (cooldownEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      throw new PlayerValidationException(
        `Player is in cooldown period. ${daysRemaining} day(s) remaining.`,
      );
    }
  }
}
