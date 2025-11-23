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
import { GamePlatform, Game, TrackerScrapingStatus, TrackerSeason } from '@prisma/client';

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
      where: { userId },
      include: {
        seasons: {
          orderBy: { seasonNumber: 'desc' },
        },
      },
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
  async updateTracker(
    id: string,
    displayName?: string,
    isActive?: boolean,
  ) {
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
   * Register a new tracker for a user
   * Validates uniqueness and enqueues scraping job
   */
  async registerTracker(userId: string, url: string) {
    // Verify user doesn't already have a tracker (one-to-one)
    await this.verifyUserTrackerUniqueness(userId);

    // Validate tracker URL format and uniqueness
    const parsed = await this.validationService.validateTrackerUrl(url, userId);

    // Verify URL uniqueness
    await this.verifyUrlUniqueness(url);

    // Create tracker record
    const tracker = await this.prisma.tracker.create({
      data: {
        url,
        game: parsed.game,
        platform: parsed.platform,
        username: parsed.username,
        userId,
        scrapingStatus: TrackerScrapingStatus.PENDING,
      },
    });

    // Enqueue scraping job (async, don't await)
    this.scrapingQueueService
      .addScrapingJob(tracker.id)
      .catch((error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to enqueue scraping job for tracker ${tracker.id}: ${errorMessage}`,
        );
        // Update tracker status to indicate queueing failure
        this.prisma.tracker
          .update({
            where: { id: tracker.id },
            data: {
              scrapingStatus: TrackerScrapingStatus.FAILED,
              scrapingError: `Failed to enqueue scraping job: ${errorMessage}`,
              scrapingAttempts: 1,
            },
          })
          .catch((updateError: any) => {
            const updateErrorMessage = updateError instanceof Error ? updateError.message : String(updateError);
            this.logger.error(
              `Failed to update tracker status after queueing failure: ${updateErrorMessage}`,
            );
          });
      });

    this.logger.log(`Registered tracker ${tracker.id} for user ${userId}`);

    return tracker;
  }

  /**
   * Verify that user doesn't already have a tracker (one-to-one relationship)
   */
  async verifyUserTrackerUniqueness(userId: string): Promise<void> {
    const existingTracker = await this.prisma.tracker.findUnique({
      where: { userId },
    });

    if (existingTracker) {
      throw new BadRequestException(
        'You already have a tracker registered. Each user can only have one tracker.',
      );
    }
  }

  /**
   * Verify that URL is unique in the system
   */
  async verifyUrlUniqueness(url: string): Promise<void> {
    const existingTracker = await this.prisma.tracker.findUnique({
      where: { url },
    });

    if (existingTracker) {
      throw new BadRequestException(
        'This tracker URL has already been registered with another user.',
      );
    }
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






