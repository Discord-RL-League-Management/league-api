/**
 * TrackerScrapingProcessor Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { Job } from 'bullmq';
import { TrackerScrapingProcessor } from './tracker-scraping.processor';
import { TrackerRepository } from '../repositories/tracker.repository';
import { TrackerScrapingLogRepository } from '../repositories/tracker-scraping-log.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { TrackerScraperService } from '../services/tracker-scraper.service';
import { TrackerSeasonService } from '../services/tracker-season.service';
import { TrackerService } from '../tracker.service';
import { TrackerNotificationService } from '../services/tracker-notification.service';
import { ActivityLogService } from '../../infrastructure/activity-log/services/activity-log.service';
import { MmrCalculationIntegrationService } from '../../mmr-calculation/services/mmr-calculation-integration.service';
import { GuildMembersService } from '../../guild-members/guild-members.service';
import { PlayerService } from '../../players/player.service';
import { TrackerScrapingStatus, Game, GamePlatform } from '@prisma/client';
import type {
  ScrapingJobData,
  ScrapingJobResult,
} from './tracker-scraping.interfaces';
import type { SeasonData } from '../interfaces/scraper.interfaces';

describe('TrackerScrapingProcessor', () => {
  let processor: TrackerScrapingProcessor;
  let mockTrackerRepository: TrackerRepository;
  let mockScrapingLogRepository: TrackerScrapingLogRepository;
  let mockPrisma: PrismaService;
  let mockScraperService: TrackerScraperService;
  let mockSeasonService: TrackerSeasonService;
  let mockTrackerService: TrackerService;
  let mockNotificationService: TrackerNotificationService;
  let mockActivityLogService: ActivityLogService;
  let mockMmrCalculationIntegration: MmrCalculationIntegrationService;
  let mockGuildMembersService: GuildMembersService;
  let mockPlayerService: PlayerService;

  const mockTracker = {
    id: 'tracker_123',
    url: 'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview',
    game: Game.ROCKET_LEAGUE,
    platform: GamePlatform.STEAM,
    username: 'testuser',
    userId: 'user_123',
    guildId: null,
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

  const mockScrapingLog = {
    id: 'log_123',
    trackerId: 'tracker_123',
    status: TrackerScrapingStatus.IN_PROGRESS,
    seasonsScraped: 0,
    seasonsFailed: 0,
    startedAt: new Date(),
    completedAt: null,
    errorMessage: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSeasons: SeasonData[] = [
    {
      seasonNumber: 15,
      seasonName: 'Season 15',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-03-31'),
    },
    {
      seasonNumber: 14,
      seasonName: 'Season 14',
      startDate: new Date('2023-10-01'),
      endDate: new Date('2023-12-31'),
    },
  ];

  const createMockJob = (data: ScrapingJobData): Job<ScrapingJobData> => {
    return {
      data,
      id: 'job_123',
      name: 'scraping',
      timestamp: Date.now(),
      attemptsMade: 0,
      processedOn: undefined,
      finishedOn: undefined,
    } as Job<ScrapingJobData>;
  };

  beforeEach(async () => {
    mockTrackerRepository = {
      findById: vi.fn(),
      update: vi.fn().mockResolvedValue(mockTracker),
    } as unknown as TrackerRepository;

    mockScrapingLogRepository = {
      create: vi.fn().mockResolvedValue(mockScrapingLog),
      update: vi.fn().mockResolvedValue(mockScrapingLog),
    } as unknown as TrackerScrapingLogRepository;

    mockPrisma = {
      $transaction: vi.fn().mockImplementation(async (callback) => {
        const mockTx = {};
        return callback(mockTx);
      }),
    } as unknown as PrismaService;

    mockScraperService = {
      scrapeSeasons: vi.fn(),
      scrapeAllSeasons: vi.fn(),
    } as unknown as TrackerScraperService;

    mockSeasonService = {
      bulkUpsertSeasons: vi.fn().mockResolvedValue(undefined),
      createOrUpdateSeason: vi.fn().mockResolvedValue(undefined),
      getSeasonsByTracker: vi.fn().mockResolvedValue([]),
    } as unknown as TrackerSeasonService;

    mockTrackerService = {} as unknown as TrackerService;

    mockNotificationService = {
      sendScrapingCompleteNotification: vi.fn().mockResolvedValue(undefined),
      sendScrapingFailedNotification: vi.fn().mockResolvedValue(undefined),
    } as unknown as TrackerNotificationService;

    mockActivityLogService = {
      logActivity: vi.fn().mockResolvedValue({}),
    } as unknown as ActivityLogService;

    mockMmrCalculationIntegration = {
      calculateMmrForUser: vi.fn().mockResolvedValue(undefined),
    } as unknown as MmrCalculationIntegrationService;

    mockGuildMembersService = {
      findMembersByUser: vi.fn().mockResolvedValue([]),
    } as unknown as GuildMembersService;

    mockPlayerService = {
      ensurePlayerExists: vi.fn().mockResolvedValue({ id: 'player_123' }),
    } as unknown as PlayerService;

    const module = await Test.createTestingModule({
      providers: [
        TrackerScrapingProcessor,
        { provide: TrackerRepository, useValue: mockTrackerRepository },
        {
          provide: TrackerScrapingLogRepository,
          useValue: mockScrapingLogRepository,
        },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TrackerScraperService, useValue: mockScraperService },
        { provide: TrackerSeasonService, useValue: mockSeasonService },
        { provide: TrackerService, useValue: mockTrackerService },
        {
          provide: TrackerNotificationService,
          useValue: mockNotificationService,
        },
        { provide: ActivityLogService, useValue: mockActivityLogService },
        {
          provide: MmrCalculationIntegrationService,
          useValue: mockMmrCalculationIntegration,
        },
        { provide: GuildMembersService, useValue: mockGuildMembersService },
        { provide: PlayerService, useValue: mockPlayerService },
      ],
    }).compile();

    processor = module.get<TrackerScrapingProcessor>(TrackerScrapingProcessor);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('process', () => {
    it('should_return_success_result_when_no_seasons_found', async () => {
      const job = createMockJob({ trackerId: 'tracker_123' });
      vi.spyOn(mockTrackerRepository, 'findById').mockResolvedValue(
        mockTracker,
      );
      vi.spyOn(mockScraperService, 'scrapeSeasons').mockResolvedValue([]);
      vi.spyOn(mockGuildMembersService, 'findMembersByUser').mockResolvedValue(
        [],
      );

      const result = await processor.process(job);

      expect(result.success).toBe(true);
      expect(result.seasonsScraped).toBe(0);
      expect(result.seasonsFailed).toBe(0);
      expect(mockScraperService.scrapeSeasons).toHaveBeenCalledWith(
        mockTracker.url,
        3, // First-time scraping, so maxSeasons = 3
      );
      expect(mockTrackerRepository.update).toHaveBeenCalledWith(
        'tracker_123',
        expect.objectContaining({
          scrapingStatus: TrackerScrapingStatus.COMPLETED,
        }),
      );
    });

    it('should_process_seasons_successfully_when_bulk_upsert_succeeds', async () => {
      const job = createMockJob({ trackerId: 'tracker_123' });
      vi.spyOn(mockTrackerRepository, 'findById').mockResolvedValue(
        mockTracker,
      );
      vi.spyOn(mockScraperService, 'scrapeSeasons').mockResolvedValue(
        mockSeasons,
      );
      vi.spyOn(mockGuildMembersService, 'findMembersByUser').mockResolvedValue(
        [],
      );

      const result = await processor.process(job);

      expect(result.success).toBe(true);
      expect(result.seasonsScraped).toBe(2);
      expect(result.seasonsFailed).toBe(0);
      expect(mockScraperService.scrapeSeasons).toHaveBeenCalledWith(
        mockTracker.url,
        3, // First-time scraping, so maxSeasons = 3
      );
      expect(mockSeasonService.bulkUpsertSeasons).toHaveBeenCalledWith(
        'tracker_123',
        mockSeasons,
      );
      expect(mockTrackerRepository.update).toHaveBeenCalledWith(
        'tracker_123',
        expect.objectContaining({
          scrapingStatus: TrackerScrapingStatus.COMPLETED,
        }),
      );
    });

    it('should_fallback_to_individual_upserts_when_bulk_upsert_fails', async () => {
      const job = createMockJob({ trackerId: 'tracker_123' });
      vi.spyOn(mockTrackerRepository, 'findById').mockResolvedValue(
        mockTracker,
      );
      vi.spyOn(mockScraperService, 'scrapeSeasons').mockResolvedValue(
        mockSeasons,
      );
      vi.spyOn(mockSeasonService, 'bulkUpsertSeasons').mockRejectedValue(
        new Error('Bulk upsert failed'),
      );
      vi.spyOn(mockGuildMembersService, 'findMembersByUser').mockResolvedValue(
        [],
      );

      const result = await processor.process(job);

      expect(result.success).toBe(true);
      expect(result.seasonsScraped).toBe(2);
      expect(result.seasonsFailed).toBe(0);
      expect(mockScraperService.scrapeSeasons).toHaveBeenCalledWith(
        mockTracker.url,
        3, // First-time scraping, so maxSeasons = 3
      );
      expect(mockSeasonService.createOrUpdateSeason).toHaveBeenCalledTimes(2);
    });

    it('should_handle_individual_season_failures_gracefully', async () => {
      const job = createMockJob({ trackerId: 'tracker_123' });
      vi.spyOn(mockTrackerRepository, 'findById').mockResolvedValue(
        mockTracker,
      );
      vi.spyOn(mockScraperService, 'scrapeSeasons').mockResolvedValue(
        mockSeasons,
      );
      vi.spyOn(mockSeasonService, 'bulkUpsertSeasons').mockRejectedValue(
        new Error('Bulk upsert failed'),
      );
      vi.spyOn(mockSeasonService, 'createOrUpdateSeason')
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Season upsert failed'));
      vi.spyOn(mockGuildMembersService, 'findMembersByUser').mockResolvedValue(
        [],
      );

      const result = await processor.process(job);

      expect(result.success).toBe(true);
      expect(result.seasonsScraped).toBe(1);
      expect(result.seasonsFailed).toBe(1);
      expect(mockScraperService.scrapeSeasons).toHaveBeenCalledWith(
        mockTracker.url,
        3, // First-time scraping, so maxSeasons = 3
      );
    });

    it('should_create_scraping_log_when_processing_starts', async () => {
      const job = createMockJob({ trackerId: 'tracker_123' });
      vi.spyOn(mockTrackerRepository, 'findById').mockResolvedValue(
        mockTracker,
      );
      vi.spyOn(mockScraperService, 'scrapeSeasons').mockResolvedValue([]);
      vi.spyOn(mockGuildMembersService, 'findMembersByUser').mockResolvedValue(
        [],
      );

      await processor.process(job);

      expect(mockScrapingLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          trackerId: 'tracker_123',
          status: TrackerScrapingStatus.IN_PROGRESS,
          seasonsScraped: 0,
          seasonsFailed: 0,
        }),
      );
    });

    it('should_update_tracker_status_to_in_progress', async () => {
      const job = createMockJob({ trackerId: 'tracker_123' });
      vi.spyOn(mockTrackerRepository, 'findById').mockResolvedValue(
        mockTracker,
      );
      vi.spyOn(mockScraperService, 'scrapeSeasons').mockResolvedValue([]);
      vi.spyOn(mockGuildMembersService, 'findMembersByUser').mockResolvedValue(
        [],
      );

      await processor.process(job);

      expect(mockTrackerRepository.update).toHaveBeenCalledWith(
        'tracker_123',
        expect.objectContaining({
          scrapingStatus: TrackerScrapingStatus.IN_PROGRESS,
          scrapingError: null,
        }),
      );
    });

    it('should_send_notification_when_scraping_completes', async () => {
      const job = createMockJob({ trackerId: 'tracker_123' });
      vi.spyOn(mockTrackerRepository, 'findById').mockResolvedValue(
        mockTracker,
      );
      vi.spyOn(mockScraperService, 'scrapeSeasons').mockResolvedValue(
        mockSeasons,
      );
      vi.spyOn(mockGuildMembersService, 'findMembersByUser').mockResolvedValue(
        [],
      );

      await processor.process(job);

      // Wait for async notification
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(
        mockNotificationService.sendScrapingCompleteNotification,
      ).toHaveBeenCalledWith('tracker_123', 'user_123', 2, 0);
    });

    it('should_calculate_mmr_when_scraping_completes', async () => {
      const job = createMockJob({ trackerId: 'tracker_123' });
      vi.spyOn(mockTrackerRepository, 'findById').mockResolvedValue(
        mockTracker,
      );
      vi.spyOn(mockScraperService, 'scrapeSeasons').mockResolvedValue(
        mockSeasons,
      );
      vi.spyOn(mockGuildMembersService, 'findMembersByUser').mockResolvedValue(
        [],
      );

      await processor.process(job);

      // Wait for async MMR calculation
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(
        mockMmrCalculationIntegration.calculateMmrForUser,
      ).toHaveBeenCalledWith('user_123', 'tracker_123');
    });

    it('should_return_error_result_when_tracker_not_found', async () => {
      const job = createMockJob({ trackerId: 'tracker_123' });
      vi.spyOn(mockTrackerRepository, 'findById').mockResolvedValue(null);

      const result = await processor.process(job);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
      expect(mockTrackerRepository.update).toHaveBeenCalledWith(
        'tracker_123',
        expect.objectContaining({
          scrapingStatus: TrackerScrapingStatus.FAILED,
        }),
      );
    });

    it('should_handle_scraper_service_errors', async () => {
      const job = createMockJob({ trackerId: 'tracker_123' });
      vi.spyOn(mockTrackerRepository, 'findById').mockResolvedValue(
        mockTracker,
      );
      vi.spyOn(mockScraperService, 'scrapeSeasons').mockRejectedValue(
        new Error('Scraper error'),
      );

      const result = await processor.process(job);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Scraper error');
      expect(mockScraperService.scrapeSeasons).toHaveBeenCalledWith(
        mockTracker.url,
        3, // First-time scraping, so maxSeasons = 3
      );
      expect(mockTrackerRepository.update).toHaveBeenCalledWith(
        'tracker_123',
        expect.objectContaining({
          scrapingStatus: TrackerScrapingStatus.FAILED,
        }),
      );
    });

    it('should_send_failure_notification_when_scraping_fails', async () => {
      const job = createMockJob({ trackerId: 'tracker_123' });
      vi.spyOn(mockTrackerRepository, 'findById').mockResolvedValue(
        mockTracker,
      );
      vi.spyOn(mockScraperService, 'scrapeSeasons').mockRejectedValue(
        new Error('Scraper error'),
      );

      await processor.process(job);

      // Wait for async notification
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(
        mockNotificationService.sendScrapingFailedNotification,
      ).toHaveBeenCalledWith(
        'tracker_123',
        'user_123',
        expect.stringContaining('Scraper error'),
      );
    });

    it('should_increment_scraping_attempts_on_failure', async () => {
      const job = createMockJob({ trackerId: 'tracker_123' });
      const trackerWithAttempts = {
        ...mockTracker,
        scrapingAttempts: 2,
      };
      vi.spyOn(mockTrackerRepository, 'findById')
        .mockResolvedValueOnce(mockTracker)
        .mockResolvedValueOnce(trackerWithAttempts);
      vi.spyOn(mockScraperService, 'scrapeSeasons').mockRejectedValue(
        new Error('Scraper error'),
      );

      await processor.process(job);

      expect(mockTrackerRepository.update).toHaveBeenCalledWith(
        'tracker_123',
        expect.objectContaining({
          scrapingAttempts: 3,
        }),
      );
    });

    it('should_update_scraping_log_on_completion', async () => {
      const job = createMockJob({ trackerId: 'tracker_123' });
      vi.spyOn(mockTrackerRepository, 'findById').mockResolvedValue(
        mockTracker,
      );
      vi.spyOn(mockScraperService, 'scrapeSeasons').mockResolvedValue(
        mockSeasons,
      );
      vi.spyOn(mockGuildMembersService, 'findMembersByUser').mockResolvedValue(
        [],
      );

      await processor.process(job);

      expect(mockScrapingLogRepository.update).toHaveBeenCalledWith(
        'log_123',
        expect.objectContaining({
          status: TrackerScrapingStatus.COMPLETED,
          seasonsScraped: 2,
          seasonsFailed: 0,
        }),
      );
    });

    it('should_update_scraping_log_on_failure', async () => {
      const job = createMockJob({ trackerId: 'tracker_123' });
      vi.spyOn(mockTrackerRepository, 'findById').mockResolvedValue(
        mockTracker,
      );
      vi.spyOn(mockScraperService, 'scrapeSeasons').mockRejectedValue(
        new Error('Scraper error'),
      );

      await processor.process(job);

      expect(mockScrapingLogRepository.update).toHaveBeenCalledWith(
        'log_123',
        expect.objectContaining({
          status: TrackerScrapingStatus.FAILED,
          errorMessage: expect.stringContaining('Scraper error'),
        }),
      );
    });

    it('should_use_maxSeasons_0_for_subsequent_scraping', async () => {
      const job = createMockJob({ trackerId: 'tracker_123' });
      const trackerWithScrapeHistory = {
        ...mockTracker,
        lastScrapedAt: new Date(),
      };
      vi.spyOn(mockTrackerRepository, 'findById').mockResolvedValue(
        trackerWithScrapeHistory,
      );
      vi.spyOn(mockSeasonService, 'getSeasonsByTracker').mockResolvedValue(
        mockSeasons,
      );
      vi.spyOn(mockScraperService, 'scrapeSeasons').mockResolvedValue(
        mockSeasons,
      );
      vi.spyOn(mockGuildMembersService, 'findMembersByUser').mockResolvedValue(
        [],
      );

      await processor.process(job);

      expect(mockScraperService.scrapeSeasons).toHaveBeenCalledWith(
        trackerWithScrapeHistory.url,
        0, // Subsequent scraping, so maxSeasons = 0 (only current season)
      );
    });

    it('should_use_maxSeasons_3_when_lastScrapedAt_is_null_but_seasons_exist', async () => {
      const job = createMockJob({ trackerId: 'tracker_123' });
      vi.spyOn(mockTrackerRepository, 'findById').mockResolvedValue(
        mockTracker, // lastScrapedAt is null
      );
      vi.spyOn(mockSeasonService, 'getSeasonsByTracker').mockResolvedValue([]); // No seasons exist
      vi.spyOn(mockScraperService, 'scrapeSeasons').mockResolvedValue(
        mockSeasons,
      );
      vi.spyOn(mockGuildMembersService, 'findMembersByUser').mockResolvedValue(
        [],
      );

      await processor.process(job);

      expect(mockScraperService.scrapeSeasons).toHaveBeenCalledWith(
        mockTracker.url,
        3, // First-time scraping (lastScrapedAt is null), so maxSeasons = 3
      );
    });

    it('should_create_players_for_all_guilds_when_scraping_succeeds', async () => {
      const job = createMockJob({ trackerId: 'tracker_123' });
      const guildMembers = [{ guildId: 'guild_1' }, { guildId: 'guild_2' }];

      vi.spyOn(mockTrackerRepository, 'findById').mockResolvedValue(
        mockTracker,
      );
      vi.spyOn(mockScraperService, 'scrapeSeasons').mockResolvedValue(
        mockSeasons,
      );
      vi.spyOn(mockGuildMembersService, 'findMembersByUser').mockResolvedValue(
        guildMembers,
      );
      vi.spyOn(mockPlayerService, 'ensurePlayerExists').mockResolvedValue({
        id: 'player_1',
      });

      const result = await processor.process(job);

      expect(result.success).toBe(true);
      expect(mockPlayerService.ensurePlayerExists).toHaveBeenCalledTimes(2);
      expect(mockPlayerService.ensurePlayerExists).toHaveBeenCalledWith(
        'user_123',
        'guild_1',
      );
      expect(mockPlayerService.ensurePlayerExists).toHaveBeenCalledWith(
        'user_123',
        'guild_2',
      );
    });

    it('should_continue_when_player_creation_fails_for_some_guilds', async () => {
      const job = createMockJob({ trackerId: 'tracker_123' });
      const guildMembers = [{ guildId: 'guild_1' }, { guildId: 'guild_2' }];

      vi.spyOn(mockTrackerRepository, 'findById').mockResolvedValue(
        mockTracker,
      );
      vi.spyOn(mockScraperService, 'scrapeSeasons').mockResolvedValue(
        mockSeasons,
      );
      vi.spyOn(mockGuildMembersService, 'findMembersByUser').mockResolvedValue(
        guildMembers,
      );
      vi.spyOn(mockPlayerService, 'ensurePlayerExists')
        .mockResolvedValueOnce({ id: 'player_1' })
        .mockRejectedValueOnce(new Error('Player creation failed'));

      const result = await processor.process(job);

      expect(result.success).toBe(true);
      expect(mockPlayerService.ensurePlayerExists).toHaveBeenCalledTimes(2);
    });

    it('should_not_create_players_when_user_has_no_guild_memberships', async () => {
      const job = createMockJob({ trackerId: 'tracker_123' });

      vi.spyOn(mockTrackerRepository, 'findById').mockResolvedValue(
        mockTracker,
      );
      vi.spyOn(mockScraperService, 'scrapeSeasons').mockResolvedValue(
        mockSeasons,
      );
      vi.spyOn(mockGuildMembersService, 'findMembersByUser').mockResolvedValue(
        [],
      );

      const result = await processor.process(job);

      expect(result.success).toBe(true);
      expect(mockPlayerService.ensurePlayerExists).not.toHaveBeenCalled();
    });

    it('should_not_affect_scraping_result_when_player_creation_fails', async () => {
      const job = createMockJob({ trackerId: 'tracker_123' });

      vi.spyOn(mockTrackerRepository, 'findById').mockResolvedValue(
        mockTracker,
      );
      vi.spyOn(mockScraperService, 'scrapeSeasons').mockResolvedValue(
        mockSeasons,
      );
      vi.spyOn(mockGuildMembersService, 'findMembersByUser').mockRejectedValue(
        new Error('Service failed'),
      );

      const result = await processor.process(job);

      expect(result.success).toBe(true);
      expect(result.seasonsScraped).toBe(2);
    });
  });
});
