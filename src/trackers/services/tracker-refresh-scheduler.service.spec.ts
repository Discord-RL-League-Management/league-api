/**
 * TrackerRefreshSchedulerService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { TrackerRefreshSchedulerService } from './tracker-refresh-scheduler.service';
import { TrackerRepository } from '../repositories/tracker.repository';
import { TrackerScrapingQueueService } from '../queues/tracker-scraping.queue';
import { TrackerBatchRefreshService } from './tracker-batch-refresh.service';
import { TrackerProcessingGuardService } from './tracker-processing-guard.service';

describe('TrackerRefreshSchedulerService', () => {
  let service: TrackerRefreshSchedulerService;
  let mockTrackerRepository: TrackerRepository;
  let mockScrapingQueueService: TrackerScrapingQueueService;
  let mockBatchRefreshService: TrackerBatchRefreshService;
  let mockConfigService: ConfigService;
  let mockSchedulerRegistry: SchedulerRegistry;
  let mockProcessingGuard: TrackerProcessingGuardService;

  const mockTrackerConfig = {
    refreshIntervalHours: 24,
    batchSize: 10,
    refreshCron: '0 2 * * *',
  };

  beforeEach(() => {
    mockTrackerRepository = {
      findPendingAndStale: vi.fn(),
    } as unknown as TrackerRepository;

    mockScrapingQueueService = {} as unknown as TrackerScrapingQueueService;

    mockBatchRefreshService = {
      refreshTrackers: vi.fn(),
      refreshTrackersInBatches: vi.fn(),
    } as unknown as TrackerBatchRefreshService;

    mockConfigService = {
      get: vi.fn().mockReturnValue(mockTrackerConfig),
    } as unknown as ConfigService;

    mockSchedulerRegistry = {
      addCronJob: vi.fn(),
      doesExist: vi.fn().mockReturnValue(true),
      deleteCronJob: vi.fn(),
    } as unknown as SchedulerRegistry;

    mockProcessingGuard = {
      filterProcessableTrackers: vi.fn().mockResolvedValue([]),
    } as unknown as TrackerProcessingGuardService;

    service = new TrackerRefreshSchedulerService(
      mockTrackerRepository,
      mockScrapingQueueService,
      mockBatchRefreshService,
      mockConfigService,
      mockSchedulerRegistry,
      mockProcessingGuard,
    );
  });

  describe('triggerManualRefresh', () => {
    it('should_refresh_specific_trackers_when_ids_provided', async () => {
      const trackerIds = ['tracker-1', 'tracker-2'];
      vi.spyOn(mockBatchRefreshService, 'refreshTrackers').mockResolvedValue(
        undefined,
      );

      await service.triggerManualRefresh(trackerIds);

      expect(mockBatchRefreshService.refreshTrackers).toHaveBeenCalledWith(
        trackerIds,
      );
    });

    it('should_refresh_all_pending_trackers_when_no_ids_provided', async () => {
      const mockTrackers = [{ id: 'tracker-1' }, { id: 'tracker-2' }];
      vi.spyOn(mockTrackerRepository, 'findPendingAndStale').mockResolvedValue(
        mockTrackers as never,
      );
      vi.spyOn(
        mockProcessingGuard,
        'filterProcessableTrackers',
      ).mockResolvedValue(['tracker-1', 'tracker-2']);
      vi.spyOn(
        mockBatchRefreshService,
        'refreshTrackersInBatches',
      ).mockResolvedValue(undefined);

      await service.triggerManualRefresh();

      expect(mockTrackerRepository.findPendingAndStale).toHaveBeenCalledWith(
        24,
      );
      expect(
        mockBatchRefreshService.refreshTrackersInBatches,
      ).toHaveBeenCalled();
    });

    it('should_return_early_when_no_trackers_need_refresh', async () => {
      vi.spyOn(mockTrackerRepository, 'findPendingAndStale').mockResolvedValue(
        [],
      );
      vi.spyOn(
        mockProcessingGuard,
        'filterProcessableTrackers',
      ).mockResolvedValue([]);

      await service.triggerManualRefresh();

      expect(
        mockBatchRefreshService.refreshTrackersInBatches,
      ).not.toHaveBeenCalled();
    });
  });

  describe('onApplicationShutdown', () => {
    it('should_stop_cron_job_on_shutdown', async () => {
      const mockCronJob = {
        stop: vi.fn().mockResolvedValue(undefined),
      };
      (service as any).cronJob = mockCronJob;

      await service.onApplicationShutdown('SIGTERM');

      expect(mockCronJob.stop).toHaveBeenCalled();
      expect(mockSchedulerRegistry.deleteCronJob).toHaveBeenCalledWith(
        'tracker-refresh',
      );
    });
  });
});
