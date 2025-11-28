import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TrackerRepository } from '../repositories/tracker.repository';
import { TrackerValidationService } from './tracker-validation.service';
import { TrackerScrapingQueueService } from '../queues/tracker-scraping.queue';
import { TrackerSeasonService } from './tracker-season.service';
import {
  GamePlatform,
  Game,
  TrackerScrapingStatus,
  TrackerSeason,
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
  ) {
    return this.trackerRepository.create({
      url,
      game,
      platform,
      username,
      userId,
      displayName,
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
    const tracker = await this.getTrackerById(id);

    const updateData: any = {};
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
    const tracker = await this.getTrackerById(id);
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
  ) {
    // Ensure user exists before creating trackers
    await this.ensureUserExists(userId, userData);

    if (urls.length === 0 || urls.length > 4) {
      throw new BadRequestException(
        'You must provide between 1 and 4 tracker URLs',
      );
    }

    // Check if user already has trackers
    const existingTrackers = await this.getTrackersByUserId(userId);
    const activeTrackers = existingTrackers.filter((t) => !t.isDeleted);

    if (activeTrackers.length > 0) {
      throw new BadRequestException(
        `You already have ${activeTrackers.length} tracker(s) registered. Use /api/trackers/add to add more.`,
      );
    }

    // Validate all URLs and check for duplicates
    const uniqueUrls = Array.from(new Set(urls));
    if (uniqueUrls.length !== urls.length) {
      throw new BadRequestException('Duplicate URLs are not allowed');
    }

    const trackers = [];
    for (const url of uniqueUrls) {
      const parsed = await this.validationService.validateTrackerUrl(
        url,
        userId,
      );
      const tracker = await this.createTracker(
        url,
        parsed.game,
        parsed.platform,
        parsed.username,
        userId,
      );
      trackers.push(tracker);

      // Enqueue scraping job (async)
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
  ) {
    // Ensure user exists before creating tracker
    await this.ensureUserExists(userId, userData);

    // Check current tracker count
    const existingTrackers = await this.getTrackersByUserId(userId);
    const activeTrackers = existingTrackers.filter((t) => !t.isDeleted);

    if (activeTrackers.length >= 4) {
      throw new BadRequestException(
        'You have reached the maximum of 4 trackers. Please remove one before adding another.',
      );
    }

    // Validate tracker URL format and uniqueness
    const parsed = await this.validationService.validateTrackerUrl(url, userId);

    // Create new tracker
    const tracker = await this.createTracker(
      url,
      parsed.game,
      parsed.platform,
      parsed.username,
      userId,
    );

    // Enqueue scraping job (async)
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

    // Update status to PENDING
    await this.prisma.tracker.update({
      where: { id: trackerId },
      data: {
        scrapingStatus: TrackerScrapingStatus.PENDING,
        scrapingError: null,
      },
    });

    // Enqueue scraping job
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
}
