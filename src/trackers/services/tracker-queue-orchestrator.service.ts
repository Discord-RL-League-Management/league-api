import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TrackerScrapingQueueService } from '../queues/tracker-scraping.queue';
import { TrackerProcessingGuardService } from './tracker-processing-guard.service';
import { TrackerScrapingStatus } from '@prisma/client';

/**
 * TrackerQueueOrchestratorService - Queue management for tracker operations
 *
 * Single Responsibility: Handles queue enqueueing with processing guard checks
 * and error handling. Extracted from TrackerService to reduce LCOM and improve
 * separation of concerns.
 */
@Injectable()
export class TrackerQueueOrchestratorService {
  private readonly logger = new Logger(TrackerQueueOrchestratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scrapingQueueService: TrackerScrapingQueueService,
    private readonly processingGuard: TrackerProcessingGuardService,
  ) {}

  /**
   * Enqueue a single tracker with processing guard check
   * If processing is disabled, updates tracker status to FAILED
   *
   * @param trackerId - Tracker ID to enqueue
   * @returns Promise that resolves when enqueued or skipped
   */
  async enqueueTrackerWithGuard(trackerId: string): Promise<void> {
    const canProcess = await this.processingGuard.canProcessTracker(trackerId);

    if (!canProcess) {
      await this.prisma.tracker
        .update({
          where: { id: trackerId },
          data: {
            scrapingStatus: TrackerScrapingStatus.FAILED,
            scrapingError: 'Tracker processing disabled by guild settings',
            scrapingAttempts: 1,
          },
        })
        .catch((updateError) => {
          this.logger.error(
            `Failed to update tracker ${trackerId} status after processing guard check: ${updateError instanceof Error ? updateError.message : String(updateError)}`,
          );
        });
      this.logger.warn(
        `Skipping tracker ${trackerId} - processing disabled by guild settings`,
      );
      return;
    }

    void this.scrapingQueueService.addScrapingJob(trackerId).catch((error) => {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to enqueue scraping job for tracker ${trackerId}: ${errorMessage}`,
      );
      void this.prisma.tracker
        .update({
          where: { id: trackerId },
          data: {
            scrapingStatus: TrackerScrapingStatus.FAILED,
            scrapingError: `Failed to enqueue scraping job: ${errorMessage}`,
            scrapingAttempts: 1,
          },
        })
        .catch((updateError) => {
          this.logger.error(
            `Failed to update tracker ${trackerId} status after enqueue failure: ${updateError instanceof Error ? updateError.message : String(updateError)}`,
          );
        });
    });
  }

  /**
   * Enqueue multiple trackers with processing guard check
   * Filters out trackers that cannot be processed
   *
   * @param trackerIds - Array of tracker IDs to enqueue
   * @returns Promise that resolves when all trackers are processed
   */
  async enqueueTrackersWithGuard(trackerIds: string[]): Promise<void> {
    if (trackerIds.length === 0) {
      return;
    }

    const processableTrackerIds =
      await this.processingGuard.filterProcessableTrackers(trackerIds);

    const nonProcessableIds = trackerIds.filter(
      (id) => !processableTrackerIds.includes(id),
    );

    if (nonProcessableIds.length > 0) {
      await Promise.all(
        nonProcessableIds.map((id) =>
          this.prisma.tracker
            .update({
              where: { id },
              data: {
                scrapingStatus: TrackerScrapingStatus.FAILED,
                scrapingError: 'Tracker processing disabled by guild settings',
                scrapingAttempts: 1,
              },
            })
            .catch((error) => {
              this.logger.error(
                `Failed to update tracker ${id} status: ${error instanceof Error ? error.message : String(error)}`,
              );
            }),
        ),
      );
    }

    if (processableTrackerIds.length > 0) {
      await this.scrapingQueueService.addBatchScrapingJobs(
        processableTrackerIds,
      );
    }
  }
}
