/**
 * CronJobSchedulerService Unit Tests
 *
 * Tests for job scheduling and orchestration service.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CronJobSchedulerService } from '@/trackers/services/cron-job-scheduler.service';
import { SchedulerRegistry } from '@nestjs/schedule';

// Mock CronJob at module level - use factory pattern to avoid shared state
const createMockCronJob = () => ({
  start: vi.fn(),
  stop: vi.fn(),
});

vi.mock('cron', () => ({
  CronJob: vi.fn().mockImplementation(() => {
    // Create fresh instance for each CronJob instantiation
    return createMockCronJob();
  }),
}));

describe('CronJobSchedulerService', () => {
  let service: CronJobSchedulerService;
  let mockSchedulerRegistry: SchedulerRegistry;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSchedulerRegistry = {
      addCronJob: vi.fn(),
      deleteCronJob: vi.fn(),
      doesExist: vi.fn().mockReturnValue(false),
    } as unknown as SchedulerRegistry;

    service = new CronJobSchedulerService(mockSchedulerRegistry);
  });

  describe('scheduleJob', () => {
    it('should_schedule_job_when_valid_input_provided', () => {
      // ARRANGE
      const jobId = 'test-job-1';
      const scheduledAt = new Date(Date.now() + 86400000);
      const executeCallback = vi.fn().mockResolvedValue(undefined);

      // ACT
      service.scheduleJob(jobId, scheduledAt, executeCallback);

      // ASSERT
      expect(mockSchedulerRegistry.addCronJob).toHaveBeenCalledWith(
        jobId,
        expect.any(Object),
      );
      // Verify job was started by checking the mock call
      const jobCall = vi.mocked(mockSchedulerRegistry.addCronJob).mock.calls[0];
      const createdJob = jobCall[1] as unknown as {
        start: ReturnType<typeof vi.fn>;
      };
      expect(createdJob.start).toHaveBeenCalled();
    });

    it('should_register_job_with_scheduler_registry', () => {
      // ARRANGE
      const jobId = 'test-job-1';
      const scheduledAt = new Date(Date.now() + 86400000);
      const executeCallback = vi.fn().mockResolvedValue(undefined);

      // ACT
      service.scheduleJob(jobId, scheduledAt, executeCallback);

      // ASSERT
      expect(mockSchedulerRegistry.addCronJob).toHaveBeenCalledWith(
        jobId,
        expect.any(Object),
      );
    });
  });

  describe('cancelJob', () => {
    it('should_cancel_job_when_job_exists', () => {
      // ARRANGE
      const jobId = 'test-job-1';
      const scheduledAt = new Date(Date.now() + 86400000);
      const executeCallback = vi.fn().mockResolvedValue(undefined);
      vi.mocked(mockSchedulerRegistry.doesExist).mockReturnValue(true);

      service.scheduleJob(jobId, scheduledAt, executeCallback);
      const jobCall = vi.mocked(mockSchedulerRegistry.addCronJob).mock.calls[0];
      const createdJob = jobCall[1] as unknown as {
        stop: ReturnType<typeof vi.fn>;
      };

      // ACT
      service.cancelJob(jobId);

      // ASSERT
      expect(createdJob.stop).toHaveBeenCalled();
      expect(mockSchedulerRegistry.deleteCronJob).toHaveBeenCalledWith(jobId);
    });

    it('should_handle_missing_job_gracefully', () => {
      // ARRANGE
      const jobId = 'non-existent-job';
      vi.mocked(mockSchedulerRegistry.doesExist).mockReturnValue(false);

      // ACT - Should not throw
      expect(() => service.cancelJob(jobId)).not.toThrow();
    });

    it('should_handle_job_not_in_map_but_exists_in_registry', () => {
      // ARRANGE
      const jobId = 'test-job-1';
      vi.mocked(mockSchedulerRegistry.doesExist).mockReturnValue(true);

      // ACT - Job not in map but exists in registry
      expect(() => service.cancelJob(jobId)).not.toThrow();
      expect(mockSchedulerRegistry.deleteCronJob).toHaveBeenCalledWith(jobId);
    });

    it('should_handle_job_in_map_but_get_returns_null', () => {
      // ARRANGE
      const jobId = 'test-job-1';
      const scheduledAt = new Date(Date.now() + 86400000);
      const executeCallback = vi.fn().mockResolvedValue(undefined);
      vi.mocked(mockSchedulerRegistry.doesExist).mockReturnValue(false);

      // Schedule job then manually manipulate to test null case
      service.scheduleJob(jobId, scheduledAt, executeCallback);

      // Access internal map to set job to null (testing edge case)
      const serviceInternal = service as any;
      serviceInternal.scheduledJobs.set(jobId, null);

      // ACT - Should handle null job gracefully
      expect(() => service.cancelJob(jobId)).not.toThrow();
    });
  });

  describe('stopAllJobs', () => {
    it('should_stop_all_scheduled_jobs', () => {
      // ARRANGE
      const jobId1 = 'test-job-1';
      const jobId2 = 'test-job-2';
      const scheduledAt = new Date(Date.now() + 86400000);
      const executeCallback = vi.fn().mockResolvedValue(undefined);
      vi.mocked(mockSchedulerRegistry.doesExist).mockReturnValue(true);

      service.scheduleJob(jobId1, scheduledAt, executeCallback);
      service.scheduleJob(jobId2, scheduledAt, executeCallback);
      const job1Call = vi.mocked(mockSchedulerRegistry.addCronJob).mock
        .calls[0];
      const job1 = job1Call[1] as unknown as { stop: ReturnType<typeof vi.fn> };

      // ACT
      service.stopAllJobs();

      // ASSERT
      expect(job1.stop).toHaveBeenCalled();
      expect(mockSchedulerRegistry.deleteCronJob).toHaveBeenCalled();
    });
  });

  describe('getScheduledJobIds', () => {
    it('should_return_all_scheduled_job_ids', () => {
      // ARRANGE
      const jobId1 = 'test-job-1';
      const jobId2 = 'test-job-2';
      const scheduledAt = new Date(Date.now() + 86400000);
      const executeCallback = vi.fn().mockResolvedValue(undefined);

      service.scheduleJob(jobId1, scheduledAt, executeCallback);
      service.scheduleJob(jobId2, scheduledAt, executeCallback);

      // ACT
      const jobIds = service.getScheduledJobIds();

      // ASSERT
      expect(jobIds).toContain(jobId1);
      expect(jobIds).toContain(jobId2);
      expect(jobIds.length).toBe(2);
    });
  });

  describe('scheduleJob error handling', () => {
    it(
      'should_handle_callback_error_when_execution_fails',
      async () => {
        // ARRANGE
        const jobId = 'test-job-1';
        const scheduledAt = new Date(Date.now() + 86400000);
        const executeError = new Error('Execution failed');
        const executeCallback = vi.fn().mockRejectedValue(executeError);
        vi.mocked(mockSchedulerRegistry.doesExist).mockReturnValue(true);

        // ACT
        service.scheduleJob(jobId, scheduledAt, executeCallback);

        // Get the CronJob constructor call to access the callback
        const { CronJob } = await import('cron');
        const cronJobCalls = vi.mocked(CronJob).mock.calls;
        expect(cronJobCalls.length).toBeGreaterThan(0);

        // The callback is the second parameter to CronJob constructor
        const jobCallback = cronJobCalls[0][1] as () => Promise<void>;

        // Execute the callback (simulating cron execution)
        await expect(jobCallback()).rejects.toThrow('Execution failed');

        // ASSERT - Verify cleanup happened
        const cronJobCall = vi.mocked(mockSchedulerRegistry.addCronJob).mock
          .calls[0];
        const createdJob = cronJobCall[1] as unknown as {
          stop: ReturnType<typeof vi.fn>;
        };
        expect(createdJob.stop).toHaveBeenCalled();
        expect(mockSchedulerRegistry.deleteCronJob).toHaveBeenCalledWith(jobId);
      },
      { timeout: 5000 },
    );

    it(
      'should_handle_registry_delete_error_gracefully',
      async () => {
        // ARRANGE
        const jobId = 'test-job-1';
        const scheduledAt = new Date(Date.now() + 86400000);
        const executeCallback = vi.fn().mockResolvedValue(undefined);
        vi.mocked(mockSchedulerRegistry.doesExist).mockReturnValue(true);
        vi.mocked(mockSchedulerRegistry.deleteCronJob).mockImplementation(
          () => {
            throw new Error('Delete failed');
          },
        );

        // ACT
        service.scheduleJob(jobId, scheduledAt, executeCallback);

        // Get the job callback
        const { CronJob } = await import('cron');
        const cronJobCalls = vi.mocked(CronJob).mock.calls;
        const jobCallback = cronJobCalls[0][1] as () => Promise<void>;

        // Should not throw even if delete fails
        await expect(jobCallback()).resolves.not.toThrow();
      },
      { timeout: 5000 },
    );

    it(
      'should_handle_job_stop_error_gracefully',
      async () => {
        // ARRANGE
        const jobId = 'test-job-1';
        const scheduledAt = new Date(Date.now() + 86400000);
        const executeCallback = vi.fn().mockResolvedValue(undefined);
        vi.mocked(mockSchedulerRegistry.doesExist).mockReturnValue(true);

        service.scheduleJob(jobId, scheduledAt, executeCallback);

        // Get the job and make stop() throw
        const cronJobCall = vi.mocked(mockSchedulerRegistry.addCronJob).mock
          .calls[0];
        const createdJob = cronJobCall[1] as unknown as {
          stop: ReturnType<typeof vi.fn>;
        };
        createdJob.stop.mockRejectedValue(new Error('Stop failed'));

        // Get the job callback
        const { CronJob } = await import('cron');
        const cronJobCalls = vi.mocked(CronJob).mock.calls;
        const jobCallback = cronJobCalls[0][1] as () => Promise<void>;

        // ACT - Should not throw even if stop fails
        await expect(jobCallback()).resolves.not.toThrow();
      },
      { timeout: 5000 },
    );
  });

  describe('cancelJob error handling', () => {
    it('should_handle_registry_delete_error_gracefully', () => {
      // ARRANGE
      const jobId = 'test-job-1';
      const scheduledAt = new Date(Date.now() + 86400000);
      const executeCallback = vi.fn().mockResolvedValue(undefined);
      vi.mocked(mockSchedulerRegistry.doesExist).mockReturnValue(true);
      vi.mocked(mockSchedulerRegistry.deleteCronJob).mockImplementation(() => {
        throw new Error('Delete failed');
      });

      service.scheduleJob(jobId, scheduledAt, executeCallback);

      // ACT - Should not throw
      expect(() => service.cancelJob(jobId)).not.toThrow();
    });

    it('should_handle_job_stop_error_gracefully', () => {
      // ARRANGE
      const jobId = 'test-job-1';
      const scheduledAt = new Date(Date.now() + 86400000);
      const executeCallback = vi.fn().mockResolvedValue(undefined);
      vi.mocked(mockSchedulerRegistry.doesExist).mockReturnValue(true);

      service.scheduleJob(jobId, scheduledAt, executeCallback);
      const jobCall = vi.mocked(mockSchedulerRegistry.addCronJob).mock.calls[0];
      const createdJob = jobCall[1] as unknown as {
        stop: ReturnType<typeof vi.fn>;
      };
      createdJob.stop.mockRejectedValue(new Error('Stop failed'));

      // ACT - Should not throw
      expect(() => service.cancelJob(jobId)).not.toThrow();
    });
  });

  describe('stopAllJobs error handling', () => {
    it('should_handle_job_stop_errors_gracefully', () => {
      // ARRANGE
      const jobId1 = 'test-job-1';
      const jobId2 = 'test-job-2';
      const scheduledAt = new Date(Date.now() + 86400000);
      const executeCallback = vi.fn().mockResolvedValue(undefined);
      vi.mocked(mockSchedulerRegistry.doesExist).mockReturnValue(true);

      service.scheduleJob(jobId1, scheduledAt, executeCallback);
      service.scheduleJob(jobId2, scheduledAt, executeCallback);

      const job1Call = vi.mocked(mockSchedulerRegistry.addCronJob).mock
        .calls[0];
      const job1 = job1Call[1] as unknown as { stop: ReturnType<typeof vi.fn> };
      job1.stop.mockRejectedValue(new Error('Stop failed'));

      // ACT - Should not throw
      expect(() => service.stopAllJobs()).not.toThrow();
      expect(mockSchedulerRegistry.deleteCronJob).toHaveBeenCalled();
    });

    it('should_handle_registry_delete_errors_gracefully', () => {
      // ARRANGE
      const jobId1 = 'test-job-1';
      const scheduledAt = new Date(Date.now() + 86400000);
      const executeCallback = vi.fn().mockResolvedValue(undefined);
      vi.mocked(mockSchedulerRegistry.doesExist).mockReturnValue(true);
      vi.mocked(mockSchedulerRegistry.deleteCronJob).mockImplementation(() => {
        throw new Error('Delete failed');
      });

      service.scheduleJob(jobId1, scheduledAt, executeCallback);

      // ACT - Should not throw
      expect(() => service.stopAllJobs()).not.toThrow();
    });
  });
});
