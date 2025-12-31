import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IConfigurationService } from '../../infrastructure/configuration/interfaces/configuration.interface';
import { ILoggingService } from '../../infrastructure/logging/interfaces/logging.interface';
import { TrackerRepository } from '../repositories/tracker.repository';
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
  private readonly serviceName = TrackerBatchProcessorService.name;
  private readonly refreshIntervalHours: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly trackerRepository: TrackerRepository,
    private readonly scrapingQueueService: TrackerScrapingQueueService,
    private readonly processingGuard: TrackerProcessingGuardService,
    @Inject(IConfigurationService)
    private readonly configService: IConfigurationService,
    @Inject(ILoggingService)
    private readonly loggingService: ILoggingService,
  ) {
    const trackerConfig = this.configService.get<{
      refreshIntervalHours: number;
    }>('tracker');
    if (!trackerConfig) {
      throw new Error('Tracker configuration is missing');
    }
    this.refreshIntervalHours = trackerConfig.refreshIntervalHours ?? 24;
  }

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
      this.loggingService.log(
        'No pending trackers to process',
        this.serviceName,
      );
      return { processed: 0, trackers: [] };
    }

    const trackerIds = pendingTrackers.map((t) => t.id);

    const processableTrackerIds =
      await this.processingGuard.filterProcessableTrackers(trackerIds);

    if (processableTrackerIds.length === 0) {
      this.loggingService.log(
        `Found ${trackerIds.length} pending trackers, but none can be processed due to guild settings`,
        this.serviceName,
      );
      return { processed: 0, trackers: [] };
    }

    await this.scrapingQueueService.addBatchScrapingJobs(processableTrackerIds);

    this.loggingService.log(
      `Enqueued ${processableTrackerIds.length} pending trackers for processing (${trackerIds.length - processableTrackerIds.length} skipped due to guild settings)`,
      this.serviceName,
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
   * Processes both:
   * - Trackers with scrapingStatus: PENDING (never scraped)
   * - Stale trackers: lastScrapedAt is null OR older than refreshIntervalHours
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
    const trackers = await this.trackerRepository.findPendingAndStaleForGuild(
      guildId,
      this.refreshIntervalHours,
    );

    if (trackers.length === 0) {
      this.loggingService.log(
        `No pending or stale trackers to process for guild ${guildId}`,
        this.serviceName,
      );
      return { processed: 0, trackers: [] };
    }

    const trackerIds = trackers.map((t) => t.id);

    await this.scrapingQueueService.addBatchScrapingJobs(trackerIds);

    this.loggingService.log(
      `Enqueued ${trackerIds.length} pending and stale trackers for guild ${guildId} (manual admin action - bypasses toggle)`,
      this.serviceName,
    );

    return {
      processed: trackerIds.length,
      trackers: trackerIds,
    };
  }
}
