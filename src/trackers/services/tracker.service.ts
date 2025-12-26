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
   * Ensure user exists in database, creating or updating as needed
   * Single Responsibility: User upsert logic
   */
  private async ensureUserExists(
    userId: string,
    userData?: { username: string; globalName?: string; avatar?: string },
  ): Promise<void> {
    const username = userData?.username || userId;
    const globalName = userData?.globalName ?? null;
    const avatar = userData?.avatar ?? null;

    await this.prisma.user.upsert({
      where: { id: userId },
      update: {
        username,
        globalName,
        avatar,
      },
      create: {
        id: userId,
        username,
        globalName,
        avatar,
      },
    });
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
    await this.ensureUserExists(userId, userData);

    if (urls.length === 0 || urls.length > 4) {
      throw new BadRequestException(
        'You must provide between 1 and 4 tracker URLs',
      );
    }

    const existingTrackers = await this.getTrackersByUserId(userId);
    const activeTrackers = existingTrackers.filter((t) => !t.isDeleted);

    if (activeTrackers.length > 0) {
      throw new BadRequestException(
        `You already have ${activeTrackers.length} tracker(s) registered. Use /api/trackers/add to add more.`,
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
      this.validationService
        .validateTrackerUrl(url, userId, undefined, true)
        .catch((error) => {
          throw error;
        }),
    );

    const parsedResults = await Promise.all(validationPromises);
    const parsedUrls = uniqueUrls.map((url, index) => ({
      url,
      parsed: parsedResults[index],
    }));

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

      const canProcess = await this.processingGuard.canProcessTracker(
        tracker.id,
      );

      if (!canProcess) {
        await this.prisma.tracker
          .update({
            where: { id: tracker.id },
            data: {
              scrapingStatus: TrackerScrapingStatus.FAILED,
              scrapingError: 'Tracker processing disabled by guild settings',
              scrapingAttempts: 1,
            },
          })
          .catch((updateError) => {
            this.logger.error(
              `Failed to update tracker ${tracker.id} status after processing guard check: ${updateError instanceof Error ? updateError.message : String(updateError)}`,
            );
          });
        this.logger.warn(
          `Skipping tracker ${tracker.id} - processing disabled by guild settings`,
        );
        continue;
      }

      this.scrapingQueueService.addScrapingJob(tracker.id).catch((error) => {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to enqueue scraping job for tracker ${tracker.id}: ${errorMessage}`,
        );
        this.prisma.tracker
          .update({
            where: { id: tracker.id },
            data: {
              scrapingStatus: TrackerScrapingStatus.FAILED,
              scrapingError: `Failed to enqueue scraping job: ${errorMessage}`,
              scrapingAttempts: 1,
            },
          })
          .catch((updateError) => {
            this.logger.error(
              `Failed to update tracker ${tracker.id} status after enqueue failure: ${updateError instanceof Error ? updateError.message : String(updateError)}`,
            );
          });
      });
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
    await this.ensureUserExists(userId, userData);

    const existingTrackers = await this.getTrackersByUserId(userId);
    const activeTrackers = existingTrackers.filter((t) => !t.isDeleted);

    if (activeTrackers.length >= 4) {
      throw new BadRequestException(
        'You have reached the maximum of 4 trackers. Please remove one before adding another.',
      );
    }

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

    const canProcess = await this.processingGuard.canProcessTracker(tracker.id);

    if (!canProcess) {
      await this.prisma.tracker
        .update({
          where: { id: tracker.id },
          data: {
            scrapingStatus: TrackerScrapingStatus.FAILED,
            scrapingError: 'Tracker processing disabled by guild settings',
            scrapingAttempts: 1,
          },
        })
        .catch((updateError) => {
          this.logger.error(
            `Failed to update tracker ${tracker.id} status after processing guard check: ${updateError instanceof Error ? updateError.message : String(updateError)}`,
          );
        });
      this.logger.warn(
        `Skipping tracker ${tracker.id} - processing disabled by guild settings`,
      );
    } else {
      this.scrapingQueueService.addScrapingJob(tracker.id).catch((error) => {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to enqueue scraping job for tracker ${tracker.id}: ${errorMessage}`,
        );
        this.prisma.tracker
          .update({
            where: { id: tracker.id },
            data: {
              scrapingStatus: TrackerScrapingStatus.FAILED,
              scrapingError: `Failed to enqueue scraping job: ${errorMessage}`,
              scrapingAttempts: 1,
            },
          })
          .catch(() => {});
      });
    }

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
