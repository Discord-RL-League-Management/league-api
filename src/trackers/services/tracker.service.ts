import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TrackerRepository } from '../repositories/tracker.repository';
import { TrackerValidationService } from './tracker-validation.service';
import { TrackerScrapingQueueService } from '../queues/tracker-scraping.queue';
import { TrackerSeasonService } from './tracker-season.service';
import { TrackerProcessingGuardService } from './tracker-processing-guard.service';
import { TrackerUserOrchestratorService } from './tracker-user-orchestrator.service';
import { TrackerQueueOrchestratorService } from './tracker-queue-orchestrator.service';
import { TrackerBatchProcessorService } from './tracker-batch-processor.service';
import {
  GamePlatform,
  Game,
  TrackerScrapingStatus,
  TrackerSeason,
  Prisma,
} from '@prisma/client';

@Injectable()
export class TrackerService {
  private readonly logger = new Logger(TrackerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly trackerRepository: TrackerRepository,
    private readonly validationService: TrackerValidationService,
    private readonly scrapingQueueService: TrackerScrapingQueueService,
    private readonly seasonService: TrackerSeasonService,
    private readonly processingGuard: TrackerProcessingGuardService,
    private readonly userOrchestrator: TrackerUserOrchestratorService,
    private readonly queueOrchestrator: TrackerQueueOrchestratorService,
    private readonly batchProcessor: TrackerBatchProcessorService,
  ) {}

  /**
   * Create a new tracker
   */
  async createTracker(
    url: string,
    game: Game,
    platform: GamePlatform,
    username: string,
    userId: string,
    displayName?: string,
    registrationChannelId?: string,
    registrationInteractionToken?: string,
  ) {
    return this.trackerRepository.create({
      url,
      game,
      platform,
      username,
      userId,
      displayName,
      registrationChannelId,
      registrationInteractionToken,
    });
  }

  /**
   * Get tracker by ID with seasons relationship
   */
  async getTrackerById(id: string) {
    const tracker = await this.prisma.tracker.findUnique({
      where: { id },
      include: {
        seasons: {
          orderBy: { seasonNumber: 'desc' },
        },
      },
    });
    if (!tracker) {
      throw new NotFoundException('Tracker not found');
    }
    return tracker;
  }

  /**
   * Get trackers for a user with seasons relationship
   */
  async getTrackersByUserId(userId: string) {
    return this.prisma.tracker.findMany({
      where: {
        userId,
        isDeleted: false,
      },
      include: {
        seasons: {
          orderBy: { seasonNumber: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find the best/most recent tracker from a user's active trackers
   * Used for skill validation when checking league requirements
   *
   * Delegates to repository for data access.
   *
   * @param userId - User ID to find trackers for
   * @returns Best tracker with seasons or null if no active trackers exist
   */
  async findBestTrackerForUser(userId: string) {
    return this.trackerRepository.findBestForUser(userId);
  }

  /**
   * Get trackers accessible to a guild
   * Guilds can access trackers for users who are members of that guild
   */
  async getTrackersByGuild(guildId: string) {
    return this.trackerRepository.findByGuildId(guildId);
  }

  /**
   * Get tracker by URL
   */
  async getTrackerByUrl(url: string) {
    return this.trackerRepository.findByUrl(url);
  }

  /**
   * Update tracker metadata
   */
  async updateTracker(id: string, displayName?: string, isActive?: boolean) {
    await this.getTrackerById(id);

    const updateData: Prisma.TrackerUpdateInput = {};
    if (displayName !== undefined) {
      updateData.displayName = displayName;
    }
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    return this.trackerRepository.update(id, updateData);
  }

  /**
   * Soft delete a tracker
   */
  async deleteTracker(id: string) {
    await this.getTrackerById(id);
    return this.trackerRepository.softDelete(id);
  }

  /**
   * Check if a URL is unique
   */
  async checkUrlUniqueness(url: string): Promise<boolean> {
    return this.trackerRepository.checkUrlUniqueness(url);
  }

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

    // Format validation only, uniqueness already checked in batch
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

    const existingTrackers = await this.getTrackersByUserId(userId);
    const activeTrackers = existingTrackers.filter((t) => !t.isDeleted);

    if (activeTrackers.length > 0) {
      throw new BadRequestException(
        `You already have ${activeTrackers.length} tracker(s) registered. Use /api/trackers/add to add more.`,
      );
    }

    const parsedUrls = await this.validateTrackerUrls(urls, userId);

    const trackers = [];
    for (const { url, parsed } of parsedUrls) {
      const tracker = await this.createTracker(
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

    this.logger.log(
      `Registered ${trackers.length} tracker(s) for user ${userId}`,
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

    const existingTrackers = await this.getTrackersByUserId(userId);
    const activeTrackers = existingTrackers.filter((t) => !t.isDeleted);

    this.validateTrackerCount(
      activeTrackers.length,
      4,
      'You have reached the maximum of 4 trackers. Please remove one before adding another.',
    );

    const parsed = await this.validationService.validateTrackerUrl(url, userId);

    const tracker = await this.createTracker(
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

    this.logger.log(
      `Added tracker ${tracker.id} for user ${userId} (${activeTrackers.length + 1}/4)`,
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

    this.logger.log(`Enqueued refresh job for tracker ${trackerId}`);
  }

  /**
   * Get scraping status for a tracker
   */
  async getScrapingStatus(trackerId: string) {
    const tracker = await this.prisma.tracker.findUnique({
      where: { id: trackerId },
      select: {
        id: true,
        scrapingStatus: true,
        scrapingError: true,
        lastScrapedAt: true,
        scrapingAttempts: true,
      },
    });

    if (!tracker) {
      throw new NotFoundException('Tracker not found');
    }

    return {
      status: tracker.scrapingStatus,
      error: tracker.scrapingError,
      lastScrapedAt: tracker.lastScrapedAt,
      attempts: tracker.scrapingAttempts,
    };
  }

  /**
   * Get all seasons for a tracker
   */
  async getTrackerSeasons(trackerId: string): Promise<TrackerSeason[]> {
    return this.seasonService.getSeasonsByTracker(trackerId);
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
