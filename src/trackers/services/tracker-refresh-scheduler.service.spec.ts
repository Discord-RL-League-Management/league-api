/**
 * TrackerRefreshSchedulerService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { TrackerRefreshSchedulerService } from './tracker-refresh-scheduler.service';
import { TrackerScrapingQueueService } from '../queues/tracker-scraping.queue';
import { TrackerBatchRefreshService } from './tracker-batch-refresh.service';
import { TrackerProcessingGuardService } from './tracker-processing-guard.service';
import { TrackerRepository } from '../repositories/tracker.repository';

describe('TrackerRefreshSchedulerService', () => {
  let service: TrackerRefreshSchedulerService;
  let mockTrackerRepository: TrackerRepository;
  let mockScrapingQueueService: TrackerScrapingQueueService;
  let mockBatchRefreshService: TrackerBatchRefreshService;
  let mockConfigService: ConfigService;
  let mockSchedulerRegistry: SchedulerRegistry;
  let mockProcessingGuard: TrackerProcessingGuardService;

  const trackerConfig = {
    refreshIntervalHours: 24,
    batchSize: 100,
    refreshCron: '0 2 * * *',
  };

  beforeEach(async () => {
    mockTrackerRepository = {
      findPendingAndStale: vi.fn(),
    } as unknown as TrackerRepository;

    mockScrapingQueueService = {} as unknown as TrackerScrapingQueueService;

    mockBatchRefreshService = {
      refreshTrackers: vi.fn(),
      refreshTrackersInBatches: vi.fn(),
    } as unknown as TrackerBatchRefreshService;

    mockConfigService = {
      get: vi.fn().mockReturnValue(trackerConfig),
    } as unknown as ConfigService;

    mockSchedulerRegistry = {
      addCronJob: vi.fn(),
      deleteCronJob: vi.fn(),
      doesExist: vi.fn().mockReturnValue(false),
    } as unknown as SchedulerRegistry;

    mockProcessingGuard = {
      filterProcessableTrackers: vi.fn(),
    } as unknown as TrackerProcessingGuardService;

    const moduleRef = await Test.createTestingModule({
      providers: [
        TrackerRefreshSchedulerService,
        { provide: TrackerRepository, useValue: mockTrackerRepository },
        {
          provide: TrackerScrapingQueueService,
          useValue: mockScrapingQueueService,
        },
        {
          provide: TrackerBatchRefreshService,
          useValue: mockBatchRefreshService,
        },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SchedulerRegistry, useValue: mockSchedulerRegistry },
        {
          provide: TrackerProcessingGuardService,
          useValue: mockProcessingGuard,
        },
      ],
    }).compile();

    service = moduleRef.get<TrackerRefreshSchedulerService>(
      TrackerRefreshSchedulerService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('onModuleInit', () => {
    it('should_register_cron_job_when_module_initializes', () => {
      service.onModuleInit();

      expect(mockSchedulerRegistry.addCronJob).toHaveBeenCalledWith(
        'tracker-refresh',
        expect.any(Object),
      );
    });
  });

  describe('constructor', () => {
    it('should_throw_error_when_tracker_config_is_missing', async () => {
      const mockConfigWithoutTracker = {
        get: vi.fn().mockReturnValue(null),
      } as unknown as ConfigService;

      await expect(
        Test.createTestingModule({
          providers: [
            TrackerRefreshSchedulerService,
            { provide: TrackerRepository, useValue: mockTrackerRepository },
            {
              provide: TrackerScrapingQueueService,
              useValue: mockScrapingQueueService,
            },
            {
              provide: TrackerBatchRefreshService,
              useValue: mockBatchRefreshService,
            },
            { provide: ConfigService, useValue: mockConfigWithoutTracker },
            { provide: SchedulerRegistry, useValue: mockSchedulerRegistry },
            {
              provide: TrackerProcessingGuardService,
              useValue: mockProcessingGuard,
            },
          ],
        }).compile(),
      ).rejects.toThrow('Tracker configuration is missing');
    });
  });

  describe('triggerManualRefresh', () => {
    it('should_refresh_specific_trackers_when_ids_provided', async () => {
      const trackerIds = ['tracker-1', 'tracker-2'];
      vi.mocked(mockBatchRefreshService.refreshTrackers).mockResolvedValue(
        undefined,
      );

      await service.triggerManualRefresh(trackerIds);

      expect(mockBatchRefreshService.refreshTrackers).toHaveBeenCalledWith(
        trackerIds,
      );
    });

    it('should_refresh_stale_trackers_when_empty_tracker_ids_array_provided', async () => {
      const trackerIds: string[] = [];
      const staleTrackers = [{ id: 'tracker-1' }];
      vi.mocked(mockTrackerRepository.findPendingAndStale).mockResolvedValue(
        staleTrackers,
      );
      vi.mocked(
        mockProcessingGuard.filterProcessableTrackers,
      ).mockResolvedValue(['tracker-1']);
      vi.mocked(
        mockBatchRefreshService.refreshTrackersInBatches,
      ).mockResolvedValue(undefined);

      await service.triggerManualRefresh(trackerIds);

      expect(mockBatchRefreshService.refreshTrackers).not.toHaveBeenCalled();
      expect(
        mockBatchRefreshService.refreshTrackersInBatches,
      ).toHaveBeenCalledWith(['tracker-1'], trackerConfig.batchSize);
    });

    it('should_refresh_stale_trackers_when_no_ids_provided', async () => {
      const staleTrackers = [{ id: 'tracker-1' }, { id: 'tracker-2' }];
      vi.mocked(mockTrackerRepository.findPendingAndStale).mockResolvedValue(
        staleTrackers,
      );
      vi.mocked(
        mockProcessingGuard.filterProcessableTrackers,
      ).mockResolvedValue(['tracker-1', 'tracker-2']);
      vi.mocked(
        mockBatchRefreshService.refreshTrackersInBatches,
      ).mockResolvedValue(undefined);

      await service.triggerManualRefresh();

      expect(mockTrackerRepository.findPendingAndStale).toHaveBeenCalledWith(
        trackerConfig.refreshIntervalHours,
      );
      expect(
        mockBatchRefreshService.refreshTrackersInBatches,
      ).toHaveBeenCalledWith(
        ['tracker-1', 'tracker-2'],
        trackerConfig.batchSize,
      );
    });

    it('should_not_refresh_when_no_stale_trackers_found', async () => {
      vi.mocked(mockTrackerRepository.findPendingAndStale).mockResolvedValue(
        [],
      );
      vi.mocked(
        mockProcessingGuard.filterProcessableTrackers,
      ).mockResolvedValue([]);

      await service.triggerManualRefresh();

      expect(
        mockBatchRefreshService.refreshTrackersInBatches,
      ).not.toHaveBeenCalled();
    });

    it('should_throw_error_when_refresh_fails', async () => {
      const trackerIds = ['tracker-1'];
      vi.mocked(mockBatchRefreshService.refreshTrackers).mockRejectedValue(
        new Error('Refresh failed'),
      );

      await expect(service.triggerManualRefresh(trackerIds)).rejects.toThrow(
        'Refresh failed',
      );
    });

    it('should_throw_error_when_finding_stale_trackers_fails', async () => {
      vi.mocked(mockTrackerRepository.findPendingAndStale).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.triggerManualRefresh()).rejects.toThrow(
        'Database error',
      );
    });

    it('should_throw_error_when_processing_guard_fails', async () => {
      const staleTrackers = [{ id: 'tracker-1' }, { id: 'tracker-2' }];
      vi.mocked(mockTrackerRepository.findPendingAndStale).mockResolvedValue(
        staleTrackers,
      );
      vi.mocked(
        mockProcessingGuard.filterProcessableTrackers,
      ).mockRejectedValue(new Error('Guard check failed'));

      await expect(service.triggerManualRefresh()).rejects.toThrow(
        'Guard check failed',
      );
    });

    it('should_not_refresh_when_processing_guard_returns_empty_array', async () => {
      const staleTrackers = [{ id: 'tracker-1' }, { id: 'tracker-2' }];
      vi.mocked(mockTrackerRepository.findPendingAndStale).mockResolvedValue(
        staleTrackers,
      );
      vi.mocked(
        mockProcessingGuard.filterProcessableTrackers,
      ).mockResolvedValue([]);

      await service.triggerManualRefresh();

      expect(
        mockBatchRefreshService.refreshTrackersInBatches,
      ).not.toHaveBeenCalled();
    });
  });

  describe('scheduledRefresh', () => {
    it('should_trigger_manual_refresh_when_called', async () => {
      vi.mocked(mockTrackerRepository.findPendingAndStale).mockResolvedValue(
        [],
      );
      vi.mocked(
        mockProcessingGuard.filterProcessableTrackers,
      ).mockResolvedValue([]);

      await service.scheduledRefresh();

      expect(mockTrackerRepository.findPendingAndStale).toHaveBeenCalled();
    });
  });

  describe('onApplicationShutdown', () => {
    it('should_delete_cron_job_when_it_exists', async () => {
      vi.mocked(mockSchedulerRegistry.doesExist).mockReturnValue(true);

      await service.onApplicationShutdown('SIGTERM');

      expect(mockSchedulerRegistry.deleteCronJob).toHaveBeenCalledWith(
        'tracker-refresh',
      );
    });

    it('should_not_delete_cron_job_when_not_registered', async () => {
      vi.mocked(mockSchedulerRegistry.doesExist).mockReturnValue(false);

      await service.onApplicationShutdown('SIGTERM');

      expect(mockSchedulerRegistry.deleteCronJob).not.toHaveBeenCalled();
    });

    it('should_handle_error_when_stopping_cron_job_fails', async () => {
      const mockCronJob = {
        stop: vi.fn().mockRejectedValue(new Error('Stop failed')),
      };
      service['cronJob'] = mockCronJob as never;
      vi.mocked(mockSchedulerRegistry.doesExist).mockReturnValue(true);

      await service.onApplicationShutdown('SIGTERM');

      expect(mockCronJob.stop).toHaveBeenCalled();
      expect(mockSchedulerRegistry.deleteCronJob).toHaveBeenCalledWith(
        'tracker-refresh',
      );
    });

    it('should_handle_shutdown_without_signal', async () => {
      vi.mocked(mockSchedulerRegistry.doesExist).mockReturnValue(false);

      await service.onApplicationShutdown();

      expect(mockSchedulerRegistry.deleteCronJob).not.toHaveBeenCalled();
    });
  });
});
