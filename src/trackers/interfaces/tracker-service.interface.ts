import { TrackerQueryOptions } from './tracker-query.options';
import {
  Game,
  GamePlatform,
  Tracker,
  TrackerSeason,
  TrackerScrapingStatus,
} from '@prisma/client';

/**
 * ITrackerService - Interface for tracker operations
 *
 * Abstracts tracker business logic to enable dependency inversion.
 * This interface allows other modules to depend on abstractions rather than
 * concrete implementations, reducing coupling and improving testability.
 */
export interface ITrackerService {
  /**
   * Create a new tracker
   * @param url - Tracker URL
   * @param game - Game type
   * @param platform - Game platform
   * @param username - Username for the tracker
   * @param userId - User ID who owns the tracker
   * @param displayName - Optional display name
   * @param registrationChannelId - Optional registration channel ID
   * @param registrationInteractionToken - Optional registration interaction token
   * @returns Created tracker
   */
  createTracker(
    url: string,
    game: Game,
    platform: GamePlatform,
    username: string,
    userId: string,
    displayName?: string,
    registrationChannelId?: string,
    registrationInteractionToken?: string,
  ): Promise<Tracker>;

  /**
   * Get tracker by ID with seasons relationship
   * @param id - Tracker ID
   * @returns Tracker with seasons included
   */
  getTrackerById(id: string): Promise<Tracker & { seasons: TrackerSeason[] }>;

  /**
   * Get trackers for a user with optional query options and pagination
   * @param userId - User ID to find trackers for
   * @param options - Optional query options for filtering, sorting, and pagination
   * @returns Paginated response with trackers data and pagination metadata
   */
  getTrackersByUserId(
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
  }>;

  /**
   * Find the best/most recent tracker from a user's active trackers
   * Used for skill validation when checking league requirements
   * @param userId - User ID to find trackers for
   * @returns Best tracker with seasons or null if no active trackers exist
   */
  findBestTrackerForUser(
    userId: string,
  ): Promise<(Tracker & { seasons: TrackerSeason[] }) | null>;

  /**
   * Get trackers accessible to a guild
   * Guilds can access trackers for users who are members of that guild
   * @param guildId - Guild ID
   * @returns Array of trackers
   */
  getTrackersByGuild(guildId: string): Promise<Tracker[]>;

  /**
   * Get tracker by URL
   * @param url - Tracker URL
   * @returns Tracker or null if not found
   */
  getTrackerByUrl(url: string): Promise<Tracker | null>;

  /**
   * Update tracker metadata
   * @param id - Tracker ID
   * @param displayName - Optional display name
   * @param isActive - Optional active status
   * @returns Updated tracker
   */
  updateTracker(
    id: string,
    displayName?: string,
    isActive?: boolean,
  ): Promise<Tracker>;

  /**
   * Soft delete a tracker
   * @param id - Tracker ID
   * @returns Deleted tracker
   */
  deleteTracker(id: string): Promise<Tracker>;

  /**
   * Check if a URL is unique
   * @param url - Tracker URL to check
   * @returns True if URL is unique, false otherwise
   */
  checkUrlUniqueness(url: string): Promise<boolean>;

  /**
   * Get scraping status for a tracker
   * @param trackerId - Tracker ID
   * @param preFetchedTracker - Optional pre-fetched tracker object with scraping fields. If provided, skips database fetch.
   * @returns Scraping status information
   */
  getScrapingStatus(
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
  }>;

  /**
   * Get all seasons for a tracker
   * @param trackerId - Tracker ID
   * @returns Array of tracker seasons
   */
  getTrackerSeasons(trackerId: string): Promise<TrackerSeason[]>;
}
