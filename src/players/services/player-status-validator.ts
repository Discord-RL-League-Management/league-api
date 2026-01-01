import { Injectable } from '@nestjs/common';
import { PlayerStatus } from '@prisma/client';
import { InvalidPlayerStatusException } from '../exceptions/player.exceptions';

/**
 * PlayerStatusValidator - Single Responsibility: Player status validation
 *
 * Validates that player status allows league operations.
 */
@Injectable()
export class PlayerStatusValidator {
  /**
   * Validate player status for league operations
   * Single Responsibility: Status validation
   *
   * @param playerStatus - Player status to validate
   * @throws InvalidPlayerStatusException if status does not allow league operations
   */
  validatePlayerStatus(playerStatus: PlayerStatus): void {
    if (
      playerStatus === PlayerStatus.BANNED ||
      playerStatus === PlayerStatus.SUSPENDED
    ) {
      throw new InvalidPlayerStatusException(
        `Player status '${playerStatus}' does not allow league operations`,
      );
    }
  }
}
