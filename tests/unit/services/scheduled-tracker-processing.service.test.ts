/**
 * ScheduledTrackerProcessingService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ScheduledTrackerProcessingService } from '@/trackers/services/scheduled-tracker-processing.service';
import { ScheduledTrackerProcessingRepository } from '@/trackers/repositories/scheduled-tracker-processing.repository';
import { GuildRepository } from '@/guilds/repositories/guild.repository';
import { TrackerService } from '@/trackers/services/tracker.service';
import { CronJobSchedulerService } from '@/trackers/services/cron-job-scheduler.service';
import {
  ScheduledProcessingStatus,
  Guild,
  ScheduledTrackerProcessing,
} from '@prisma/client';

describe('ScheduledTrackerProcessingService', () => {
  let service: ScheduledTrackerProcessingService;
  let mockRepository: ScheduledTrackerProcessingRepository;
  let mockGuildRepository: GuildRepository;
  let mockTrackerService: TrackerService;
  let mockSchedulerService: CronJobSchedulerService;

  const mockGuildId = '123456789012345678';
  const mockUserId = '987654321098765432';
  const mockScheduleId = 'schedule_123';

  const mockGuild: Guild = {
    id: mockGuildId,
    name: 'Test Guild',
    icon: 'guild_icon',
    ownerId: mockUserId,
    memberCount: 100,
    isActive: true,
    joinedAt: new Date(),
    leftAt: null,
  };

  const createMockSchedule = (
    overrides?: Partial<ScheduledTrackerProcessing>,
  ): ScheduledTrackerProcessing => ({
    id: mockScheduleId,
    guildId: mockGuildId,
    scheduledAt: new Date(Date.now() + 86400000),
    status: ScheduledProcessingStatus.PENDING,
    createdBy: mockUserId,
    executedAt: null,
    errorMessage: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const mockSchedule = createMockSchedule();

  beforeEach(() => {
    // ARRANGE: Setup test dependencies
    vi.clearAllMocks();

    mockRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findManyForGuild: vi.fn(),
      findPendingSchedules: vi.fn(),
      update: vi.fn(),
    } as unknown as ScheduledTrackerProcessingRepository;

    mockGuildRepository = {
      findById: vi.fn(),
    } as unknown as GuildRepository;

    mockTrackerService = {
      processPendingTrackersForGuild: vi.fn().mockResolvedValue(undefined),
    } as unknown as TrackerService;

    mockSchedulerService = {
      scheduleJob: vi.fn(),
      cancelJob: vi.fn(),
      stopAllJobs: vi.fn(),
      getScheduledJobIds: vi.fn().mockReturnValue([]),
    } as unknown as CronJobSchedulerService;

    service = new ScheduledTrackerProcessingService(
      mockRepository,
      mockGuildRepository,
      mockTrackerService,
      mockSchedulerService,
    );
  });

  afterEach(() => {
    // Note: vi.restoreAllMocks() not used to preserve module-level mocks (vi.mock)
    vi.clearAllMocks();
  });

  describe('createSchedule', () => {
    it('should_create_schedule_when_valid_input_provided', async () => {
      // ARRANGE
      const scheduledAt = new Date(Date.now() + 86400000);
      const metadata = { reason: 'Season 15 start', seasonNumber: 15 };

      vi.mocked(mockGuildRepository.findById).mockResolvedValue(mockGuild);
      vi.mocked(mockRepository.create).mockResolvedValue(
        createMockSchedule({ scheduledAt, metadata }),
      );

      // ACT
      const result = await service.createSchedule(
        mockGuildId,
        scheduledAt,
        mockUserId,
        metadata,
      );

      // ASSERT - Focus on result validation (cron job setup tested separately)
      expect(result.guildId).toBe(mockGuildId);
      expect(result.createdBy).toBe(mockUserId);
      expect(result.status).toBe(ScheduledProcessingStatus.PENDING);
      expect(result.metadata).toEqual(metadata);
      expect(mockRepository.create).toHaveBeenCalled();
    });

    it('should_throw_BadRequestException_when_scheduled_date_is_in_past', async () => {
      // ARRANGE
      const pastDate = new Date(Date.now() - 86400000);

      // ACT & ASSERT
      await expect(
        service.createSchedule(mockGuildId, pastDate, mockUserId),
      ).rejects.toThrow(BadRequestException);
      expect(mockGuildRepository.findById).not.toHaveBeenCalled();
    });

    it('should_throw_BadRequestException_when_scheduled_date_is_current_time', async () => {
      // ARRANGE
      const currentDate = new Date();

      // ACT & ASSERT
      await expect(
        service.createSchedule(mockGuildId, currentDate, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should_throw_NotFoundException_when_guild_does_not_exist', async () => {
      // ARRANGE
      const scheduledAt = new Date(Date.now() + 86400000);
      vi.mocked(mockGuildRepository.findById).mockResolvedValue(null);

      // ACT & ASSERT
      await expect(
        service.createSchedule(mockGuildId, scheduledAt, mockUserId),
      ).rejects.toThrow(NotFoundException);
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should_schedule_cron_job_when_schedule_is_created', async () => {
      // ARRANGE
      const scheduledAt = new Date(Date.now() + 86400000);
      vi.mocked(mockGuildRepository.findById).mockResolvedValue(mockGuild);
      vi.mocked(mockRepository.create).mockResolvedValue(
        createMockSchedule({ scheduledAt }),
      );

      // ACT
      await service.createSchedule(mockGuildId, scheduledAt, mockUserId);

      // ASSERT
      expect(mockSchedulerService.scheduleJob).toHaveBeenCalled();
    });

    it('should_store_metadata_when_metadata_provided', async () => {
      // ARRANGE
      const scheduledAt = new Date(Date.now() + 86400000);
      const metadata = { reason: 'Season start', seasonNumber: 15 };
      const scheduleWithMetadata = createMockSchedule({
        scheduledAt,
        metadata: metadata,
      });

      vi.mocked(mockGuildRepository.findById).mockResolvedValue(mockGuild);
      vi.mocked(mockRepository.create).mockResolvedValue(scheduleWithMetadata);

      // ACT
      const result = await service.createSchedule(
        mockGuildId,
        scheduledAt,
        mockUserId,
        metadata,
      );

      // ASSERT
      expect(result.metadata).toEqual(metadata);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: metadata,
        }),
      );
    });

    it('should_accept_date_string_when_provided_as_string', async () => {
      // ARRANGE
      const scheduledAt = new Date(Date.now() + 86400000);
      const scheduledAtString = scheduledAt.toISOString();

      vi.mocked(mockGuildRepository.findById).mockResolvedValue(mockGuild);
      vi.mocked(mockRepository.create).mockResolvedValue(
        createMockSchedule({ scheduledAt }),
      );

      // ACT
      const result = await service.createSchedule(
        mockGuildId,
        scheduledAtString,
        mockUserId,
      );

      // ASSERT
      expect(result).toBeDefined();
      expect(mockRepository.create).toHaveBeenCalled();
    });
  });

  describe('getSchedulesForGuild', () => {
    it('should_return_schedules_when_guild_has_schedules', async () => {
      // ARRANGE
      const schedules = [
        createMockSchedule({ id: 'schedule_1' }),
        createMockSchedule({ id: 'schedule_2' }),
      ];
      vi.mocked(mockRepository.findManyForGuild).mockResolvedValue(schedules);

      // ACT
      const result = await service.getSchedulesForGuild(mockGuildId);

      // ASSERT
      expect(result).toEqual(schedules);
      expect(result.length).toBe(2);
      expect(mockRepository.findManyForGuild).toHaveBeenCalledWith(
        mockGuildId,
        undefined,
      );
    });

    it('should_filter_by_status_when_status_option_provided', async () => {
      // ARRANGE
      const schedules = [createMockSchedule()];
      vi.mocked(mockRepository.findManyForGuild).mockResolvedValue(schedules);

      // ACT
      await service.getSchedulesForGuild(mockGuildId, {
        status: ScheduledProcessingStatus.PENDING,
      });

      // ASSERT
      expect(mockRepository.findManyForGuild).toHaveBeenCalledWith(
        mockGuildId,
        { status: ScheduledProcessingStatus.PENDING },
      );
    });

    it('should_exclude_completed_when_includeCompleted_is_false', async () => {
      // ARRANGE
      const schedules = [createMockSchedule()];
      vi.mocked(mockRepository.findManyForGuild).mockResolvedValue(schedules);

      // ACT
      await service.getSchedulesForGuild(mockGuildId, {
        includeCompleted: false,
      });

      // ASSERT
      expect(mockRepository.findManyForGuild).toHaveBeenCalledWith(
        mockGuildId,
        { includeCompleted: false },
      );
    });

    it('should_return_empty_array_when_no_schedules_exist', async () => {
      // ARRANGE
      vi.mocked(mockRepository.findManyForGuild).mockResolvedValue([]);

      // ACT
      const result = await service.getSchedulesForGuild(mockGuildId);

      // ASSERT
      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });

    it('should_order_by_scheduledAt_ascending', async () => {
      // ARRANGE
      const schedules = [
        createMockSchedule({
          id: 'schedule_1',
          scheduledAt: new Date(Date.now() + 86400000),
        }),
        createMockSchedule({
          id: 'schedule_2',
          scheduledAt: new Date(Date.now() + 172800000),
        }),
      ];
      vi.mocked(mockRepository.findManyForGuild).mockResolvedValue(schedules);

      // ACT
      await service.getSchedulesForGuild(mockGuildId);

      // ASSERT
      expect(mockRepository.findManyForGuild).toHaveBeenCalledWith(
        mockGuildId,
        undefined,
      );
    });
  });

  describe('getSchedule', () => {
    it('should_return_schedule_when_id_exists', async () => {
      // ARRANGE
      vi.mocked(mockRepository.findById).mockResolvedValue(mockSchedule);

      // ACT
      const result = await service.getSchedule(mockScheduleId);

      // ASSERT
      expect(result).toEqual(mockSchedule);
      expect(result.id).toBe(mockScheduleId);
      expect(mockRepository.findById).toHaveBeenCalledWith(mockScheduleId);
    });

    it('should_throw_NotFoundException_when_id_does_not_exist', async () => {
      // ARRANGE
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      // ACT & ASSERT
      await expect(service.getSchedule(mockScheduleId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockRepository.findById).toHaveBeenCalledWith(mockScheduleId);
    });
  });

  describe('cancelSchedule', () => {
    it('should_cancel_schedule_when_status_is_pending', async () => {
      // ARRANGE
      const pendingSchedule = createMockSchedule({
        status: ScheduledProcessingStatus.PENDING,
      });
      const cancelledSchedule = createMockSchedule({
        status: ScheduledProcessingStatus.CANCELLED,
      });

      vi.mocked(mockRepository.findById).mockResolvedValue(pendingSchedule);
      vi.mocked(mockRepository.update).mockResolvedValue(cancelledSchedule);

      const jobId = `scheduled-processing-${mockScheduleId}`;

      // ACT
      const result = await service.cancelSchedule(mockScheduleId);

      // ASSERT
      expect(result.status).toBe(ScheduledProcessingStatus.CANCELLED);
      expect(mockSchedulerService.cancelJob).toHaveBeenCalledWith(jobId);
      expect(mockRepository.update).toHaveBeenCalledWith(
        mockScheduleId,
        expect.objectContaining({
          status: ScheduledProcessingStatus.CANCELLED,
        }),
      );
    });

    it('should_throw_BadRequestException_when_status_is_not_pending', async () => {
      // ARRANGE
      const completedSchedule = createMockSchedule({
        status: ScheduledProcessingStatus.COMPLETED,
      });
      vi.mocked(mockRepository.findById).mockResolvedValue(completedSchedule);

      // ACT & ASSERT
      await expect(service.cancelSchedule(mockScheduleId)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should_throw_BadRequestException_when_status_is_cancelled', async () => {
      // ARRANGE
      const cancelledSchedule = createMockSchedule({
        status: ScheduledProcessingStatus.CANCELLED,
      });
      vi.mocked(mockRepository.findById).mockResolvedValue(cancelledSchedule);

      // ACT & ASSERT
      await expect(service.cancelSchedule(mockScheduleId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should_throw_BadRequestException_when_status_is_failed', async () => {
      // ARRANGE
      const failedSchedule = createMockSchedule({
        status: ScheduledProcessingStatus.FAILED,
      });
      vi.mocked(mockRepository.findById).mockResolvedValue(failedSchedule);

      // ACT & ASSERT
      await expect(service.cancelSchedule(mockScheduleId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should_stop_cron_job_when_cancelling', async () => {
      // ARRANGE
      const pendingSchedule = createMockSchedule({
        status: ScheduledProcessingStatus.PENDING,
      });
      const cancelledSchedule = createMockSchedule({
        status: ScheduledProcessingStatus.CANCELLED,
      });

      vi.mocked(mockRepository.findById).mockResolvedValue(pendingSchedule);
      vi.mocked(mockRepository.update).mockResolvedValue(cancelledSchedule);

      const jobId = `scheduled-processing-${mockScheduleId}`;

      // ACT
      await service.cancelSchedule(mockScheduleId);

      // ASSERT
      expect(mockSchedulerService.cancelJob).toHaveBeenCalledWith(jobId);
    });

    it('should_remove_job_from_registry_when_cancelling', async () => {
      // ARRANGE
      const pendingSchedule = createMockSchedule({
        status: ScheduledProcessingStatus.PENDING,
      });
      const cancelledSchedule = createMockSchedule({
        status: ScheduledProcessingStatus.CANCELLED,
      });

      vi.mocked(mockRepository.findById).mockResolvedValue(pendingSchedule);
      vi.mocked(mockRepository.update).mockResolvedValue(cancelledSchedule);

      const jobId = `scheduled-processing-${mockScheduleId}`;

      // ACT
      await service.cancelSchedule(mockScheduleId);

      // ASSERT
      expect(mockSchedulerService.cancelJob).toHaveBeenCalledWith(jobId);
    });

    it('should_update_status_to_cancelled_when_successful', async () => {
      // ARRANGE
      const pendingSchedule = createMockSchedule({
        status: ScheduledProcessingStatus.PENDING,
      });
      const cancelledSchedule = createMockSchedule({
        status: ScheduledProcessingStatus.CANCELLED,
      });

      vi.mocked(mockRepository.findById).mockResolvedValue(pendingSchedule);
      vi.mocked(mockRepository.update).mockResolvedValue(cancelledSchedule);

      const jobId = `scheduled-processing-${mockScheduleId}`;

      // ACT
      const result = await service.cancelSchedule(mockScheduleId);

      // ASSERT
      expect(result.status).toBe(ScheduledProcessingStatus.CANCELLED);
      expect(mockSchedulerService.cancelJob).toHaveBeenCalledWith(jobId);
      expect(mockRepository.update).toHaveBeenCalledWith(
        mockScheduleId,
        expect.objectContaining({
          status: ScheduledProcessingStatus.CANCELLED,
        }),
      );
    });

    it('should_handle_missing_job_gracefully_when_cancelling', async () => {
      // ARRANGE
      const pendingSchedule = createMockSchedule({
        status: ScheduledProcessingStatus.PENDING,
      });
      const cancelledSchedule = createMockSchedule({
        status: ScheduledProcessingStatus.CANCELLED,
      });

      vi.mocked(mockRepository.findById).mockResolvedValue(pendingSchedule);
      vi.mocked(mockRepository.update).mockResolvedValue(cancelledSchedule);

      // ACT
      const result = await service.cancelSchedule(mockScheduleId);

      // ASSERT
      expect(result.status).toBe(ScheduledProcessingStatus.CANCELLED);
      expect(mockSchedulerService.cancelJob).toHaveBeenCalled();
    });
  });

  describe('loadPendingSchedules', () => {
    it('should_load_pending_schedules_and_schedule_jobs', async () => {
      // ARRANGE
      const futureDate = new Date(Date.now() + 86400000);
      const pendingSchedules = [
        createMockSchedule({
          id: 'schedule_1',
          scheduledAt: futureDate,
          status: ScheduledProcessingStatus.PENDING,
        }),
        createMockSchedule({
          id: 'schedule_2',
          scheduledAt: new Date(Date.now() + 172800000),
          status: ScheduledProcessingStatus.PENDING,
        }),
      ];

      vi.mocked(mockRepository.findPendingSchedules).mockResolvedValue(
        pendingSchedules,
      );

      // ACT
      await service.loadPendingSchedules();

      // ASSERT
      expect(mockRepository.findPendingSchedules).toHaveBeenCalled();
      expect(mockSchedulerService.scheduleJob).toHaveBeenCalledTimes(2);
    });

    it('should_handle_empty_pending_schedules_gracefully', async () => {
      // ARRANGE
      vi.mocked(mockRepository.findPendingSchedules).mockResolvedValue([]);

      // ACT
      await service.loadPendingSchedules();

      // ASSERT
      expect(mockRepository.findPendingSchedules).toHaveBeenCalled();
      expect(mockSchedulerService.scheduleJob).not.toHaveBeenCalled();
    });
  });

  describe('createExecutionCallback error handling', () => {
    it(
      'should_handle_error_when_tracker_processing_fails',
      async () => {
        // ARRANGE
        const scheduleId = 'schedule_123';
        const guildId = mockGuildId;
        const error = new Error('Tracker processing failed');

        vi.mocked(mockGuildRepository.findById).mockResolvedValue(mockGuild);
        vi.mocked(mockRepository.create).mockResolvedValue(
          createMockSchedule({ id: scheduleId }),
        );
        vi.mocked(mockRepository.update).mockResolvedValue(
          createMockSchedule({ id: scheduleId }),
        );
        vi.mocked(
          mockTrackerService.processPendingTrackersForGuild,
        ).mockRejectedValue(error);

        // Get the execution callback
        await service.createSchedule(
          guildId,
          new Date(Date.now() + 86400000),
          mockUserId,
        );

        // Access the callback through the scheduler service call
        const scheduleJobCall = vi.mocked(mockSchedulerService.scheduleJob).mock
          .calls[0];
        const executeCallback = scheduleJobCall[2] as () => Promise<void>;

        // ACT & ASSERT
        await expect(executeCallback()).rejects.toThrow(
          'Tracker processing failed',
        );

        // Verify error was logged and status updated
        expect(mockRepository.update).toHaveBeenCalledWith(
          scheduleId,
          expect.objectContaining({
            status: ScheduledProcessingStatus.FAILED,
            errorMessage: 'Tracker processing failed',
          }),
        );
      },
      { timeout: 5000 },
    );

    it(
      'should_handle_error_when_repository_update_fails_during_execution',
      async () => {
        // ARRANGE
        const scheduleId = 'schedule_123';
        const guildId = mockGuildId;
        const updateError = new Error('Database update failed');

        vi.mocked(mockGuildRepository.findById).mockResolvedValue(mockGuild);
        vi.mocked(mockRepository.create).mockResolvedValue(
          createMockSchedule({ id: scheduleId }),
        );
        vi.mocked(mockRepository.update)
          .mockResolvedValueOnce(createMockSchedule({ id: scheduleId })) // First call succeeds
          .mockRejectedValueOnce(updateError); // Second call fails

        vi.mocked(
          mockTrackerService.processPendingTrackersForGuild,
        ).mockResolvedValue({
          processed: 0,
          trackers: [],
        });

        await service.createSchedule(
          guildId,
          new Date(Date.now() + 86400000),
          mockUserId,
        );

        const scheduleJobCall = vi.mocked(mockSchedulerService.scheduleJob).mock
          .calls[0];
        const executeCallback = scheduleJobCall[2] as () => Promise<void>;

        // ACT & ASSERT - Repository update failure should propagate
        await expect(executeCallback()).rejects.toThrow(
          'Database update failed',
        );
      },
      { timeout: 5000 },
    );
  });
});
