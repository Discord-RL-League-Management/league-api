/**
 * TrackerService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TrackerService } from '@/trackers/services/tracker.service';
import { TrackerRepository } from '@/trackers/repositories/tracker.repository';
import { TrackerValidationService } from '@/trackers/services/tracker-validation.service';
import { TrackerScrapingQueueService } from '@/trackers/queues/tracker-scraping.queue';
import { TrackerSeasonService } from '@/trackers/services/tracker-season.service';
import { TrackerProcessingGuardService } from '@/trackers/services/tracker-processing-guard.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Game, GamePlatform, TrackerScrapingStatus } from '@prisma/client';

describe('TrackerService', () => {
  let service: TrackerService;
  let mockRepository: TrackerRepository;
  let mockValidation: TrackerValidationService;
  let mockScrapingQueue: TrackerScrapingQueueService;
  let mockSeasonService: TrackerSeasonService;
  let mockProcessingGuard: TrackerProcessingGuardService;
  let mockPrisma: PrismaService;

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
    // ARRANGE: Setup test dependencies
    mockRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByUrl: vi.fn(),
      findByUserId: vi.fn(),
      findByGuildId: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      checkUrlUniqueness: vi.fn(),
    } as unknown as TrackerRepository;

    mockValidation = {
      validateTrackerUrl: vi.fn(),
      batchCheckUrlUniqueness: vi.fn().mockResolvedValue(new Map()),
    } as unknown as TrackerValidationService;

    mockScrapingQueue = {
      addScrapingJob: vi.fn().mockResolvedValue(undefined),
    } as unknown as TrackerScrapingQueueService;

    mockSeasonService = {
      getSeasonsByTracker: vi.fn().mockResolvedValue([]),
    } as unknown as TrackerSeasonService;

    mockProcessingGuard = {
      canProcessTracker: vi.fn().mockResolvedValue(true),
      filterProcessableTrackers: vi
        .fn()
        .mockImplementation((ids: string[]) => Promise.resolve(ids)),
      canProcessTrackerForUser: vi.fn().mockResolvedValue(true),
    } as unknown as TrackerProcessingGuardService;

    mockPrisma = {
      user: {
        upsert: vi.fn().mockResolvedValue({ id: 'user_123' }),
      },
      tracker: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
      },
    } as unknown as PrismaService;

    service = new TrackerService(
      mockPrisma,
      mockRepository,
      mockValidation,
      mockScrapingQueue,
      mockSeasonService,
      mockProcessingGuard,
    );
  });

  describe('createTracker', () => {
    it('should_create_tracker_with_valid_data', async () => {
      // ARRANGE
      const url =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview';
      const game = Game.ROCKET_LEAGUE;
      const platform = GamePlatform.STEAM;
      const username = 'testuser';
      const userId = 'user_123';

      vi.mocked(mockRepository.create).mockResolvedValue(mockTracker);

      // ACT
      const result = await service.createTracker(
        url,
        game,
        platform,
        username,
        userId,
      );

      // ASSERT
      expect(result).toEqual(mockTracker);
      expect(result.url).toBe(url);
      expect(result.game).toBe(game);
      expect(result.platform).toBe(platform);
    });
  });

  describe('getTrackerById', () => {
    it('should_return_tracker_with_seasons_when_tracker_exists', async () => {
      // ARRANGE
      const trackerId = 'tracker_123';
      const trackerWithSeasons = {
        ...mockTracker,
        seasons: [],
      };

      vi.mocked(mockPrisma.tracker.findUnique).mockResolvedValue(
        trackerWithSeasons as any,
      );

      // ACT
      const result = await service.getTrackerById(trackerId);

      // ASSERT
      expect(result).toEqual(trackerWithSeasons);
      expect(result.id).toBe(trackerId);
    });

    it('should_throw_NotFoundException_when_tracker_does_not_exist', async () => {
      // ARRANGE
      const trackerId = 'nonexistent';
      vi.mocked(mockPrisma.tracker.findUnique).mockResolvedValue(null);

      // ACT & ASSERT
      await expect(service.getTrackerById(trackerId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getTrackersByUserId', () => {
    it('should_return_active_trackers_for_user', async () => {
      // ARRANGE
      const userId = 'user_123';
      const trackers = [mockTracker];

      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(trackers as any);

      // ACT
      const result = await service.getTrackersByUserId(userId);

      // ASSERT
      expect(result).toEqual(trackers);
      expect(result.length).toBe(1);
      expect(result[0].userId).toBe(userId);
    });

    it('should_return_empty_array_when_user_has_no_trackers', async () => {
      // ARRANGE
      const userId = 'user_999';
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue([]);

      // ACT
      const result = await service.getTrackersByUserId(userId);

      // ASSERT
      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });
  });

  describe('getTrackersByGuild', () => {
    it('should_return_trackers_accessible_to_guild', async () => {
      // ARRANGE
      const guildId = 'guild_123';
      const trackers = [mockTracker];

      vi.mocked(mockRepository.findByGuildId).mockResolvedValue(trackers);

      // ACT
      const result = await service.getTrackersByGuild(guildId);

      // ASSERT
      expect(result).toEqual(trackers);
    });
  });

  describe('getTrackerByUrl', () => {
    it('should_return_tracker_when_url_exists', async () => {
      // ARRANGE
      const url =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview';
      vi.mocked(mockRepository.findByUrl).mockResolvedValue(mockTracker);

      // ACT
      const result = await service.getTrackerByUrl(url);

      // ASSERT
      expect(result).toEqual(mockTracker);
      expect(result?.url).toBe(url);
    });

    it('should_return_null_when_url_does_not_exist', async () => {
      // ARRANGE
      const url = 'https://nonexistent.url';
      vi.mocked(mockRepository.findByUrl).mockResolvedValue(null);

      // ACT
      const result = await service.getTrackerByUrl(url);

      // ASSERT
      expect(result).toBeNull();
    });
  });

  describe('updateTracker', () => {
    it('should_update_display_name_when_provided', async () => {
      // ARRANGE
      const trackerId = 'tracker_123';
      const displayName = 'Updated Display Name';
      const updatedTracker = { ...mockTracker, displayName };

      vi.mocked(mockPrisma.tracker.findUnique).mockResolvedValue(
        mockTracker as any,
      );
      vi.mocked(mockRepository.update).mockResolvedValue(updatedTracker);

      // ACT
      const result = await service.updateTracker(trackerId, displayName);

      // ASSERT
      expect(result).toEqual(updatedTracker);
      expect(result.displayName).toBe(displayName);
    });

    it('should_update_is_active_status_when_provided', async () => {
      // ARRANGE
      const trackerId = 'tracker_123';
      const isActive = false;
      const updatedTracker = { ...mockTracker, isActive };

      vi.mocked(mockPrisma.tracker.findUnique).mockResolvedValue(
        mockTracker as any,
      );
      vi.mocked(mockRepository.update).mockResolvedValue(updatedTracker);

      // ACT
      const result = await service.updateTracker(
        trackerId,
        undefined,
        isActive,
      );

      // ASSERT
      expect(result).toEqual(updatedTracker);
      expect(result.isActive).toBe(isActive);
    });

    it('should_throw_NotFoundException_when_tracker_does_not_exist', async () => {
      // ARRANGE
      const trackerId = 'nonexistent';
      vi.mocked(mockPrisma.tracker.findUnique).mockResolvedValue(null);

      // ACT & ASSERT
      await expect(
        service.updateTracker(trackerId, 'New Name'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteTracker', () => {
    it('should_soft_delete_tracker_when_tracker_exists', async () => {
      // ARRANGE
      const trackerId = 'tracker_123';
      const deletedTracker = { ...mockTracker, isDeleted: true };

      vi.mocked(mockPrisma.tracker.findUnique).mockResolvedValue(
        mockTracker as any,
      );
      vi.mocked(mockRepository.softDelete).mockResolvedValue(deletedTracker);

      // ACT
      const result = await service.deleteTracker(trackerId);

      // ASSERT
      expect(result).toEqual(deletedTracker);
      expect(result.isDeleted).toBe(true);
    });

    it('should_throw_NotFoundException_when_tracker_does_not_exist', async () => {
      // ARRANGE
      const trackerId = 'nonexistent';
      vi.mocked(mockPrisma.tracker.findUnique).mockResolvedValue(null);

      // ACT & ASSERT
      await expect(service.deleteTracker(trackerId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('checkUrlUniqueness', () => {
    it('should_return_true_when_url_is_unique', async () => {
      // ARRANGE
      const url =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview';
      vi.mocked(mockRepository.checkUrlUniqueness).mockResolvedValue(true);

      // ACT
      const result = await service.checkUrlUniqueness(url);

      // ASSERT
      expect(result).toBe(true);
    });

    it('should_return_false_when_url_already_exists', async () => {
      // ARRANGE
      const url = 'https://existing.url';
      vi.mocked(mockRepository.checkUrlUniqueness).mockResolvedValue(false);

      // ACT
      const result = await service.checkUrlUniqueness(url);

      // ASSERT
      expect(result).toBe(false);
    });
  });

  describe('registerTrackers', () => {
    it('should_register_multiple_trackers_when_user_has_no_existing_trackers', async () => {
      // ARRANGE
      const userId = 'user_123';
      const urls = [
        'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser1/overview',
        'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser2/overview',
      ];
      const userData = {
        username: 'testuser',
        globalName: 'Test User',
        avatar: 'avatar_hash',
      };

      const parsedUrl = {
        platform: GamePlatform.STEAM,
        username: 'testuser',
        game: Game.ROCKET_LEAGUE,
        isValid: true,
      };

      const createdTrackers = urls.map((url, i) => ({
        ...mockTracker,
        id: `tracker_${i}`,
        url,
      }));

      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue([]);
      vi.mocked(mockValidation.validateTrackerUrl).mockResolvedValue(
        parsedUrl as any,
      );
      vi.mocked(mockValidation.batchCheckUrlUniqueness).mockResolvedValue(
        new Map(urls.map((url) => [url, true])),
      );
      vi.mocked(mockRepository.create).mockImplementation((data) => {
        const index = urls.indexOf(data.url);
        return Promise.resolve(createdTrackers[index]);
      });

      // ACT
      const result = await service.registerTrackers(userId, urls, userData);

      // ASSERT: Verify all trackers were created
      expect(result).toHaveLength(2);
      expect(result[0].url).toBe(urls[0]);
      expect(result[1].url).toBe(urls[1]);
    });

    it('should_throw_BadRequestException_when_urls_count_is_zero', async () => {
      // ARRANGE
      const userId = 'user_123';
      const urls: string[] = [];

      // ACT & ASSERT
      await expect(service.registerTrackers(userId, urls)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should_throw_BadRequestException_when_urls_count_exceeds_four', async () => {
      // ARRANGE
      const userId = 'user_123';
      const urls = Array(5).fill('https://example.com');

      // ACT & ASSERT
      await expect(service.registerTrackers(userId, urls)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should_throw_BadRequestException_when_user_already_has_trackers', async () => {
      // ARRANGE
      const userId = 'user_123';
      const urls = ['https://example.com'];
      const existingTrackers = [mockTracker];

      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        existingTrackers as any,
      );

      // ACT & ASSERT
      await expect(service.registerTrackers(userId, urls)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should_throw_BadRequestException_when_duplicate_urls_provided', async () => {
      // ARRANGE
      const userId = 'user_123';
      const url = 'https://example.com';
      const urls = [url, url]; // Duplicate URLs

      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue([]);

      // ACT & ASSERT
      await expect(service.registerTrackers(userId, urls)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should_throw_BadRequestException_when_url_already_registered', async () => {
      // ARRANGE
      const userId = 'user_123';
      const urls = ['https://existing.url'];

      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue([]);
      vi.mocked(mockValidation.batchCheckUrlUniqueness).mockResolvedValue(
        new Map([['https://existing.url', false]]),
      );

      // ACT & ASSERT
      await expect(service.registerTrackers(userId, urls)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('addTracker', () => {
    it('should_add_tracker_when_user_has_less_than_four_trackers', async () => {
      // ARRANGE
      const userId = 'user_123';
      const url =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview';
      const userData = {
        username: 'testuser',
        globalName: 'Test User',
      };

      const parsedUrl = {
        platform: GamePlatform.STEAM,
        username: 'testuser',
        game: Game.ROCKET_LEAGUE,
        isValid: true,
      };

      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue([]);
      vi.mocked(mockValidation.validateTrackerUrl).mockResolvedValue(
        parsedUrl as any,
      );
      vi.mocked(mockRepository.create).mockResolvedValue(mockTracker);

      // ACT
      const result = await service.addTracker(userId, url, userData);

      // ASSERT
      expect(result).toEqual(mockTracker);
      expect(result.url).toBe(url);
    });

    it('should_throw_BadRequestException_when_user_has_four_trackers', async () => {
      // ARRANGE
      const userId = 'user_123';
      const url = 'https://example.com';
      const existingTrackers = Array(4).fill(mockTracker);

      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        existingTrackers as any,
      );

      // ACT & ASSERT
      await expect(service.addTracker(userId, url)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
