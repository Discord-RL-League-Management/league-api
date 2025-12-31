import { Injectable, ForbiddenException, Inject } from '@nestjs/common';
import type { ILoggingService } from '../../infrastructure/logging/interfaces/logging.interface';
import { PlayerService } from './player.service';
import { PlayerNotFoundException } from '../exceptions/player.exceptions';

/**
 * PlayerOwnershipService - Single Responsibility: Player ownership validation
 *
 * Validates that a player belongs to a specific user before allowing operations.
 * This ensures users can only perform actions on players they own.
 */
@Injectable()
export class PlayerOwnershipService {
  private readonly serviceName = PlayerOwnershipService.name;

  constructor(
    private playerService: PlayerService,
    @Inject('ILoggingService')
    private readonly loggingService: ILoggingService,
  ) {}

  /**
   * Validate that a player belongs to the specified user
   * Single Responsibility: Player ownership validation
   *
   * @param userId - User ID to validate ownership for
   * @param playerId - Player ID to check ownership of
   * @throws PlayerNotFoundException if player doesn't exist
   * @throws ForbiddenException if player doesn't belong to user
   */
  async validatePlayerOwnership(
    userId: string,
    playerId: string,
  ): Promise<void> {
    try {
      const player = await this.playerService.findOne(playerId);

      if (player.userId !== userId) {
        this.loggingService.warn(
          `User ${userId} attempted to access player ${playerId} owned by ${player.userId}`,
          this.serviceName,
        );
        throw new ForbiddenException('You can only access players you own');
      }

      this.loggingService.debug(
        `User ${userId} owns player ${playerId}`,
        this.serviceName,
      );
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof PlayerNotFoundException
      ) {
        throw error;
      }
      this.loggingService.error(
        `Failed to validate player ownership for user ${userId}, player ${playerId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      throw new ForbiddenException('Error validating player ownership');
    }
  }
}
