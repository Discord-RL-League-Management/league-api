import { Injectable } from '@nestjs/common';
import { ITrackerService } from '../interfaces/tracker-service.interface';
import { TrackerService } from '../services/tracker.service';
import { TrackerQueryOptions } from '../interfaces/tracker-query.options';
import {
  Game,
  GamePlatform,
  Tracker,
  TrackerSeason,
  TrackerScrapingStatus,
} from '@prisma/client';

/**
 * TrackerServiceAdapter - Adapter implementing ITrackerService
 *
 * Implements the ITrackerService interface using TrackerService.
 * This adapter enables dependency inversion by allowing other modules to depend
 * on the interface rather than concrete services.
 */
@Injectable()
export class TrackerServiceAdapter implements ITrackerService {
  constructor(private readonly trackerService: TrackerService) {}

  /**
   * Create a new tracker
   * Delegates to TrackerService.createTracker()
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
  ): Promise<Tracker> {
    return this.trackerService.createTracker(
      url,
      game,
      platform,
      username,
      userId,
      displayName,
      registrationChannelId,
      registrationInteractionToken,
    );
  }

  /**
   * Get tracker by ID with seasons relationship
   * Delegates to TrackerService.getTrackerById()
   */
  async getTrackerById(
    id: string,
  ): Promise<Tracker & { seasons: TrackerSeason[] }> {
    return this.trackerService.getTrackerById(id);
  }

  /**
   * Get trackers for a user with optional query options and pagination
   * Delegates to TrackerService.getTrackersByUserId()
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
    return this.trackerService.getTrackersByUserId(userId, options);
  }

  /**
   * Find the best/most recent tracker from a user's active trackers
   * Delegates to TrackerService.findBestTrackerForUser()
   */
  async findBestTrackerForUser(
    userId: string,
  ): Promise<(Tracker & { seasons: TrackerSeason[] }) | null> {
    return this.trackerService.findBestTrackerForUser(userId);
  }

  /**
   * Get trackers accessible to a guild
   * Delegates to TrackerService.getTrackersByGuild()
   */
  async getTrackersByGuild(guildId: string): Promise<Tracker[]> {
    return this.trackerService.getTrackersByGuild(guildId);
  }

  /**
   * Get tracker by URL
   * Delegates to TrackerService.getTrackerByUrl()
   */
  async getTrackerByUrl(url: string): Promise<Tracker | null> {
    return this.trackerService.getTrackerByUrl(url);
  }

  /**
   * Update tracker metadata
   * Delegates to TrackerService.updateTracker()
   */
  async updateTracker(
    id: string,
    displayName?: string,
    isActive?: boolean,
  ): Promise<Tracker> {
    return this.trackerService.updateTracker(id, displayName, isActive);
  }

  /**
   * Soft delete a tracker
   * Delegates to TrackerService.deleteTracker()
   */
  async deleteTracker(id: string): Promise<Tracker> {
    return this.trackerService.deleteTracker(id);
  }

  /**
   * Check if a URL is unique
   * Delegates to TrackerService.checkUrlUniqueness()
   */
  async checkUrlUniqueness(url: string): Promise<boolean> {
    return this.trackerService.checkUrlUniqueness(url);
  }

  /**
   * Get scraping status for a tracker
   * Delegates to TrackerService.getScrapingStatus()
   */
  async getScrapingStatus(
    trackerId: string,
    preFetchedTracker?: Pick<
      Tracker,
      'scrapingStatus' | 'scrapingError' | 'lastScrapedAt' | 'scrapingAttempts'
    >,
  ): Promise<{
    status: TrackerScrapingStatus;
    error: string | null;
    lastScrapedAt: Date | null;
    attempts: number;
  }> {
    return this.trackerService.getScrapingStatus(trackerId, preFetchedTracker);
  }

  /**
   * Get all seasons for a tracker
   * Delegates to TrackerService.getTrackerSeasons()
   */
  async getTrackerSeasons(trackerId: string): Promise<TrackerSeason[]> {
    return this.trackerService.getTrackerSeasons(trackerId);
  }
}
