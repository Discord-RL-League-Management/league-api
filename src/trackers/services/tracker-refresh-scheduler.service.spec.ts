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
import { CronJob } from 'cron';
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

  describe('onModuleInit', () => {
    it('should_initialize_cron_job_with_default_expression_when_not_provided', () => {
      const configWithoutCron = {
        ...mockTrackerConfig,
        refreshCron: undefined,
      };
      vi.mocked(mockConfigService.get).mockReturnValue(configWithoutCron);

      const mockCronJob = {
        start: vi.fn(),
      };
      vi.spyOn(CronJob.prototype, 'constructor' as any).mockImplementation(
        () => mockCronJob,
      );

      const newService = new TrackerRefreshSchedulerService(
        mockTrackerRepository,
        mockScrapingQueueService,
        mockBatchRefreshService,
        mockConfigService,
        mockSchedulerRegistry,
        mockProcessingGuard,
      );

      newService.onModuleInit();

      expect(mockSchedulerRegistry.addCronJob).toHaveBeenCalled();
    });

    it('should_initialize_cron_job_with_custom_expression', () => {
      const mockCronJob = {
        start: vi.fn(),
      };
      vi.spyOn(CronJob.prototype, 'constructor' as any).mockImplementation(
        () => mockCronJob,
      );

      service.onModuleInit();

      expect(mockSchedulerRegistry.addCronJob).toHaveBeenCalled();
    });
  });

  describe('scheduledRefresh', () => {
    it('should_trigger_manual_refresh_when_called', async () => {
      vi.spyOn(service, 'triggerManualRefresh').mockResolvedValue(undefined);

      await service.scheduledRefresh();

      expect(service.triggerManualRefresh).toHaveBeenCalled();
    });
  });

  describe('triggerManualRefresh', () => {
    it('should_handle_error_during_refresh', async () => {
      const error = new Error('Refresh failed');
      vi.spyOn(mockBatchRefreshService, 'refreshTrackers').mockRejectedValue(
        error,
      );

      await expect(service.triggerManualRefresh(['tracker-1'])).rejects.toThrow(
        'Refresh failed',
      );
    });

    it('should_handle_error_when_refreshing_all_trackers', async () => {
      const mockTrackers = [{ id: 'tracker-1' }];
      vi.spyOn(mockTrackerRepository, 'findPendingAndStale').mockResolvedValue(
        mockTrackers as never,
      );
      vi.spyOn(
        mockProcessingGuard,
        'filterProcessableTrackers',
      ).mockResolvedValue(['tracker-1']);
      const error = new Error('Batch refresh failed');
      vi.spyOn(
        mockBatchRefreshService,
        'refreshTrackersInBatches',
      ).mockRejectedValue(error);

      await expect(service.triggerManualRefresh()).rejects.toThrow(
        'Batch refresh failed',
      );
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

    it('should_handle_error_when_stopping_cron_job', async () => {
      const mockCronJob = {
        stop: vi.fn().mockRejectedValue(new Error('Stop failed')),
      };
      (service as any).cronJob = mockCronJob;

      await service.onApplicationShutdown('SIGTERM');

      expect(mockCronJob.stop).toHaveBeenCalled();
      expect(mockSchedulerRegistry.deleteCronJob).toHaveBeenCalledWith(
        'tracker-refresh',
      );
    });

    it('should_handle_shutdown_when_cron_job_not_registered', async () => {
      vi.mocked(mockSchedulerRegistry.doesExist).mockReturnValue(false);
      (service as any).cronJob = null;

      await service.onApplicationShutdown('SIGTERM');

      expect(mockSchedulerRegistry.deleteCronJob).not.toHaveBeenCalled();
    });

    it('should_handle_shutdown_when_no_cron_job_exists', async () => {
      (service as any).cronJob = null;
      vi.mocked(mockSchedulerRegistry.doesExist).mockReturnValue(false);

      await service.onApplicationShutdown();

      expect(mockSchedulerRegistry.deleteCronJob).not.toHaveBeenCalled();
    });

    it('should_handle_shutdown_without_signal', async () => {
      const mockCronJob = {
        stop: vi.fn().mockResolvedValue(undefined),
      };
      (service as any).cronJob = mockCronJob;

      await service.onApplicationShutdown();

      expect(mockCronJob.stop).toHaveBeenCalled();
    });
  });
});
