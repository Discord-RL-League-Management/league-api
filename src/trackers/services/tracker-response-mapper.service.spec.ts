/**
 * TrackerResponseMapperService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TrackerResponseMapperService } from './tracker-response-mapper.service';
import { Tracker, TrackerSeason } from '@prisma/client';
import { Game, GamePlatform, TrackerScrapingStatus } from '@prisma/client';

describe('TrackerResponseMapperService', () => {
  let service: TrackerResponseMapperService;

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

  const mockSeason: TrackerSeason = {
    id: 'season_123',
    trackerId: 'tracker_123',
    seasonNumber: 1,
    playlist1v1: null,
    playlist2v2: null,
    playlist3v3: null,
    playlist4v4: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    service = new TrackerResponseMapperService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('transformTrackerDetail', () => {
    it('should_transform_tracker_with_seasons_when_seasons_are_provided', () => {
      const trackerWithSeasons = {
        ...mockTracker,
        seasons: [mockSeason],
      };

      const result = service.transformTrackerDetail(trackerWithSeasons);

      expect(result.tracker).toEqual(mockTracker);
      expect(result.seasons).toEqual([mockSeason]);
      expect(result.seasons).toHaveLength(1);
    });

    it('should_transform_tracker_without_seasons_when_seasons_are_not_provided', () => {
      const trackerWithoutSeasons = {
        ...mockTracker,
      };

      const result = service.transformTrackerDetail(trackerWithoutSeasons);

      expect(result.tracker).toEqual(mockTracker);
      expect(result.seasons).toEqual([]);
      expect(result.seasons).toHaveLength(0);
    });

    it('should_transform_tracker_with_empty_seasons_array_when_seasons_is_empty', () => {
      const trackerWithEmptySeasons = {
        ...mockTracker,
        seasons: [],
      };

      const result = service.transformTrackerDetail(trackerWithEmptySeasons);

      expect(result.tracker).toEqual(mockTracker);
      expect(result.seasons).toEqual([]);
      expect(result.seasons).toHaveLength(0);
    });

    it('should_transform_tracker_with_multiple_seasons_when_multiple_seasons_provided', () => {
      const season2 = {
        ...mockSeason,
        id: 'season_456',
        seasonNumber: 2,
      };
      const trackerWithMultipleSeasons = {
        ...mockTracker,
        seasons: [mockSeason, season2],
      };

      const result = service.transformTrackerDetail(trackerWithMultipleSeasons);

      expect(result.tracker).toEqual(mockTracker);
      expect(result.seasons).toEqual([mockSeason, season2]);
      expect(result.seasons).toHaveLength(2);
    });

    it('should_not_include_seasons_in_tracker_object_when_transformed', () => {
      const trackerWithSeasons = {
        ...mockTracker,
        seasons: [mockSeason],
      };

      const result = service.transformTrackerDetail(trackerWithSeasons);

      expect('seasons' in result.tracker).toBe(false);
      expect(result.tracker.id).toBe(mockTracker.id);
      expect(result.tracker.url).toBe(mockTracker.url);
    });
  });
});
