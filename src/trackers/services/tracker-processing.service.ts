import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { ILoggingService } from '../../infrastructure/logging/interfaces/logging.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { TrackerService } from './tracker.service';
import { TrackerValidationService } from './tracker-validation.service';
import { TrackerUserOrchestratorService } from './tracker-user-orchestrator.service';
import { TrackerQueueOrchestratorService } from './tracker-queue-orchestrator.service';
import { TrackerBatchProcessorService } from './tracker-batch-processor.service';
import { TrackerProcessingGuardService } from './tracker-processing-guard.service';
import { TrackerScrapingQueueService } from '../queues/tracker-scraping.queue';
import { GamePlatform, Game, TrackerScrapingStatus } from '@prisma/client';

/**
 * TrackerProcessingService - Processing orchestration for trackers
 *
 * Single Responsibility: Handles processing orchestration operations for trackers,
 * including registration, adding, refreshing, and batch processing.
 * Extracted from TrackerService to reduce DHI and improve separation of concerns.
 *
 * This service orchestrates:
 * - Tracker registration and addition workflows
 * - Tracker refresh operations
 * - Batch processing operations
 *
 * It delegates CRUD operations to TrackerService.
 */
@Injectable()
export class TrackerProcessingService {
  private readonly serviceName = TrackerProcessingService.name;

  constructor(
    private readonly prisma: PrismaService,
    private readonly trackerService: TrackerService,
    private readonly validationService: TrackerValidationService,
    private readonly userOrchestrator: TrackerUserOrchestratorService,
    private readonly queueOrchestrator: TrackerQueueOrchestratorService,
    private readonly batchProcessor: TrackerBatchProcessorService,
    private readonly processingGuard: TrackerProcessingGuardService,
    private readonly scrapingQueueService: TrackerScrapingQueueService,
    @Inject(ILoggingService)
    private readonly loggingService: ILoggingService,
  ) {}

  /**
   * Validate tracker URLs for registration
   * @private
   */
  private async validateTrackerUrls(
    urls: string[],
    userId: string,
  ): Promise<
    Array<{
      url: string;
      parsed: { game: Game; platform: GamePlatform; username: string };
    }>
  > {
    if (urls.length === 0 || urls.length > 4) {
      throw new BadRequestException(
        'You must provide between 1 and 4 tracker URLs',
      );
    }

    const uniqueUrls = Array.from(new Set(urls));
    if (uniqueUrls.length !== urls.length) {
      throw new BadRequestException('Duplicate URLs are not allowed');
    }

    // Batch check URL uniqueness to avoid N+1 query problem
    const urlUniquenessMap =
      await this.validationService.batchCheckUrlUniqueness(uniqueUrls);
    const duplicateUrls: string[] = [];
    for (const url of uniqueUrls) {
      const isUnique = urlUniquenessMap.get(url);
      if (isUnique === false) {
        duplicateUrls.push(url);
      }
    }
    if (duplicateUrls.length > 0) {
      throw new BadRequestException(
        `The following tracker URL(s) have already been registered: ${duplicateUrls.join(', ')}`,
      );
    }

    const validationPromises = uniqueUrls.map((url) =>
      this.validationService.validateTrackerUrl(url, userId, undefined, true),
    );

    const parsedResults = await Promise.all(validationPromises);
    return uniqueUrls.map((url, index) => ({
      url,
      parsed: parsedResults[index],
    }));
  }

  /**
   * Validate tracker count limit
   * @private
   */
  private validateTrackerCount(
    existingCount: number,
    maxCount: number,
    errorMessage: string,
  ): void {
    if (existingCount >= maxCount) {
      throw new BadRequestException(errorMessage);
    }
  }

  /**
   * Register multiple trackers for a user (1-4 trackers)
   * Validates user doesn't already have trackers
   */
  async registerTrackers(
    userId: string,
    urls: string[],
    userData?: { username: string; globalName?: string; avatar?: string },
    channelId?: string,
    interactionToken?: string,
  ) {
    await this.userOrchestrator.ensureUserExists(userId, userData);

    const existingTrackersResult =
      await this.trackerService.getTrackersByUserId(userId);
    const activeTrackers = existingTrackersResult.data.filter(
      (t) => !t.isDeleted,
    );

    if (activeTrackers.length > 0) {
      throw new BadRequestException(
        `You already have ${activeTrackers.length} tracker(s) registered. Use /api/trackers/add to add more.`,
      );
    }

    const parsedUrls = await this.validateTrackerUrls(urls, userId);

    const trackers = [];
    for (const { url, parsed } of parsedUrls) {
      const tracker = await this.trackerService.createTracker(
        url,
        parsed.game,
        parsed.platform,
        parsed.username,
        userId,
        undefined, // displayName
        channelId, // registrationChannelId
        interactionToken, // registrationInteractionToken
      );
      trackers.push(tracker);

      await this.queueOrchestrator.enqueueTrackerWithGuard(tracker.id);
    }

    this.loggingService.log(
      `Registered ${trackers.length} tracker(s) for user ${userId}`,
      this.serviceName,
    );
    return trackers;
  }

  /**
   * Add an additional tracker for a user (up to 4 total)
   * Validates tracker count limit
   */
  async addTracker(
    userId: string,
    url: string,
    userData?: { username: string; globalName?: string; avatar?: string },
    channelId?: string,
    interactionToken?: string,
  ) {
    await this.userOrchestrator.ensureUserExists(userId, userData);

    const existingTrackersResult =
      await this.trackerService.getTrackersByUserId(userId);
    const activeTrackers = existingTrackersResult.data.filter(
      (t) => !t.isDeleted,
    );

    this.validateTrackerCount(
      activeTrackers.length,
      4,
      'You have reached the maximum of 4 trackers. Please remove one before adding another.',
    );

    const parsed = await this.validationService.validateTrackerUrl(url, userId);

    const tracker = await this.trackerService.createTracker(
      url,
      parsed.game,
      parsed.platform,
      parsed.username,
      userId,
      undefined, // displayName
      channelId, // registrationChannelId
      interactionToken, // registrationInteractionToken
    );

    await this.queueOrchestrator.enqueueTrackerWithGuard(tracker.id);

    this.loggingService.log(
      `Added tracker ${tracker.id} for user ${userId} (${activeTrackers.length + 1}/4)`,
      this.serviceName,
    );
    return tracker;
  }

  /**
   * Refresh tracker data by enqueueing a new scraping job
   */
  async refreshTrackerData(trackerId: string): Promise<void> {
    const tracker = await this.prisma.tracker.findUnique({
      where: { id: trackerId },
    });

    if (!tracker) {
      throw new NotFoundException('Tracker not found');
    }

    const canProcess = await this.processingGuard.canProcessTracker(trackerId);
    if (!canProcess) {
      throw new ForbiddenException(
        'Tracker processing is disabled by guild settings',
      );
    }

    await this.prisma.tracker.update({
      where: { id: trackerId },
      data: {
        scrapingStatus: TrackerScrapingStatus.PENDING,
        scrapingError: null,
      },
    });

    await this.scrapingQueueService.addScrapingJob(trackerId);

    this.loggingService.log(
      `Enqueued refresh job for tracker ${trackerId}`,
      this.serviceName,
    );
  }

  /**
   * Process all pending trackers by enqueueing them for scraping
   * Single Responsibility: Process all pending trackers
   * Delegates to TrackerBatchProcessorService for implementation
   */
  async processPendingTrackers(): Promise<{
    processed: number;
    trackers: string[];
  }> {
    return this.batchProcessor.processPendingTrackers();
  }

  /**
   * Process pending trackers for a specific guild
   * Single Responsibility: Process pending trackers for a specific guild
   * Delegates to TrackerBatchProcessorService for implementation
   *
   * @param guildId - Discord guild ID to process trackers for
   * @returns Number of trackers processed and their IDs
   */
  async processPendingTrackersForGuild(
    guildId: string,
  ): Promise<{ processed: number; trackers: string[] }> {
    return this.batchProcessor.processPendingTrackersForGuild(guildId);
  }
}
