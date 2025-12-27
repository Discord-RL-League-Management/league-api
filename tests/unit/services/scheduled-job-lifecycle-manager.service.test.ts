/**
 * ScheduledJobLifecycleManager Unit Tests
 *
 * Tests for lifecycle management service.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScheduledJobLifecycleManager } from '@/trackers/services/scheduled-job-lifecycle-manager.service';
import { ScheduledTrackerProcessingService } from '@/trackers/services/scheduled-tracker-processing.service';
import { CronJobSchedulerService } from '@/trackers/services/cron-job-scheduler.service';

describe('ScheduledJobLifecycleManager', () => {
  let manager: ScheduledJobLifecycleManager;
  let mockScheduledProcessingService: ScheduledTrackerProcessingService;
  let mockSchedulerService: CronJobSchedulerService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockScheduledProcessingService = {
      loadPendingSchedules: vi.fn().mockResolvedValue(undefined),
    } as unknown as ScheduledTrackerProcessingService;

    mockSchedulerService = {
      stopAllJobs: vi.fn(),
    } as unknown as CronJobSchedulerService;

    manager = new ScheduledJobLifecycleManager(
      mockScheduledProcessingService,
      mockSchedulerService,
    );
  });

  describe('onModuleInit', () => {
    it('should_load_pending_schedules_on_init', async () => {
      // ACT
      await manager.onModuleInit();

      // ASSERT
      expect(
        mockScheduledProcessingService.loadPendingSchedules,
      ).toHaveBeenCalled();
    });
  });

  describe('onApplicationShutdown', () => {
    it('should_stop_all_jobs_on_shutdown', () => {
      // ACT
      manager.onApplicationShutdown();

      // ASSERT
      expect(mockSchedulerService.stopAllJobs).toHaveBeenCalled();
    });
  });
});
