/**
 * TrackerService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { TrackerService } from './tracker.service';
import { TrackerRepository } from './repositories/tracker.repository';
import { TrackerSeasonService } from './services/tracker-season.service';
import { Game, GamePlatform, TrackerScrapingStatus } from '@prisma/client';

describe('TrackerService', () => {
  let service: TrackerService;
  let mockRepository: TrackerRepository;
  let mockSeasonService: TrackerSeasonService;

  const mockTracker = {
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

  beforeEach(() => {
    mockRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByUrl: vi.fn(),
      findByUserId: vi.fn(),
      findByGuildId: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      checkUrlUniqueness: vi.fn(),
      findBestForUser: vi.fn(),
    } as unknown as TrackerRepository;

    mockSeasonService = {
      getSeasonsByTracker: vi.fn().mockResolvedValue([]),
    } as unknown as TrackerSeasonService;

    service = new TrackerService(mockRepository, mockSeasonService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createTracker', () => {
    it('should_create_tracker_with_valid_data', async () => {
      const url =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview';
      const game = Game.ROCKET_LEAGUE;
      const platform = GamePlatform.STEAM;
      const username = 'testuser';
      const userId = 'user_123';

      vi.mocked(mockRepository.create).mockResolvedValue(mockTracker);

      const result = await service.createTracker(
        url,
        game,
        platform,
        username,
        userId,
      );

      expect(result).toEqual(mockTracker);
      expect(result.url).toBe(url);
      expect(result.game).toBe(game);
      expect(result.platform).toBe(platform);
    });
  });

  describe('getTrackerById', () => {
    it('should_return_tracker_with_seasons_when_tracker_exists', async () => {
      const trackerId = 'tracker_123';
      const trackerWithSeasons = {
        ...mockTracker,
        seasons: [],
      };

      vi.mocked(mockRepository.findById).mockResolvedValue(mockTracker);
      vi.mocked(mockSeasonService.getSeasonsByTracker).mockResolvedValue([]);

      const result = await service.getTrackerById(trackerId);

      expect(result).toEqual(trackerWithSeasons);
      expect(result.id).toBe(trackerId);
      expect(mockRepository.findById).toHaveBeenCalledWith(trackerId);
      expect(mockSeasonService.getSeasonsByTracker).toHaveBeenCalledWith(
        trackerId,
      );
    });

    it('should_throw_NotFoundException_when_tracker_does_not_exist', async () => {
      const trackerId = 'nonexistent';
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      await expect(service.getTrackerById(trackerId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockRepository.findById).toHaveBeenCalledWith(trackerId);
    });
  });

  describe('getTrackersByUserId', () => {
    it('should_return_active_trackers_for_user', async () => {
      const userId = 'user_123';
      const trackers = [mockTracker];
      const paginatedResult = {
        data: trackers,
        pagination: {
          page: 1,
          limit: 50,
          total: 1,
          pages: 1,
        },
      };

      vi.mocked(mockRepository.findByUserId).mockResolvedValue(
        paginatedResult as any,
      );

      const result = await service.getTrackersByUserId(userId);

      expect(result).toEqual(paginatedResult);
      expect(result.data.length).toBe(1);
      expect(result.data[0].userId).toBe(userId);
      expect(mockRepository.findByUserId).toHaveBeenCalledWith(
        userId,
        undefined,
      );
    });

    it('should_return_empty_array_when_user_has_no_trackers', async () => {
      const userId = 'user_999';
      const paginatedResult = {
        data: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          pages: 0,
        },
      };

      vi.mocked(mockRepository.findByUserId).mockResolvedValue(
        paginatedResult as any,
      );

      const result = await service.getTrackersByUserId(userId);

      expect(result).toEqual(paginatedResult);
      expect(result.data.length).toBe(0);
    });

    it('should_pass_query_options_to_repository', async () => {
      const userId = 'user_123';
      const queryOptions = {
        platform: 'STEAM' as const,
        page: 2,
        limit: 10,
      };
      const paginatedResult = {
        data: [mockTracker],
        pagination: {
          page: 2,
          limit: 10,
          total: 1,
          pages: 1,
        },
      };

      vi.mocked(mockRepository.findByUserId).mockResolvedValue(
        paginatedResult as any,
      );

      const result = await service.getTrackersByUserId(userId, queryOptions);

      expect(mockRepository.findByUserId).toHaveBeenCalledWith(
        userId,
        queryOptions,
      );
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
    });

    it('should_filter_by_platform_when_platform_provided', async () => {
      const userId = 'user_123';
      const queryOptions = {
        platform: GamePlatform.STEAM,
      };
      const paginatedResult = {
        data: [mockTracker],
        pagination: {
          page: 1,
          limit: 50,
          total: 1,
          pages: 1,
        },
      };

      vi.mocked(mockRepository.findByUserId).mockResolvedValue(
        paginatedResult as any,
      );

      await service.getTrackersByUserId(userId, queryOptions);

      expect(mockRepository.findByUserId).toHaveBeenCalledWith(
        userId,
        queryOptions,
      );
    });

    it('should_filter_by_status_when_status_provided', async () => {
      const userId = 'user_123';
      const queryOptions = {
        status: TrackerScrapingStatus.PENDING,
      };
      const paginatedResult = {
        data: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          pages: 0,
        },
      };

      vi.mocked(mockRepository.findByUserId).mockResolvedValue(
        paginatedResult as any,
      );

      await service.getTrackersByUserId(userId, queryOptions);

      expect(mockRepository.findByUserId).toHaveBeenCalledWith(
        userId,
        queryOptions,
      );
    });

    it('should_filter_by_active_status_when_isActive_provided', async () => {
      const userId = 'user_123';
      const queryOptions = {
        isActive: true,
      };
      const paginatedResult = {
        data: [mockTracker],
        pagination: {
          page: 1,
          limit: 50,
          total: 1,
          pages: 1,
        },
      };

      vi.mocked(mockRepository.findByUserId).mockResolvedValue(
        paginatedResult as any,
      );

      await service.getTrackersByUserId(userId, queryOptions);

      expect(mockRepository.findByUserId).toHaveBeenCalledWith(
        userId,
        queryOptions,
      );
    });

    it('should_sort_by_specified_field_when_sortBy_provided', async () => {
      const userId = 'user_123';
      const queryOptions = {
        sortBy: 'createdAt' as const,
        sortOrder: 'desc' as const,
      };
      const paginatedResult = {
        data: [mockTracker],
        pagination: {
          page: 1,
          limit: 50,
          total: 1,
          pages: 1,
        },
      };

      vi.mocked(mockRepository.findByUserId).mockResolvedValue(
        paginatedResult as any,
      );

      await service.getTrackersByUserId(userId, queryOptions);

      expect(mockRepository.findByUserId).toHaveBeenCalledWith(
        userId,
        queryOptions,
      );
    });

    it('should_respect_pagination_limit_when_limit_provided', async () => {
      const userId = 'user_123';
      const queryOptions = {
        page: 1,
        limit: 25,
      };
      const paginatedResult = {
        data: [mockTracker],
        pagination: {
          page: 1,
          limit: 25,
          total: 1,
          pages: 1,
        },
      };

      vi.mocked(mockRepository.findByUserId).mockResolvedValue(
        paginatedResult as any,
      );

      const result = await service.getTrackersByUserId(userId, queryOptions);

      expect(result.pagination.limit).toBe(25);
      expect(mockRepository.findByUserId).toHaveBeenCalledWith(
        userId,
        queryOptions,
      );
    });
  });

  describe('getTrackersByGuild', () => {
    it('should_return_trackers_accessible_to_guild', async () => {
      const guildId = 'guild_123';
      const trackers = [mockTracker];

      vi.mocked(mockRepository.findByGuildId).mockResolvedValue(trackers);

      const result = await service.getTrackersByGuild(guildId);

      expect(result).toEqual(trackers);
    });
  });

  describe('getTrackerByUrl', () => {
    it('should_return_tracker_when_url_exists', async () => {
      const url =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview';
      vi.mocked(mockRepository.findByUrl).mockResolvedValue(mockTracker);

      const result = await service.getTrackerByUrl(url);

      expect(result).toEqual(mockTracker);
      expect(result?.url).toBe(url);
    });

    it('should_return_null_when_url_does_not_exist', async () => {
      const url = 'https://nonexistent.url';
      vi.mocked(mockRepository.findByUrl).mockResolvedValue(null);

      const result = await service.getTrackerByUrl(url);

      expect(result).toBeNull();
    });
  });

  describe('updateTracker', () => {
    it('should_update_display_name_when_provided', async () => {
      const trackerId = 'tracker_123';
      const displayName = 'Updated Display Name';
      const updatedTracker = { ...mockTracker, displayName };

      vi.mocked(mockRepository.findById).mockResolvedValue(mockTracker);
      vi.mocked(mockSeasonService.getSeasonsByTracker).mockResolvedValue([]);
      vi.mocked(mockRepository.update).mockResolvedValue(updatedTracker);

      const result = await service.updateTracker(trackerId, displayName);

      expect(result).toEqual(updatedTracker);
      expect(result.displayName).toBe(displayName);
      expect(mockRepository.findById).toHaveBeenCalledWith(trackerId);
    });

    it('should_update_is_active_status_when_provided', async () => {
      const trackerId = 'tracker_123';
      const isActive = false;
      const updatedTracker = { ...mockTracker, isActive };

      vi.mocked(mockRepository.findById).mockResolvedValue(mockTracker);
      vi.mocked(mockSeasonService.getSeasonsByTracker).mockResolvedValue([]);
      vi.mocked(mockRepository.update).mockResolvedValue(updatedTracker);

      const result = await service.updateTracker(
        trackerId,
        undefined,
        isActive,
      );

      expect(result).toEqual(updatedTracker);
      expect(result.isActive).toBe(isActive);
      expect(mockRepository.findById).toHaveBeenCalledWith(trackerId);
    });

    it('should_throw_NotFoundException_when_tracker_does_not_exist', async () => {
      const trackerId = 'nonexistent';
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      await expect(
        service.updateTracker(trackerId, 'New Name'),
      ).rejects.toThrow(NotFoundException);
      expect(mockRepository.findById).toHaveBeenCalledWith(trackerId);
    });
  });

  describe('deleteTracker', () => {
    it('should_soft_delete_tracker_when_tracker_exists', async () => {
      const trackerId = 'tracker_123';
      const deletedTracker = { ...mockTracker, isDeleted: true };

      vi.mocked(mockRepository.findById).mockResolvedValue(mockTracker);
      vi.mocked(mockSeasonService.getSeasonsByTracker).mockResolvedValue([]);
      vi.mocked(mockRepository.softDelete).mockResolvedValue(deletedTracker);

      const result = await service.deleteTracker(trackerId);

      expect(result).toEqual(deletedTracker);
      expect(result.isDeleted).toBe(true);
      expect(mockRepository.findById).toHaveBeenCalledWith(trackerId);
    });

    it('should_throw_NotFoundException_when_tracker_does_not_exist', async () => {
      const trackerId = 'nonexistent';
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      await expect(service.deleteTracker(trackerId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockRepository.findById).toHaveBeenCalledWith(trackerId);
    });
  });

  describe('checkUrlUniqueness', () => {
    it('should_return_true_when_url_is_unique', async () => {
      const url =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview';
      vi.mocked(mockRepository.checkUrlUniqueness).mockResolvedValue(true);

      const result = await service.checkUrlUniqueness(url);

      expect(result).toBe(true);
    });

    it('should_return_false_when_url_already_exists', async () => {
      const url = 'https://existing.url';
      vi.mocked(mockRepository.checkUrlUniqueness).mockResolvedValue(false);

      const result = await service.checkUrlUniqueness(url);

      expect(result).toBe(false);
    });
  });

  describe('findBestTrackerForUser', () => {
    it('should_delegate_to_repository_findBestForUser', async () => {
      const userId = 'user_123';
      const expectedTracker = {
        ...mockTracker,
        seasons: [{ seasonNumber: 25 }],
      };

      vi.mocked(mockRepository.findBestForUser).mockResolvedValue(
        expectedTracker as any,
      );

      const result = await service.findBestTrackerForUser(userId);

      expect(result).toEqual(expectedTracker);
      expect(mockRepository.findBestForUser).toHaveBeenCalledWith(userId);
      expect(mockRepository.findBestForUser).toHaveBeenCalledTimes(1);
    });

    it('should_return_null_when_repository_returns_null', async () => {
      const userId = 'user_123';

      vi.mocked(mockRepository.findBestForUser).mockResolvedValue(null);

      const result = await service.findBestTrackerForUser(userId);

      expect(result).toBeNull();
      expect(mockRepository.findBestForUser).toHaveBeenCalledWith(userId);
    });
  });
});
