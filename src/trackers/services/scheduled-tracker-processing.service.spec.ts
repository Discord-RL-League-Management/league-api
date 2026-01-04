/**
 * ScheduledTrackerProcessingService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ScheduledTrackerProcessingService } from './scheduled-tracker-processing.service';
import { PrismaService } from '@/prisma/prisma.service';
import { TrackerProcessingService } from '../services/tracker-processing.service';
import { ScheduledProcessingStatus } from '@prisma/client';
import { CronJob } from 'cron';

// Mock CronJob constructor
vi.mock('cron', () => {
  const mockCronJob = vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn().mockReturnValue(undefined),
  }));
  return {
    CronJob: mockCronJob,
  };
});

describe('ScheduledTrackerProcessingService', () => {
  let service: ScheduledTrackerProcessingService;
  let mockPrisma: PrismaService;
  let mockTrackerProcessingService: TrackerProcessingService;
  let mockSchedulerRegistry: SchedulerRegistry;
  let mockCronJobInstance: {
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
  };

  const mockGuild = {
    id: '987654321098765432',
    name: 'Test Guild',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSchedule = {
    id: 'schedule-123',
    guildId: '987654321098765432',
    scheduledAt: new Date(Date.now() + 86400000), // +1 day
    createdBy: '123456789012345678',
    status: ScheduledProcessingStatus.PENDING,
    metadata: { reason: 'Season 15 start' },
    createdAt: new Date(),
    updatedAt: new Date(),
    executedAt: null,
    errorMessage: null,
  };

  beforeEach(() => {
    mockCronJobInstance = {
      start: vi.fn(),
      stop: vi.fn().mockReturnValue(undefined),
    };

    vi.mocked(CronJob).mockImplementation(() => mockCronJobInstance as any);

    mockPrisma = {
      guild: {
        findUnique: vi.fn(),
      },
      scheduledTrackerProcessing: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    } as unknown as PrismaService;

    mockTrackerProcessingService = {
      processPendingTrackersForGuild: vi.fn(),
    } as unknown as TrackerProcessingService;

    mockSchedulerRegistry = {
      addCronJob: vi.fn(),
      deleteCronJob: vi.fn(),
      doesExist: vi.fn().mockReturnValue(false),
    } as unknown as SchedulerRegistry;

    service = new ScheduledTrackerProcessingService(
      mockPrisma,
      mockTrackerProcessingService,
      mockSchedulerRegistry,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createSchedule', () => {
    it('should_create_schedule_when_data_is_valid', async () => {
      const guildId = '987654321098765432';
      const scheduledAt = new Date(Date.now() + 86400000);
      const createdBy = '123456789012345678';

      vi.mocked(mockPrisma.guild.findUnique).mockResolvedValue(
        mockGuild as any,
      );
      vi.mocked(mockPrisma.scheduledTrackerProcessing.create).mockResolvedValue(
        mockSchedule as any,
      );

      const result = await service.createSchedule(
        guildId,
        scheduledAt,
        createdBy,
      );

      expect(result).toEqual(mockSchedule);
      expect(mockPrisma.guild.findUnique).toHaveBeenCalledWith({
        where: { id: guildId },
      });
      expect(mockPrisma.scheduledTrackerProcessing.create).toHaveBeenCalled();
    });

    it('should_create_schedule_when_date_is_iso_string', async () => {
      const guildId = '987654321098765432';
      const scheduledAt = new Date(Date.now() + 86400000).toISOString();
      const createdBy = '123456789012345678';

      vi.mocked(mockPrisma.guild.findUnique).mockResolvedValue(
        mockGuild as any,
      );
      vi.mocked(mockPrisma.scheduledTrackerProcessing.create).mockResolvedValue(
        mockSchedule as any,
      );

      const result = await service.createSchedule(
        guildId,
        scheduledAt,
        createdBy,
      );

      expect(result).toEqual(mockSchedule);
      expect(mockPrisma.guild.findUnique).toHaveBeenCalledWith({
        where: { id: guildId },
      });
    });

    it('should_create_schedule_when_metadata_is_provided', async () => {
      const guildId = '987654321098765432';
      const scheduledAt = new Date(Date.now() + 86400000);
      const createdBy = '123456789012345678';
      const metadata = { reason: 'Season 15 start' };

      vi.mocked(mockPrisma.guild.findUnique).mockResolvedValue(
        mockGuild as any,
      );
      vi.mocked(mockPrisma.scheduledTrackerProcessing.create).mockResolvedValue(
        mockSchedule as any,
      );

      const result = await service.createSchedule(
        guildId,
        scheduledAt,
        createdBy,
        metadata,
      );

      expect(result).toEqual(mockSchedule);
      expect(mockPrisma.scheduledTrackerProcessing.create).toHaveBeenCalled();
    });

    it('should_throw_BadRequestException_when_date_is_in_past', async () => {
      const guildId = '987654321098765432';
      const scheduledAt = new Date(Date.now() - 1000);
      const createdBy = '123456789012345678';

      await expect(
        service.createSchedule(guildId, scheduledAt, createdBy),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.guild.findUnique).not.toHaveBeenCalled();
    });

    it('should_throw_BadRequestException_when_date_equals_current_time', async () => {
      const guildId = '987654321098765432';
      const now = new Date();
      const createdBy = '123456789012345678';

      await expect(
        service.createSchedule(guildId, now, createdBy),
      ).rejects.toThrow(BadRequestException);
    });

    it('should_throw_NotFoundException_when_guild_does_not_exist', async () => {
      const guildId = '987654321098765432';
      const scheduledAt = new Date(Date.now() + 86400000);
      const createdBy = '123456789012345678';

      vi.mocked(mockPrisma.guild.findUnique).mockResolvedValue(null);

      await expect(
        service.createSchedule(guildId, scheduledAt, createdBy),
      ).rejects.toThrow(NotFoundException);
      expect(
        mockPrisma.scheduledTrackerProcessing.create,
      ).not.toHaveBeenCalled();
    });

    it('should_schedule_job_when_schedule_is_created', async () => {
      const guildId = '987654321098765432';
      const scheduledAt = new Date(Date.now() + 86400000);
      const createdBy = '123456789012345678';

      vi.mocked(mockPrisma.guild.findUnique).mockResolvedValue(
        mockGuild as any,
      );
      vi.mocked(mockPrisma.scheduledTrackerProcessing.create).mockResolvedValue(
        mockSchedule as any,
      );

      await service.createSchedule(guildId, scheduledAt, createdBy);

      expect(CronJob).toHaveBeenCalled();
      expect(mockCronJobInstance.start).toHaveBeenCalled();
      expect(mockSchedulerRegistry.addCronJob).toHaveBeenCalled();
    });
  });

  describe('getSchedulesForGuild', () => {
    it('should_return_all_schedules_when_no_options_provided', async () => {
      const guildId = '987654321098765432';
      const schedules = [mockSchedule];

      vi.mocked(
        mockPrisma.scheduledTrackerProcessing.findMany,
      ).mockResolvedValue(schedules as any);

      const result = await service.getSchedulesForGuild(guildId);

      expect(result).toEqual(schedules);
      expect(
        mockPrisma.scheduledTrackerProcessing.findMany,
      ).toHaveBeenCalledWith({
        where: { guildId },
        orderBy: { scheduledAt: 'asc' },
      });
    });

    it('should_filter_by_status_when_status_option_provided', async () => {
      const guildId = '987654321098765432';
      const schedules = [mockSchedule];

      vi.mocked(
        mockPrisma.scheduledTrackerProcessing.findMany,
      ).mockResolvedValue(schedules as any);

      await service.getSchedulesForGuild(guildId, {
        status: ScheduledProcessingStatus.PENDING,
      });

      expect(
        mockPrisma.scheduledTrackerProcessing.findMany,
      ).toHaveBeenCalledWith({
        where: {
          guildId,
          status: ScheduledProcessingStatus.PENDING,
        },
        orderBy: { scheduledAt: 'asc' },
      });
    });

    it('should_exclude_completed_when_includeCompleted_is_false', async () => {
      const guildId = '987654321098765432';
      const schedules = [mockSchedule];

      vi.mocked(
        mockPrisma.scheduledTrackerProcessing.findMany,
      ).mockResolvedValue(schedules as any);

      await service.getSchedulesForGuild(guildId, {
        includeCompleted: false,
      });

      expect(
        mockPrisma.scheduledTrackerProcessing.findMany,
      ).toHaveBeenCalledWith({
        where: {
          guildId,
          status: { not: ScheduledProcessingStatus.COMPLETED },
        },
        orderBy: { scheduledAt: 'asc' },
      });
    });

    it('should_use_status_when_status_and_includeCompleted_provided', async () => {
      const guildId = '987654321098765432';
      const schedules = [mockSchedule];

      vi.mocked(
        mockPrisma.scheduledTrackerProcessing.findMany,
      ).mockResolvedValue(schedules as any);

      await service.getSchedulesForGuild(guildId, {
        status: ScheduledProcessingStatus.PENDING,
        includeCompleted: false,
      });

      expect(
        mockPrisma.scheduledTrackerProcessing.findMany,
      ).toHaveBeenCalledWith({
        where: {
          guildId,
          status: ScheduledProcessingStatus.PENDING,
        },
        orderBy: { scheduledAt: 'asc' },
      });
    });

    it('should_order_by_scheduledAt_ascending', async () => {
      const guildId = '987654321098765432';
      const schedules = [mockSchedule];

      vi.mocked(
        mockPrisma.scheduledTrackerProcessing.findMany,
      ).mockResolvedValue(schedules as any);

      await service.getSchedulesForGuild(guildId);

      const callArgs = vi.mocked(mockPrisma.scheduledTrackerProcessing.findMany)
        .mock.calls[0]?.[0];
      expect(callArgs?.orderBy).toEqual({ scheduledAt: 'asc' });
    });
  });

  describe('getSchedule', () => {
    it('should_return_schedule_when_schedule_exists', async () => {
      const scheduleId = 'schedule-123';

      vi.mocked(
        mockPrisma.scheduledTrackerProcessing.findUnique,
      ).mockResolvedValue(mockSchedule as any);

      const result = await service.getSchedule(scheduleId);

      expect(result).toEqual(mockSchedule);
      expect(
        mockPrisma.scheduledTrackerProcessing.findUnique,
      ).toHaveBeenCalledWith({
        where: { id: scheduleId },
      });
    });

    it('should_throw_NotFoundException_when_schedule_does_not_exist', async () => {
      const scheduleId = 'nonexistent';

      vi.mocked(
        mockPrisma.scheduledTrackerProcessing.findUnique,
      ).mockResolvedValue(null);

      await expect(service.getSchedule(scheduleId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('cancelSchedule', () => {
    it('should_cancel_schedule_when_status_is_pending', async () => {
      const scheduleId = 'schedule-123';
      const pendingSchedule = {
        ...mockSchedule,
        status: ScheduledProcessingStatus.PENDING,
      };
      const cancelledSchedule = {
        ...pendingSchedule,
        status: ScheduledProcessingStatus.CANCELLED,
      };
      const jobId = `scheduled-processing-${scheduleId}`;

      vi.mocked(
        mockPrisma.scheduledTrackerProcessing.findUnique,
      ).mockResolvedValue(pendingSchedule as any);
      vi.mocked(mockPrisma.scheduledTrackerProcessing.update).mockResolvedValue(
        cancelledSchedule as any,
      );
      vi.mocked(mockSchedulerRegistry.doesExist).mockReturnValue(true);

      // Add job to service's internal map (using reflection for testing)
      const scheduledJobsMap = (service as any).scheduledJobs;
      scheduledJobsMap.set(jobId, mockCronJobInstance);

      const result = await service.cancelSchedule(scheduleId);

      expect(result.status).toBe(ScheduledProcessingStatus.CANCELLED);
      expect(mockCronJobInstance.stop).toHaveBeenCalled();
      expect(mockSchedulerRegistry.deleteCronJob).toHaveBeenCalledWith(jobId);
      expect(scheduledJobsMap.has(jobId)).toBe(false);
    });

    it('should_throw_BadRequestException_when_status_is_completed', async () => {
      const scheduleId = 'schedule-123';
      const completedSchedule = {
        ...mockSchedule,
        status: ScheduledProcessingStatus.COMPLETED,
      };

      vi.mocked(
        mockPrisma.scheduledTrackerProcessing.findUnique,
      ).mockResolvedValue(completedSchedule as any);

      await expect(service.cancelSchedule(scheduleId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should_throw_BadRequestException_when_status_is_cancelled', async () => {
      const scheduleId = 'schedule-123';
      const cancelledSchedule = {
        ...mockSchedule,
        status: ScheduledProcessingStatus.CANCELLED,
      };

      vi.mocked(
        mockPrisma.scheduledTrackerProcessing.findUnique,
      ).mockResolvedValue(cancelledSchedule as any);

      await expect(service.cancelSchedule(scheduleId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should_throw_BadRequestException_when_status_is_failed', async () => {
      const scheduleId = 'schedule-123';
      const failedSchedule = {
        ...mockSchedule,
        status: ScheduledProcessingStatus.FAILED,
      };

      vi.mocked(
        mockPrisma.scheduledTrackerProcessing.findUnique,
      ).mockResolvedValue(failedSchedule as any);

      await expect(service.cancelSchedule(scheduleId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should_handle_missing_job_gracefully_when_cancelling', async () => {
      const scheduleId = 'schedule-123';
      const pendingSchedule = {
        ...mockSchedule,
        status: ScheduledProcessingStatus.PENDING,
      };
      const cancelledSchedule = {
        ...pendingSchedule,
        status: ScheduledProcessingStatus.CANCELLED,
      };

      vi.mocked(
        mockPrisma.scheduledTrackerProcessing.findUnique,
      ).mockResolvedValue(pendingSchedule as any);
      vi.mocked(mockPrisma.scheduledTrackerProcessing.update).mockResolvedValue(
        cancelledSchedule as any,
      );
      vi.mocked(mockSchedulerRegistry.doesExist).mockReturnValue(false);

      const result = await service.cancelSchedule(scheduleId);

      expect(result.status).toBe(ScheduledProcessingStatus.CANCELLED);
      expect(mockPrisma.scheduledTrackerProcessing.update).toHaveBeenCalled();
    });

    it('should_handle_scheduler_registry_error_gracefully', async () => {
      const scheduleId = 'schedule-123';
      const pendingSchedule = {
        ...mockSchedule,
        status: ScheduledProcessingStatus.PENDING,
      };
      const cancelledSchedule = {
        ...pendingSchedule,
        status: ScheduledProcessingStatus.CANCELLED,
      };
      const jobId = `scheduled-processing-${scheduleId}`;

      vi.mocked(
        mockPrisma.scheduledTrackerProcessing.findUnique,
      ).mockResolvedValue(pendingSchedule as any);
      vi.mocked(mockPrisma.scheduledTrackerProcessing.update).mockResolvedValue(
        cancelledSchedule as any,
      );
      vi.mocked(mockSchedulerRegistry.doesExist).mockReturnValue(true);
      vi.mocked(mockSchedulerRegistry.deleteCronJob).mockImplementation(() => {
        throw new Error('Registry error');
      });

      const scheduledJobsMap = (service as any).scheduledJobs;
      scheduledJobsMap.set(jobId, mockCronJobInstance);

      const result = await service.cancelSchedule(scheduleId);

      expect(result.status).toBe(ScheduledProcessingStatus.CANCELLED);
      expect(mockSchedulerRegistry.deleteCronJob).toHaveBeenCalled();
    });
  });

  describe('onModuleInit', () => {
    it('should_load_pending_schedules_when_module_initializes', async () => {
      const futureSchedule = {
        ...mockSchedule,
        scheduledAt: new Date(Date.now() + 86400000),
      };
      const schedules = [futureSchedule];

      vi.mocked(
        mockPrisma.scheduledTrackerProcessing.findMany,
      ).mockResolvedValue(schedules as any);

      await service.onModuleInit();

      expect(
        mockPrisma.scheduledTrackerProcessing.findMany,
      ).toHaveBeenCalledWith({
        where: {
          status: ScheduledProcessingStatus.PENDING,
          scheduledAt: { gt: expect.any(Date) },
        },
      });
      expect(CronJob).toHaveBeenCalled();
    });

    it('should_not_load_past_schedules_when_module_initializes', async () => {
      vi.mocked(
        mockPrisma.scheduledTrackerProcessing.findMany,
      ).mockResolvedValue([] as any);

      await service.onModuleInit();

      const callArgs = vi.mocked(mockPrisma.scheduledTrackerProcessing.findMany)
        .mock.calls[0]?.[0];
      expect((callArgs?.where?.scheduledAt as any)?.gt).toBeInstanceOf(Date);
    });

    it('should_schedule_all_loaded_pending_schedules', async () => {
      const schedule1 = {
        ...mockSchedule,
        id: 'schedule-1',
        scheduledAt: new Date(Date.now() + 86400000),
      };
      const schedule2 = {
        ...mockSchedule,
        id: 'schedule-2',
        scheduledAt: new Date(Date.now() + 172800000),
      };
      const schedules = [schedule1, schedule2];

      vi.mocked(
        mockPrisma.scheduledTrackerProcessing.findMany,
      ).mockResolvedValue(schedules as any);

      await service.onModuleInit();

      expect(CronJob).toHaveBeenCalledTimes(2);
      expect(mockSchedulerRegistry.addCronJob).toHaveBeenCalledTimes(2);
    });
  });

  describe('onApplicationShutdown', () => {
    it('should_stop_all_jobs_when_shutting_down', async () => {
      const jobId1 = 'scheduled-processing-schedule-1';
      const jobId2 = 'scheduled-processing-schedule-2';
      const scheduledJobsMap = (service as any).scheduledJobs;

      scheduledJobsMap.set(jobId1, mockCronJobInstance);
      scheduledJobsMap.set(jobId2, mockCronJobInstance);

      vi.mocked(mockSchedulerRegistry.doesExist).mockReturnValue(true);

      await service.onApplicationShutdown();

      expect(mockCronJobInstance.stop).toHaveBeenCalledTimes(2);
      expect(mockSchedulerRegistry.deleteCronJob).toHaveBeenCalledTimes(2);
      expect(scheduledJobsMap.size).toBe(0);
    });

    it('should_handle_stop_errors_gracefully', async () => {
      const jobId = 'scheduled-processing-schedule-1';
      const errorJob = {
        start: vi.fn(),
        stop: vi.fn().mockImplementation(() => {
          throw new Error('Stop error');
        }),
      };
      const scheduledJobsMap = (service as any).scheduledJobs;

      scheduledJobsMap.set(jobId, errorJob);

      vi.mocked(mockSchedulerRegistry.doesExist).mockReturnValue(true);

      await service.onApplicationShutdown();

      expect(errorJob.stop).toHaveBeenCalled();
      expect(mockSchedulerRegistry.deleteCronJob).toHaveBeenCalled();
      expect(scheduledJobsMap.size).toBe(0);
    });

    it('should_handle_registry_deletion_errors_gracefully', async () => {
      const jobId = 'scheduled-processing-schedule-1';
      const scheduledJobsMap = (service as any).scheduledJobs;

      scheduledJobsMap.set(jobId, mockCronJobInstance);

      vi.mocked(mockSchedulerRegistry.doesExist).mockReturnValue(true);
      vi.mocked(mockSchedulerRegistry.deleteCronJob).mockImplementation(() => {
        throw new Error('Delete error');
      });

      await service.onApplicationShutdown();

      expect(mockCronJobInstance.stop).toHaveBeenCalled();
      expect(mockSchedulerRegistry.deleteCronJob).toHaveBeenCalled();
      expect(scheduledJobsMap.size).toBe(0);
    });

    it('should_clear_scheduled_jobs_map_when_shutting_down', async () => {
      const jobId = 'scheduled-processing-schedule-1';
      const scheduledJobsMap = (service as any).scheduledJobs;

      scheduledJobsMap.set(jobId, mockCronJobInstance);

      vi.mocked(mockSchedulerRegistry.doesExist).mockReturnValue(false);

      await service.onApplicationShutdown();

      expect(scheduledJobsMap.size).toBe(0);
    });
  });

  describe('dateToCronExpression', () => {
    it('should_convert_date_to_cron_expression_when_date_provided', async () => {
      const guildId = '987654321098765432';
      const now = new Date();
      const testDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        14,
        30,
        45,
      );
      const createdBy = '123456789012345678';

      vi.mocked(mockPrisma.guild.findUnique).mockResolvedValue(
        mockGuild as any,
      );
      vi.mocked(mockPrisma.scheduledTrackerProcessing.create).mockResolvedValue(
        mockSchedule as any,
      );

      await service.createSchedule(guildId, testDate, createdBy);

      expect(CronJob).toHaveBeenCalled();
      const cronCall = vi.mocked(CronJob).mock.calls[0];
      const expectedMonth = testDate.getMonth() + 1;
      expect(cronCall[0]).toBe(
        `45 30 14 ${testDate.getDate()} ${expectedMonth} *`,
      );
    });

    it('should_use_one_indexed_month_in_cron_expression', async () => {
      const guildId = '987654321098765432';
      // Always use a future date to ensure deterministic test behavior
      const futureYear = new Date().getFullYear() + 1;
      const testDate = new Date(futureYear, 0, 15, 10, 0, 0); // January (month 0 in JS, should be 1 in cron)
      const createdBy = '123456789012345678';

      vi.mocked(mockPrisma.guild.findUnique).mockResolvedValue(
        mockGuild as any,
      );
      vi.mocked(mockPrisma.scheduledTrackerProcessing.create).mockResolvedValue(
        mockSchedule as any,
      );

      await service.createSchedule(guildId, testDate, createdBy);

      const cronCall = vi.mocked(CronJob).mock.calls[0];
      expect(cronCall[0]).toBe('0 0 10 15 1 *');
    });

    it('should_handle_various_date_times_correctly', async () => {
      const guildId = '987654321098765432';
      // Always use a future date to ensure deterministic test behavior
      const futureYear = new Date().getFullYear() + 1;
      const testDate = new Date(futureYear, 5, 30, 23, 59, 59); // June (month 5 in JS, should be 6 in cron)
      const createdBy = '123456789012345678';

      vi.mocked(mockPrisma.guild.findUnique).mockResolvedValue(
        mockGuild as any,
      );
      vi.mocked(mockPrisma.scheduledTrackerProcessing.create).mockResolvedValue(
        mockSchedule as any,
      );

      await service.createSchedule(guildId, testDate, createdBy);

      const cronCall = vi.mocked(CronJob).mock.calls[0];
      expect(cronCall[0]).toBe('59 59 23 30 6 *');
    });
  });

  describe('execution logic', () => {
    it('should_execute_schedule_callback_when_job_runs', async () => {
      const guildId = '987654321098765432';
      const scheduleId = 'schedule-123';
      const scheduledAt = new Date(Date.now() + 86400000);
      const createdBy = '123456789012345678';
      let executionCallback: (() => Promise<void>) | undefined;

      vi.mocked(mockPrisma.guild.findUnique).mockResolvedValue(
        mockGuild as any,
      );
      vi.mocked(mockPrisma.scheduledTrackerProcessing.create).mockResolvedValue(
        { ...mockSchedule, id: scheduleId } as any,
      );
      vi.mocked(
        mockTrackerProcessingService.processPendingTrackersForGuild,
      ).mockResolvedValue({ processed: 5, trackers: ['tracker1'] });

      vi.mocked(CronJob).mockImplementation((cronExpr, onTick) => {
        executionCallback = onTick as () => Promise<void>;
        return mockCronJobInstance as any;
      });

      await service.createSchedule(guildId, scheduledAt, createdBy);

      expect(executionCallback).toBeDefined();
      vi.mocked(mockPrisma.scheduledTrackerProcessing.update)
        .mockResolvedValueOnce({
          ...mockSchedule,
          executedAt: new Date(),
        } as any)
        .mockResolvedValueOnce({
          ...mockSchedule,
          status: ScheduledProcessingStatus.COMPLETED,
        } as any);

      await executionCallback!();

      expect(
        mockTrackerProcessingService.processPendingTrackersForGuild,
      ).toHaveBeenCalledWith(guildId);
      expect(mockPrisma.scheduledTrackerProcessing.update).toHaveBeenCalled();
    });

    it('should_handle_execution_errors_gracefully', async () => {
      const guildId = '987654321098765432';
      const scheduleId = 'schedule-123';
      const scheduledAt = new Date(Date.now() + 86400000);
      const createdBy = '123456789012345678';
      let executionCallback: (() => Promise<void>) | undefined;

      vi.mocked(mockPrisma.guild.findUnique).mockResolvedValue(
        mockGuild as any,
      );
      vi.mocked(mockPrisma.scheduledTrackerProcessing.create).mockResolvedValue(
        { ...mockSchedule, id: scheduleId } as any,
      );
      vi.mocked(
        mockTrackerProcessingService.processPendingTrackersForGuild,
      ).mockRejectedValue(new Error('Processing failed'));

      vi.mocked(CronJob).mockImplementation((cronExpr, onTick) => {
        executionCallback = onTick as () => Promise<void>;
        return mockCronJobInstance as any;
      });

      await service.createSchedule(guildId, scheduledAt, createdBy);

      expect(executionCallback).toBeDefined();
      vi.mocked(
        mockPrisma.scheduledTrackerProcessing.update,
      ).mockResolvedValueOnce({
        ...mockSchedule,
        executedAt: new Date(),
      } as any);
      vi.mocked(
        mockPrisma.scheduledTrackerProcessing.update,
      ).mockResolvedValueOnce({
        ...mockSchedule,
        status: ScheduledProcessingStatus.FAILED,
        errorMessage: 'Processing failed',
      } as any);

      await executionCallback!();

      const updateCalls = vi.mocked(
        mockPrisma.scheduledTrackerProcessing.update,
      ).mock.calls;
      const failedUpdate = updateCalls.find(
        (call) =>
          (call[0]?.data?.status as string) ===
          ScheduledProcessingStatus.FAILED,
      );
      expect(failedUpdate).toBeDefined();
    });

    it('should_cleanup_job_in_finally_block_when_execution_completes', async () => {
      const guildId = '987654321098765432';
      const scheduleId = 'schedule-123';
      const scheduledAt = new Date(Date.now() + 86400000);
      const createdBy = '123456789012345678';
      let executionCallback: (() => Promise<void>) | undefined;

      vi.mocked(mockPrisma.guild.findUnique).mockResolvedValue(
        mockGuild as any,
      );
      vi.mocked(mockPrisma.scheduledTrackerProcessing.create).mockResolvedValue(
        { ...mockSchedule, id: scheduleId } as any,
      );
      vi.mocked(
        mockTrackerProcessingService.processPendingTrackersForGuild,
      ).mockResolvedValue({ processed: 5, trackers: ['tracker1'] });

      vi.mocked(CronJob).mockImplementation((cronExpr, onTick) => {
        executionCallback = onTick as () => Promise<void>;
        return mockCronJobInstance as any;
      });
      vi.mocked(mockSchedulerRegistry.doesExist).mockReturnValue(true);
      const jobId = `scheduled-processing-${scheduleId}`;

      await service.createSchedule(guildId, scheduledAt, createdBy);

      expect(executionCallback).toBeDefined();
      vi.mocked(mockPrisma.scheduledTrackerProcessing.update)
        .mockResolvedValueOnce({
          ...mockSchedule,
          executedAt: new Date(),
        } as any)
        .mockResolvedValueOnce({
          ...mockSchedule,
          status: ScheduledProcessingStatus.COMPLETED,
        } as any);

      await executionCallback!();

      expect(mockCronJobInstance.stop).toHaveBeenCalled();
      expect(mockSchedulerRegistry.deleteCronJob).toHaveBeenCalledWith(jobId);
    });
  });
});
