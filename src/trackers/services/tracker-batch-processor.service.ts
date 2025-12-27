import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TrackerScrapingQueueService } from '../queues/tracker-scraping.queue';
import { TrackerProcessingGuardService } from './tracker-processing-guard.service';
import { TrackerScrapingStatus } from '@prisma/client';

/**
 * TrackerBatchProcessorService - Batch processing for tracker operations
 *
 * Single Responsibility: Handles batch processing of pending trackers.
 * Extracted from TrackerService to reduce LCOM and improve separation of concerns.
 */
@Injectable()
export class TrackerBatchProcessorService {
  private readonly logger = new Logger(TrackerBatchProcessorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scrapingQueueService: TrackerScrapingQueueService,
    private readonly processingGuard: TrackerProcessingGuardService,
  ) {}

  /**
   * Process all pending trackers by enqueueing them for scraping
   * Single Responsibility: Process all pending trackers
   *
   * @returns Number of trackers processed and their IDs
   */
  async processPendingTrackers(): Promise<{
    processed: number;
    trackers: string[];
  }> {
    const pendingTrackers = await this.prisma.tracker.findMany({
      where: {
        scrapingStatus: TrackerScrapingStatus.PENDING,
        isActive: true,
        isDeleted: false,
      },
      select: {
        id: true,
      },
    });

    if (pendingTrackers.length === 0) {
      this.logger.log('No pending trackers to process');
      return { processed: 0, trackers: [] };
    }

    const trackerIds = pendingTrackers.map((t) => t.id);

    const processableTrackerIds =
      await this.processingGuard.filterProcessableTrackers(trackerIds);

    if (processableTrackerIds.length === 0) {
      this.logger.log(
        `Found ${trackerIds.length} pending trackers, but none can be processed due to guild settings`,
      );
      return { processed: 0, trackers: [] };
    }

    await this.scrapingQueueService.addBatchScrapingJobs(processableTrackerIds);

    this.logger.log(
      `Enqueued ${processableTrackerIds.length} pending trackers for processing (${trackerIds.length - processableTrackerIds.length} skipped due to guild settings)`,
    );

    return {
      processed: processableTrackerIds.length,
      trackers: processableTrackerIds,
    };
  }

  /**
   * Process pending trackers for a specific guild
   * Single Responsibility: Process pending trackers for a specific guild
   *
   * This method is used by the Discord bot when a server admin runs the /process-trackers command.
   * It only processes trackers for users who are members of the specified guild.
   *
   * NOTE: This method bypasses the guild's tracker processing toggle because it's a manual
   * admin action. The toggle only applies to automatic/scheduled processing.
   *
   * @param guildId - Discord guild ID to process trackers for
   * @returns Number of trackers processed and their IDs
   */
  async processPendingTrackersForGuild(
    guildId: string,
  ): Promise<{ processed: number; trackers: string[] }> {
    const pendingTrackers = await this.prisma.tracker.findMany({
      where: {
        scrapingStatus: TrackerScrapingStatus.PENDING,
        isActive: true,
        isDeleted: false,
        user: {
          guildMembers: {
            some: {
              guildId,
              isDeleted: false,
              isBanned: false,
            },
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (pendingTrackers.length === 0) {
      this.logger.log(`No pending trackers to process for guild ${guildId}`);
      return { processed: 0, trackers: [] };
    }

    const trackerIds = pendingTrackers.map((t) => t.id);

    // Manual admin action bypasses the toggle - process all pending trackers for this guild
    // The toggle only applies to automatic/scheduled processing
    await this.scrapingQueueService.addBatchScrapingJobs(trackerIds);

    this.logger.log(
      `Enqueued ${trackerIds.length} pending trackers for guild ${guildId} (manual admin action - bypasses toggle)`,
    );

    return {
      processed: trackerIds.length,
      trackers: trackerIds,
    };
  }
}
