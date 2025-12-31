import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { ILoggingService } from '../../infrastructure/logging/interfaces/logging.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { TrackerRepository } from '../repositories/tracker.repository';
import { TrackerSeasonService } from './tracker-season.service';
import {
  GamePlatform,
  Game,
  TrackerSeason,
  Tracker,
  Prisma,
} from '@prisma/client';
import { TrackerQueryOptions } from '../interfaces/tracker-query.options';

@Injectable()
export class TrackerService {
  private readonly serviceName = TrackerService.name;

  constructor(
    private readonly prisma: PrismaService,
    private readonly trackerRepository: TrackerRepository,
    private readonly seasonService: TrackerSeasonService,
    @Inject(ILoggingService)
    private readonly loggingService: ILoggingService,
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
   * Get trackers for a user with optional query options and pagination
   * Single Responsibility: User tracker retrieval with query options
   *
   * @param userId - User ID to find trackers for
   * @param options - Optional query options for filtering, sorting, and pagination
   * @returns Paginated response with trackers data and pagination metadata
   */
  async getTrackersByUserId(
    userId: string,
    options?: TrackerQueryOptions,
  ): Promise<{
    data: Tracker[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    return this.trackerRepository.findByUserId(userId, options);
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
   * Get scraping status for a tracker
   * @param trackerId - Tracker ID
   * @param preFetchedTracker - Optional pre-fetched tracker object with scraping fields. If provided, skips database fetch.
   */
  async getScrapingStatus(
    trackerId: string,
    preFetchedTracker?: Pick<
      Tracker,
      'scrapingStatus' | 'scrapingError' | 'lastScrapedAt' | 'scrapingAttempts'
    >,
  ) {
    if (preFetchedTracker) {
      return {
        status: preFetchedTracker.scrapingStatus,
        error: preFetchedTracker.scrapingError,
        lastScrapedAt: preFetchedTracker.lastScrapedAt,
        attempts: preFetchedTracker.scrapingAttempts,
      };
    }

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
