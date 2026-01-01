/**
 * TrackerServiceAdapter Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TrackerServiceAdapter } from '@/trackers/adapters/tracker-service.adapter';
import { TrackerService } from '@/trackers/services/tracker.service';
import { TrackerQueryOptions } from '@/trackers/interfaces/tracker-query.options';
import {
  Game,
  GamePlatform,
  Tracker,
  TrackerSeason,
  TrackerScrapingStatus,
} from '@prisma/client';

describe('TrackerServiceAdapter', () => {
  let adapter: TrackerServiceAdapter;
  let mockTrackerService: TrackerService;

  const mockTracker: Tracker = {
    id: 'tracker_123',
    url: 'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview',
    game: Game.ROCKET_LEAGUE,
    platform: GamePlatform.STEAM,
    username: 'testuser',
    userId: 'user_123',
    displayName: null,
    isActive: true,
    isDeleted: false,
    lastScrapedAt: null,
    scrapingStatus: TrackerScrapingStatus.PENDING,
    scrapingError: null,
    scrapingAttempts: 0,
    registrationChannelId: null,
    registrationInteractionToken: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTrackerWithSeasons: Tracker & { seasons: TrackerSeason[] } = {
    ...mockTracker,
    seasons: [],
  };

  beforeEach(() => {
    mockTrackerService = {
      createTracker: vi.fn(),
      getTrackerById: vi.fn(),
      getTrackersByUserId: vi.fn(),
      findBestTrackerForUser: vi.fn(),
      getTrackersByGuild: vi.fn(),
      getTrackerByUrl: vi.fn(),
      updateTracker: vi.fn(),
      deleteTracker: vi.fn(),
      checkUrlUniqueness: vi.fn(),
      getScrapingStatus: vi.fn(),
      getTrackerSeasons: vi.fn(),
    } as unknown as TrackerService;

    adapter = new TrackerServiceAdapter(mockTrackerService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createTracker', () => {
    it('should_delegate_create_tracker_to_tracker_service_when_called', async () => {
      // ARRANGE
      const url =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview';
      const game = Game.ROCKET_LEAGUE;
      const platform = GamePlatform.STEAM;
      const username = 'testuser';
      const userId = 'user_123';
      vi.spyOn(mockTrackerService, 'createTracker').mockResolvedValue(
        mockTracker,
      );

      // ACT
      const result = await adapter.createTracker(
        url,
        game,
        platform,
        username,
        userId,
      );

      // ASSERT
      expect(result).toBe(mockTracker);
      expect(mockTrackerService.createTracker).toHaveBeenCalledWith(
        url,
        game,
        platform,
        username,
        userId,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should_delegate_create_tracker_with_optional_params_to_tracker_service_when_called', async () => {
      // ARRANGE
      const url =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview';
      const game = Game.ROCKET_LEAGUE;
      const platform = GamePlatform.STEAM;
      const username = 'testuser';
      const userId = 'user_123';
      const displayName = 'Test User';
      const registrationChannelId = 'channel_123';
      const registrationInteractionToken = 'token_123';
      vi.spyOn(mockTrackerService, 'createTracker').mockResolvedValue(
        mockTracker,
      );

      // ACT
      const result = await adapter.createTracker(
        url,
        game,
        platform,
        username,
        userId,
        displayName,
        registrationChannelId,
        registrationInteractionToken,
      );

      // ASSERT
      expect(result).toBe(mockTracker);
      expect(mockTrackerService.createTracker).toHaveBeenCalledWith(
        url,
        game,
        platform,
        username,
        userId,
        displayName,
        registrationChannelId,
        registrationInteractionToken,
      );
    });
  });

  describe('getTrackerById', () => {
    it('should_delegate_get_tracker_by_id_to_tracker_service_when_called', async () => {
      // ARRANGE
      const id = 'tracker_123';
      vi.spyOn(mockTrackerService, 'getTrackerById').mockResolvedValue(
        mockTrackerWithSeasons,
      );

      // ACT
      const result = await adapter.getTrackerById(id);

      // ASSERT
      expect(result).toBe(mockTrackerWithSeasons);
      expect(mockTrackerService.getTrackerById).toHaveBeenCalledWith(id);
    });
  });

  describe('getTrackersByUserId', () => {
    it('should_delegate_get_trackers_by_user_id_to_tracker_service_when_called_without_options', async () => {
      // ARRANGE
      const userId = 'user_123';
      const expectedResult = {
        data: [mockTracker],
        pagination: {
          page: 1,
          limit: 50,
          total: 1,
          pages: 1,
        },
      };
      vi.spyOn(mockTrackerService, 'getTrackersByUserId').mockResolvedValue(
        expectedResult,
      );

      // ACT
      const result = await adapter.getTrackersByUserId(userId);

      // ASSERT
      expect(result).toBe(expectedResult);
      expect(mockTrackerService.getTrackersByUserId).toHaveBeenCalledWith(
        userId,
        undefined,
      );
    });

    it('should_delegate_get_trackers_by_user_id_to_tracker_service_when_called_with_options', async () => {
      // ARRANGE
      const userId = 'user_123';
      const options: TrackerQueryOptions = {
        page: 2,
        limit: 10,
        platform: GamePlatform.STEAM,
      };
      const expectedResult = {
        data: [mockTracker],
        pagination: {
          page: 2,
          limit: 10,
          total: 1,
          pages: 1,
        },
      };
      vi.spyOn(mockTrackerService, 'getTrackersByUserId').mockResolvedValue(
        expectedResult,
      );

      // ACT
      const result = await adapter.getTrackersByUserId(userId, options);

      // ASSERT
      expect(result).toBe(expectedResult);
      expect(mockTrackerService.getTrackersByUserId).toHaveBeenCalledWith(
        userId,
        options,
      );
    });
  });

  describe('findBestTrackerForUser', () => {
    it('should_delegate_find_best_tracker_for_user_to_tracker_service_when_called', async () => {
      // ARRANGE
      const userId = 'user_123';
      vi.spyOn(mockTrackerService, 'findBestTrackerForUser').mockResolvedValue(
        mockTrackerWithSeasons,
      );

      // ACT
      const result = await adapter.findBestTrackerForUser(userId);

      // ASSERT
      expect(result).toBe(mockTrackerWithSeasons);
      expect(mockTrackerService.findBestTrackerForUser).toHaveBeenCalledWith(
        userId,
      );
    });

    it('should_delegate_find_best_tracker_for_user_when_no_tracker_found', async () => {
      // ARRANGE
      const userId = 'user_123';
      vi.spyOn(mockTrackerService, 'findBestTrackerForUser').mockResolvedValue(
        null,
      );

      // ACT
      const result = await adapter.findBestTrackerForUser(userId);

      // ASSERT
      expect(result).toBeNull();
      expect(mockTrackerService.findBestTrackerForUser).toHaveBeenCalledWith(
        userId,
      );
    });
  });

  describe('getTrackersByGuild', () => {
    it('should_delegate_get_trackers_by_guild_to_tracker_service_when_called', async () => {
      // ARRANGE
      const guildId = 'guild_123';
      const expectedTrackers = [mockTracker];
      vi.spyOn(mockTrackerService, 'getTrackersByGuild').mockResolvedValue(
        expectedTrackers,
      );

      // ACT
      const result = await adapter.getTrackersByGuild(guildId);

      // ASSERT
      expect(result).toBe(expectedTrackers);
      expect(mockTrackerService.getTrackersByGuild).toHaveBeenCalledWith(
        guildId,
      );
    });
  });

  describe('getTrackerByUrl', () => {
    it('should_delegate_get_tracker_by_url_to_tracker_service_when_called', async () => {
      // ARRANGE
      const url =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview';
      vi.spyOn(mockTrackerService, 'getTrackerByUrl').mockResolvedValue(
        mockTracker,
      );

      // ACT
      const result = await adapter.getTrackerByUrl(url);

      // ASSERT
      expect(result).toBe(mockTracker);
      expect(mockTrackerService.getTrackerByUrl).toHaveBeenCalledWith(url);
    });

    it('should_delegate_get_tracker_by_url_when_not_found', async () => {
      // ARRANGE
      const url =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview';
      vi.spyOn(mockTrackerService, 'getTrackerByUrl').mockResolvedValue(null);

      // ACT
      const result = await adapter.getTrackerByUrl(url);

      // ASSERT
      expect(result).toBeNull();
      expect(mockTrackerService.getTrackerByUrl).toHaveBeenCalledWith(url);
    });
  });

  describe('updateTracker', () => {
    it('should_delegate_update_tracker_to_tracker_service_when_called', async () => {
      // ARRANGE
      const id = 'tracker_123';
      const displayName = 'Updated Display Name';
      const isActive = false;
      const updatedTracker = { ...mockTracker, displayName, isActive };
      vi.spyOn(mockTrackerService, 'updateTracker').mockResolvedValue(
        updatedTracker,
      );

      // ACT
      const result = await adapter.updateTracker(id, displayName, isActive);

      // ASSERT
      expect(result).toBe(updatedTracker);
      expect(mockTrackerService.updateTracker).toHaveBeenCalledWith(
        id,
        displayName,
        isActive,
      );
    });
  });

  describe('deleteTracker', () => {
    it('should_delegate_delete_tracker_to_tracker_service_when_called', async () => {
      // ARRANGE
      const id = 'tracker_123';
      const deletedTracker = { ...mockTracker, isDeleted: true };
      vi.spyOn(mockTrackerService, 'deleteTracker').mockResolvedValue(
        deletedTracker,
      );

      // ACT
      const result = await adapter.deleteTracker(id);

      // ASSERT
      expect(result).toBe(deletedTracker);
      expect(mockTrackerService.deleteTracker).toHaveBeenCalledWith(id);
    });
  });

  describe('checkUrlUniqueness', () => {
    it('should_delegate_check_url_uniqueness_to_tracker_service_when_called', async () => {
      // ARRANGE
      const url =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview';
      vi.spyOn(mockTrackerService, 'checkUrlUniqueness').mockResolvedValue(
        true,
      );

      // ACT
      const result = await adapter.checkUrlUniqueness(url);

      // ASSERT
      expect(result).toBe(true);
      expect(mockTrackerService.checkUrlUniqueness).toHaveBeenCalledWith(url);
    });
  });

  describe('getScrapingStatus', () => {
    it('should_delegate_get_scraping_status_to_tracker_service_when_called_without_prefetched', async () => {
      // ARRANGE
      const trackerId = 'tracker_123';
      const expectedStatus = {
        status: TrackerScrapingStatus.PENDING,
        error: null,
        lastScrapedAt: null,
        attempts: 0,
      };
      vi.spyOn(mockTrackerService, 'getScrapingStatus').mockResolvedValue(
        expectedStatus,
      );

      // ACT
      const result = await adapter.getScrapingStatus(trackerId);

      // ASSERT
      expect(result).toBe(expectedStatus);
      expect(mockTrackerService.getScrapingStatus).toHaveBeenCalledWith(
        trackerId,
        undefined,
      );
    });

    it('should_delegate_get_scraping_status_to_tracker_service_when_called_with_prefetched', async () => {
      // ARRANGE
      const trackerId = 'tracker_123';
      const preFetchedTracker = {
        scrapingStatus: TrackerScrapingStatus.COMPLETED,
        scrapingError: null,
        lastScrapedAt: new Date(),
        scrapingAttempts: 1,
      };
      const expectedStatus = {
        status: TrackerScrapingStatus.COMPLETED,
        error: null,
        lastScrapedAt: preFetchedTracker.lastScrapedAt,
        attempts: 1,
      };
      vi.spyOn(mockTrackerService, 'getScrapingStatus').mockResolvedValue(
        expectedStatus,
      );

      // ACT
      const result = await adapter.getScrapingStatus(
        trackerId,
        preFetchedTracker,
      );

      // ASSERT
      expect(result).toBe(expectedStatus);
      expect(mockTrackerService.getScrapingStatus).toHaveBeenCalledWith(
        trackerId,
        preFetchedTracker,
      );
    });
  });

  describe('getTrackerSeasons', () => {
    it('should_delegate_get_tracker_seasons_to_tracker_service_when_called', async () => {
      // ARRANGE
      const trackerId = 'tracker_123';
      const expectedSeasons: TrackerSeason[] = [];
      vi.spyOn(mockTrackerService, 'getTrackerSeasons').mockResolvedValue(
        expectedSeasons,
      );

      // ACT
      const result = await adapter.getTrackerSeasons(trackerId);

      // ASSERT
      expect(result).toBe(expectedSeasons);
      expect(mockTrackerService.getTrackerSeasons).toHaveBeenCalledWith(
        trackerId,
      );
    });
  });
});
