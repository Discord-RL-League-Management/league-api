import { Injectable, Logger, Inject } from '@nestjs/common';
import type { ITrackerService } from '../../trackers/interfaces/tracker-service.interface';
import { PlayerValidationException } from '../exceptions/player.exceptions';

/**
 * PlayerTrackerValidator - Single Responsibility: Tracker validation
 *
 * Validates tracker links and ownership.
 */
@Injectable()
export class PlayerTrackerValidator {
  private readonly logger = new Logger(PlayerTrackerValidator.name);

  constructor(
    @Inject('ITrackerService') private trackerService: ITrackerService,
  ) {}

  /**
   * Validate tracker link
   * Single Responsibility: Tracker validation
   *
   * @param trackerId - Tracker ID to validate (optional)
   * @param userId - User ID that should own the tracker
   * @throws PlayerValidationException if tracker is invalid or doesn't belong to user
   */
  async validateTrackerLink(
    trackerId: string | null | undefined,
    userId: string,
  ): Promise<void> {
    if (!trackerId) {
      return; // Optional field
    }

    try {
      const tracker = await this.trackerService.getTrackerById(trackerId);

      if (tracker.userId !== userId) {
        throw new PlayerValidationException(
          `Tracker ${trackerId} does not belong to user ${userId}`,
        );
      }

      if (!tracker.isActive || tracker.isDeleted) {
        throw new PlayerValidationException(
          `Tracker ${trackerId} is not active`,
        );
      }
    } catch (error) {
      if (error instanceof PlayerValidationException) {
        throw error;
      }
      throw new PlayerValidationException(`Tracker ${trackerId} not found`);
    }
  }
}
