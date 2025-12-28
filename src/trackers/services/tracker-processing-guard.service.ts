import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GuildSettingsService } from '../../guilds/guild-settings.service';
import { GuildSettings } from '../../guilds/interfaces/settings.interface';

/**
 * TrackerProcessingGuardService
 * Single Responsibility: Check if tracker processing is allowed based on guild settings
 *
 * Determines if a tracker can be processed by checking if the user belongs to
 * any guild with tracker processing enabled. Processing is enabled if ANY guild
 * allows it, defaulting to true for backward compatibility.
 */
@Injectable()
export class TrackerProcessingGuardService {
  private readonly logger = new Logger(TrackerProcessingGuardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly guildSettingsService: GuildSettingsService,
  ) {}

  /**
   * Check if a tracker can be processed
   * Single Responsibility: Single tracker processing check
   *
   * @param trackerId - The tracker ID to check
   * @returns true if processing is allowed, false otherwise
   */
  async canProcessTracker(trackerId: string): Promise<boolean> {
    try {
      const tracker = await this.prisma.tracker.findUnique({
        where: { id: trackerId },
        select: { userId: true },
      });

      if (!tracker) {
        this.logger.warn(`Tracker ${trackerId} not found`);
        return false;
      }

      return this.canProcessTrackerForUser(tracker.userId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error checking if tracker ${trackerId} can be processed: ${errorMessage}`,
      );
      // Default to true on error for backward compatibility
      return true;
    }
  }

  /**
   * Check if tracker processing is allowed for a user
   * Single Responsibility: User-level processing check
   *
   * @param userId - The user ID to check
   * @returns true if processing is allowed, false otherwise
   */
  async canProcessTrackerForUser(userId: string): Promise<boolean> {
    try {
      const guildMemberships = await this.prisma.guildMember.findMany({
        where: {
          userId,
          isDeleted: false,
          isBanned: false,
        },
        select: {
          guildId: true,
        },
      });

      // If user has no guilds, default to true (backward compatibility)
      if (guildMemberships.length === 0) {
        this.logger.debug(
          `User ${userId} has no guild memberships, defaulting to enabled`,
        );
        return true;
      }

      for (const membership of guildMemberships) {
        const settings = await this.guildSettingsService.getSettings(
          membership.guildId,
        );
        if (this.isProcessingEnabled(settings)) {
          return true;
        }
      }

      // All guilds have processing disabled
      return false;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error checking if user ${userId} can process trackers: ${errorMessage}`,
      );
      // Default to true on error for backward compatibility
      return true;
    }
  }

  /**
   * Filter tracker IDs to only those that can be processed
   * Single Responsibility: Batch tracker processing check
   *
   * Optimizes by grouping trackers by userId and checking each user's guilds once.
   *
   * @param trackerIds - Array of tracker IDs to filter
   * @returns Array of tracker IDs that can be processed
   */
  async filterProcessableTrackers(trackerIds: string[]): Promise<string[]> {
    if (trackerIds.length === 0) {
      return [];
    }

    try {
      const trackers = await this.prisma.tracker.findMany({
        where: {
          id: { in: trackerIds },
        },
        select: {
          id: true,
          userId: true,
        },
      });

      const trackersByUserId = new Map<string, string[]>();
      for (const tracker of trackers) {
        const userTrackers = trackersByUserId.get(tracker.userId) || [];
        userTrackers.push(tracker.id);
        trackersByUserId.set(tracker.userId, userTrackers);
      }

      const processableTrackerIds: string[] = [];
      const userProcessingCache = new Map<string, boolean>();

      for (const [userId, userTrackerIds] of trackersByUserId.entries()) {
        let canProcess: boolean;
        if (userProcessingCache.has(userId)) {
          canProcess = userProcessingCache.get(userId)!;
        } else {
          canProcess = await this.canProcessTrackerForUser(userId);
          userProcessingCache.set(userId, canProcess);
        }

        if (canProcess) {
          processableTrackerIds.push(...userTrackerIds);
        }
      }

      return processableTrackerIds;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error filtering processable trackers: ${errorMessage}`,
      );
      // Default to returning all trackers on error for backward compatibility
      return trackerIds;
    }
  }

  /**
   * Check if processing is enabled in guild settings
   * Single Responsibility: Settings processing check logic
   *
   * @param settings - Guild settings to check
   * @returns true if processing is enabled (defaults to true if not set)
   */
  private isProcessingEnabled(settings: GuildSettings): boolean {
    // Default to true if trackerProcessing is not set (backward compatibility)
    if (!settings.trackerProcessing) {
      return true;
    }

    return settings.trackerProcessing.enabled !== false;
  }
}
