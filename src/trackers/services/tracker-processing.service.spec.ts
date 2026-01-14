/**
 * TrackerProcessingService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { TrackerProcessingService } from './tracker-processing.service';
import { TrackerService } from '../tracker.service';
import { TrackerRepository } from '../repositories/tracker.repository';
import { TrackerValidationService } from './tracker-validation.service';
import { TrackerUserOrchestratorService } from './tracker-user-orchestrator.service';
import { TrackerQueueOrchestratorService } from './tracker-queue-orchestrator.service';
import { TrackerBatchProcessorService } from './tracker-batch-processor.service';
import { TrackerProcessingGuardService } from './tracker-processing-guard.service';
import { TrackerScrapingQueueService } from '../queues/tracker-scraping.queue';
import { GamePlatform, Game, TrackerScrapingStatus } from '@prisma/client';

describe('TrackerProcessingService', () => {
  let service: TrackerProcessingService;
  let mockTrackerRepository: TrackerRepository;
  let mockTrackerService: TrackerService;
  let mockValidationService: TrackerValidationService;
  let mockUserOrchestrator: TrackerUserOrchestratorService;
  let mockQueueOrchestrator: TrackerQueueOrchestratorService;
  let mockBatchProcessor: TrackerBatchProcessorService;
  let mockProcessingGuard: TrackerProcessingGuardService;
  let mockScrapingQueueService: TrackerScrapingQueueService;

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
    mockTrackerRepository = {
      findById: vi.fn(),
      update: vi.fn(),
    } as unknown as TrackerRepository;

    mockTrackerService = {
      getTrackersByUserId: vi.fn(),
      createTracker: vi.fn(),
    } as unknown as TrackerService;

    mockValidationService = {
      validateTrackerUrl: vi.fn(),
      batchCheckUrlUniqueness: vi.fn(),
    } as unknown as TrackerValidationService;

    mockUserOrchestrator = {
      ensureUserExists: vi.fn().mockResolvedValue(undefined),
    } as unknown as TrackerUserOrchestratorService;

    mockQueueOrchestrator = {
      enqueueTrackerWithGuard: vi.fn().mockResolvedValue(undefined),
    } as unknown as TrackerQueueOrchestratorService;

    mockBatchProcessor = {
      processPendingTrackers: vi.fn(),
      processPendingTrackersForGuild: vi.fn(),
    } as unknown as TrackerBatchProcessorService;

    mockProcessingGuard = {
      canProcessTracker: vi.fn(),
    } as unknown as TrackerProcessingGuardService;

    mockScrapingQueueService = {
      addScrapingJob: vi.fn().mockResolvedValue(undefined),
    } as unknown as TrackerScrapingQueueService;

    service = new TrackerProcessingService(
      mockTrackerRepository,
      mockTrackerService,
      mockValidationService,
      mockUserOrchestrator,
      mockQueueOrchestrator,
      mockBatchProcessor,
      mockProcessingGuard,
      mockScrapingQueueService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('registerTrackers', () => {
    it('should_return_trackers_when_user_has_no_existing_trackers', async () => {
      const userId = 'user_123';
      const urls = [
        'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview',
      ];
      const parsedResult = {
        game: Game.ROCKET_LEAGUE,
        platform: GamePlatform.STEAM,
        username: 'testuser',
      };

      vi.mocked(mockTrackerService.getTrackersByUserId).mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 },
      });
      vi.mocked(
        mockValidationService.batchCheckUrlUniqueness,
      ).mockResolvedValue(new Map([[urls[0], true]]));
      vi.mocked(mockValidationService.validateTrackerUrl).mockResolvedValue(
        parsedResult as never,
      );
      vi.mocked(mockTrackerService.createTracker).mockResolvedValue(
        mockTracker as never,
      );

      const result = await service.registerTrackers(userId, urls);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockTracker);
      expect(mockUserOrchestrator.ensureUserExists).toHaveBeenCalledWith(
        userId,
        undefined,
      );
      expect(
        mockQueueOrchestrator.enqueueTrackerWithGuard,
      ).toHaveBeenCalledWith(mockTracker.id);
    });

    it('should_throw_BadRequestException_when_user_already_has_trackers', async () => {
      const userId = 'user_123';
      const urls = [
        'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview',
      ];

      vi.mocked(mockTrackerService.getTrackersByUserId).mockResolvedValue({
        data: [mockTracker],
        pagination: { page: 1, limit: 10, total: 1, pages: 1 },
      });

      await expect(service.registerTrackers(userId, urls)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.registerTrackers(userId, urls)).rejects.toThrow(
        'You already have 1 tracker(s) registered',
      );
    });

    it('should_throw_BadRequestException_when_more_than_4_urls_provided', async () => {
      const userId = 'user_123';
      const urls = ['url1', 'url2', 'url3', 'url4', 'url5'];

      vi.mocked(mockTrackerService.getTrackersByUserId).mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 },
      });

      await expect(service.registerTrackers(userId, urls)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.registerTrackers(userId, urls)).rejects.toThrow(
        'You must provide between 1 and 4 tracker URLs',
      );
    });

    it('should_throw_BadRequestException_when_no_urls_provided', async () => {
      const userId = 'user_123';
      const urls: string[] = [];

      vi.mocked(mockTrackerService.getTrackersByUserId).mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 },
      });

      await expect(service.registerTrackers(userId, urls)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.registerTrackers(userId, urls)).rejects.toThrow(
        'You must provide between 1 and 4 tracker URLs',
      );
    });

    it('should_throw_BadRequestException_when_duplicate_urls_provided', async () => {
      const userId = 'user_123';
      const url =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview';
      const urls = [url, url];

      vi.mocked(mockTrackerService.getTrackersByUserId).mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 },
      });

      await expect(service.registerTrackers(userId, urls)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.registerTrackers(userId, urls)).rejects.toThrow(
        'Duplicate URLs are not allowed',
      );
    });

    it('should_throw_BadRequestException_when_urls_already_registered', async () => {
      const userId = 'user_123';
      const url =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview';
      const urls = [url];

      vi.mocked(mockTrackerService.getTrackersByUserId).mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 },
      });
      vi.mocked(
        mockValidationService.batchCheckUrlUniqueness,
      ).mockResolvedValue(new Map([[url, false]]));

      await expect(service.registerTrackers(userId, urls)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.registerTrackers(userId, urls)).rejects.toThrow(
        'The following tracker URL(s) have already been registered',
      );
    });

    it('should_register_multiple_trackers_when_valid_urls_provided', async () => {
      const userId = 'user_123';
      const urls = [
        'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser1/overview',
        'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser2/overview',
      ];
      const parsedResult = {
        game: Game.ROCKET_LEAGUE,
        platform: GamePlatform.STEAM,
        username: 'testuser',
      };
      const tracker1 = {
        ...mockTracker,
        id: 'tracker_1',
        username: 'testuser1',
      };
      const tracker2 = {
        ...mockTracker,
        id: 'tracker_2',
        username: 'testuser2',
      };

      vi.mocked(mockTrackerService.getTrackersByUserId).mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 },
      });
      vi.mocked(
        mockValidationService.batchCheckUrlUniqueness,
      ).mockResolvedValue(
        new Map([
          [urls[0], true],
          [urls[1], true],
        ]),
      );
      vi.mocked(mockValidationService.validateTrackerUrl)
        .mockResolvedValueOnce(parsedResult as never)
        .mockResolvedValueOnce(parsedResult as never);
      vi.mocked(mockTrackerService.createTracker)
        .mockResolvedValueOnce(tracker1 as never)
        .mockResolvedValueOnce(tracker2 as never);

      const result = await service.registerTrackers(userId, urls);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(tracker1);
      expect(result[1]).toEqual(tracker2);
      expect(
        mockQueueOrchestrator.enqueueTrackerWithGuard,
      ).toHaveBeenCalledTimes(2);
    });
  });

  describe('addTracker', () => {
    it('should_return_tracker_when_user_has_less_than_4_trackers', async () => {
      const userId = 'user_123';
      const url =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview';
      const parsedResult = {
        game: Game.ROCKET_LEAGUE,
        platform: GamePlatform.STEAM,
        username: 'testuser',
      };

      vi.mocked(mockTrackerService.getTrackersByUserId).mockResolvedValue({
        data: [mockTracker],
        pagination: { page: 1, limit: 10, total: 1, pages: 1 },
      });
      vi.mocked(mockValidationService.validateTrackerUrl).mockResolvedValue(
        parsedResult as never,
      );
      vi.mocked(mockTrackerService.createTracker).mockResolvedValue(
        mockTracker as never,
      );

      const result = await service.addTracker(userId, url);

      expect(result).toEqual(mockTracker);
      expect(mockUserOrchestrator.ensureUserExists).toHaveBeenCalledWith(
        userId,
        undefined,
      );
      expect(
        mockQueueOrchestrator.enqueueTrackerWithGuard,
      ).toHaveBeenCalledWith(mockTracker.id);
    });

    it('should_throw_BadRequestException_when_user_has_4_trackers', async () => {
      const userId = 'user_123';
      const url =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview';
      const existingTrackers = Array.from({ length: 4 }, (_, i) => ({
        ...mockTracker,
        id: `tracker_${i}`,
      }));

      vi.mocked(mockTrackerService.getTrackersByUserId).mockResolvedValue({
        data: existingTrackers,
        pagination: { page: 1, limit: 10, total: 4, pages: 1 },
      });

      await expect(service.addTracker(userId, url)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.addTracker(userId, url)).rejects.toThrow(
        'You have reached the maximum of 4 trackers',
      );
    });

    it('should_throw_BadRequestException_when_user_has_more_than_4_trackers', async () => {
      const userId = 'user_123';
      const url =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview';
      const existingTrackers = Array.from({ length: 5 }, (_, i) => ({
        ...mockTracker,
        id: `tracker_${i}`,
      }));

      vi.mocked(mockTrackerService.getTrackersByUserId).mockResolvedValue({
        data: existingTrackers,
        pagination: { page: 1, limit: 10, total: 5, pages: 1 },
      });

      await expect(service.addTracker(userId, url)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should_filter_deleted_trackers_when_counting', async () => {
      const userId = 'user_123';
      const url =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview';
      const parsedResult = {
        game: Game.ROCKET_LEAGUE,
        platform: GamePlatform.STEAM,
        username: 'testuser',
      };
      const deletedTracker = { ...mockTracker, isDeleted: true };
      const activeTracker = { ...mockTracker, isDeleted: false };

      vi.mocked(mockTrackerService.getTrackersByUserId).mockResolvedValue({
        data: [deletedTracker, activeTracker],
        pagination: { page: 1, limit: 10, total: 2, pages: 1 },
      });
      vi.mocked(mockValidationService.validateTrackerUrl).mockResolvedValue(
        parsedResult as never,
      );
      vi.mocked(mockTrackerService.createTracker).mockResolvedValue(
        mockTracker as never,
      );

      const result = await service.addTracker(userId, url);

      expect(result).toEqual(mockTracker);
    });
  });

  describe('refreshTrackerData', () => {
    it('should_refresh_tracker_when_tracker_exists_and_can_process', async () => {
      const trackerId = 'tracker_123';

      vi.mocked(mockTrackerRepository.findById).mockResolvedValue(mockTracker);
      vi.mocked(mockProcessingGuard.canProcessTracker).mockResolvedValue(true);
      vi.mocked(mockTrackerRepository.update).mockResolvedValue(mockTracker);

      await service.refreshTrackerData(trackerId);

      expect(mockTrackerRepository.update).toHaveBeenCalledWith(trackerId, {
        scrapingStatus: TrackerScrapingStatus.PENDING,
        scrapingError: null,
      });
      expect(mockScrapingQueueService.addScrapingJob).toHaveBeenCalledWith(
        trackerId,
      );
    });

    it('should_throw_NotFoundException_when_tracker_does_not_exist', async () => {
      const trackerId = 'nonexistent_tracker';

      vi.mocked(mockTrackerRepository.findById).mockResolvedValue(null);

      await expect(service.refreshTrackerData(trackerId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.refreshTrackerData(trackerId)).rejects.toThrow(
        'Tracker not found',
      );
    });

    it('should_throw_ForbiddenException_when_processing_disabled', async () => {
      const trackerId = 'tracker_123';

      vi.mocked(mockTrackerRepository.findById).mockResolvedValue(mockTracker);
      vi.mocked(mockProcessingGuard.canProcessTracker).mockResolvedValue(false);

      await expect(service.refreshTrackerData(trackerId)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.refreshTrackerData(trackerId)).rejects.toThrow(
        'Tracker processing is disabled by guild settings',
      );
    });
  });

  describe('processPendingTrackers', () => {
    it('should_return_processed_count_and_tracker_ids_when_delegating_to_batch_processor', async () => {
      const expectedResult = {
        processed: 5,
        trackers: [
          'tracker_1',
          'tracker_2',
          'tracker_3',
          'tracker_4',
          'tracker_5',
        ],
      };

      vi.mocked(mockBatchProcessor.processPendingTrackers).mockResolvedValue(
        expectedResult,
      );

      const result = await service.processPendingTrackers();

      expect(result).toEqual(expectedResult);
      expect(mockBatchProcessor.processPendingTrackers).toHaveBeenCalled();
    });
  });

  describe('processPendingTrackersForGuild', () => {
    it('should_return_processed_count_and_tracker_ids_when_delegating_to_batch_processor', async () => {
      const guildId = 'guild_123';
      const expectedResult = {
        processed: 3,
        trackers: ['tracker_1', 'tracker_2', 'tracker_3'],
      };

      vi.mocked(
        mockBatchProcessor.processPendingTrackersForGuild,
      ).mockResolvedValue(expectedResult);

      const result = await service.processPendingTrackersForGuild(guildId);

      expect(result).toEqual(expectedResult);
      expect(
        mockBatchProcessor.processPendingTrackersForGuild,
      ).toHaveBeenCalledWith(guildId);
    });
  });
});
