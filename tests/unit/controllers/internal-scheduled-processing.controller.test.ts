/**
 * InternalScheduledProcessingController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InternalScheduledProcessingController } from '@/internal/controllers/internal-scheduled-processing.controller';
import { ScheduledTrackerProcessingService } from '@/trackers/services/scheduled-tracker-processing.service';
import { ScheduleTrackerProcessingDto } from '@/internal/dto/schedule-tracker-processing.dto';
import { GetSchedulesQueryDto } from '@/internal/dto/get-schedules-query.dto';
import { ScheduledProcessingStatus } from '@prisma/client';
import { createMockLoggingService } from '@tests/utils/test-helpers';
import { ILoggingService } from '@/infrastructure/logging/interfaces/logging.interface';

describe('InternalScheduledProcessingController', () => {
  let controller: InternalScheduledProcessingController;
  let mockScheduledProcessingService: ScheduledTrackerProcessingService;

  const mockSchedule = {
    id: 'schedule-123',
    guildId: '987654321098765432',
    scheduledAt: new Date(Date.now() + 86400000), // +1 day
    createdBy: '123456789012345678',
    status: ScheduledProcessingStatus.PENDING,
    metadata: { reason: 'Season 15 start' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockScheduledProcessingService = {
      createSchedule: vi.fn(),
      getSchedulesForGuild: vi.fn(),
      cancelSchedule: vi.fn(),
    } as unknown as ScheduledTrackerProcessingService;

    const mockLoggingService = createMockLoggingService();

    const module = await Test.createTestingModule({
      controllers: [InternalScheduledProcessingController],
      providers: [
        {
          provide: ScheduledTrackerProcessingService,
          useValue: mockScheduledProcessingService,
        },
        {
          provide: ILoggingService,
          useValue: mockLoggingService,
        },
      ],
    }).compile();

    controller = module.get<InternalScheduledProcessingController>(
      InternalScheduledProcessingController,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('scheduleTrackerProcessing', () => {
    it('should_create_schedule_when_data_is_valid', async () => {
      const dto: ScheduleTrackerProcessingDto = {
        guildId: '987654321098765432',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        createdBy: '123456789012345678',
        metadata: { reason: 'Season 15 start' },
      };
      vi.mocked(
        mockScheduledProcessingService.createSchedule,
      ).mockResolvedValue(mockSchedule as never);

      const result = await controller.scheduleTrackerProcessing(dto);

      expect(result).toEqual(mockSchedule);
      expect(
        mockScheduledProcessingService.createSchedule,
      ).toHaveBeenCalledWith(
        dto.guildId,
        dto.scheduledAt,
        dto.createdBy,
        dto.metadata,
      );
    });

    it('should_return_schedule_when_service_succeeds', async () => {
      const dto: ScheduleTrackerProcessingDto = {
        guildId: '987654321098765432',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        createdBy: '123456789012345678',
      };
      const expectedSchedule = { ...mockSchedule, metadata: undefined };
      vi.mocked(
        mockScheduledProcessingService.createSchedule,
      ).mockResolvedValue(expectedSchedule as never);

      const result = await controller.scheduleTrackerProcessing(dto);

      expect(result).toEqual(expectedSchedule);
      expect(
        mockScheduledProcessingService.createSchedule,
      ).toHaveBeenCalledTimes(1);
    });

    it('should_throw_BadRequestException_when_date_is_in_past', async () => {
      const dto: ScheduleTrackerProcessingDto = {
        guildId: '987654321098765432',
        scheduledAt: new Date(Date.now() - 86400000).toISOString(), // -1 day (past)
        createdBy: '123456789012345678',
      };
      vi.mocked(
        mockScheduledProcessingService.createSchedule,
      ).mockRejectedValue(
        new BadRequestException('Scheduled date must be in the future'),
      );

      await expect(controller.scheduleTrackerProcessing(dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(
        mockScheduledProcessingService.createSchedule,
      ).toHaveBeenCalledWith(
        dto.guildId,
        dto.scheduledAt,
        dto.createdBy,
        undefined,
      );
    });

    it('should_throw_NotFoundException_when_guild_not_found', async () => {
      const dto: ScheduleTrackerProcessingDto = {
        guildId: '987654321098765432',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        createdBy: '123456789012345678',
      };
      vi.mocked(
        mockScheduledProcessingService.createSchedule,
      ).mockRejectedValue(
        new NotFoundException('Guild 987654321098765432 not found'),
      );

      await expect(controller.scheduleTrackerProcessing(dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(
        mockScheduledProcessingService.createSchedule,
      ).toHaveBeenCalledWith(
        dto.guildId,
        dto.scheduledAt,
        dto.createdBy,
        undefined,
      );
    });
  });

  describe('getSchedulesForGuild', () => {
    it('should_return_schedules_when_guild_exists', async () => {
      const guildId = '987654321098765432';
      const query: GetSchedulesQueryDto = {};
      const mockSchedules = [mockSchedule];
      vi.mocked(
        mockScheduledProcessingService.getSchedulesForGuild,
      ).mockResolvedValue(mockSchedules as never);

      const result = await controller.getSchedulesForGuild(guildId, query);

      expect(result).toEqual(mockSchedules);
      expect(
        mockScheduledProcessingService.getSchedulesForGuild,
      ).toHaveBeenCalledWith(guildId, {
        status: undefined,
        includeCompleted: undefined,
      });
    });

    it('should_call_service_with_status_filter_when_provided', async () => {
      const guildId = '987654321098765432';
      const query: GetSchedulesQueryDto = {
        status: ScheduledProcessingStatus.PENDING,
      };
      const mockSchedules = [mockSchedule];
      vi.mocked(
        mockScheduledProcessingService.getSchedulesForGuild,
      ).mockResolvedValue(mockSchedules as never);

      const result = await controller.getSchedulesForGuild(guildId, query);

      expect(result).toEqual(mockSchedules);
      expect(
        mockScheduledProcessingService.getSchedulesForGuild,
      ).toHaveBeenCalledWith(guildId, {
        status: ScheduledProcessingStatus.PENDING,
        includeCompleted: undefined,
      });
    });

    it('should_call_service_with_includeCompleted_filter_when_provided', async () => {
      const guildId = '987654321098765432';
      const query: GetSchedulesQueryDto = {
        includeCompleted: false,
      };
      const mockSchedules = [mockSchedule];
      vi.mocked(
        mockScheduledProcessingService.getSchedulesForGuild,
      ).mockResolvedValue(mockSchedules as never);

      const result = await controller.getSchedulesForGuild(guildId, query);

      expect(result).toEqual(mockSchedules);
      expect(
        mockScheduledProcessingService.getSchedulesForGuild,
      ).toHaveBeenCalledWith(guildId, {
        status: undefined,
        includeCompleted: false,
      });
    });

    it('should_return_empty_array_when_no_schedules_exist', async () => {
      const guildId = '987654321098765432';
      const query: GetSchedulesQueryDto = {};
      vi.mocked(
        mockScheduledProcessingService.getSchedulesForGuild,
      ).mockResolvedValue([] as never);

      const result = await controller.getSchedulesForGuild(guildId, query);

      expect(result).toEqual([]);
      expect(
        mockScheduledProcessingService.getSchedulesForGuild,
      ).toHaveBeenCalledWith(guildId, {
        status: undefined,
        includeCompleted: undefined,
      });
    });

    it('should_call_service_with_both_filters_when_provided', async () => {
      const guildId = '987654321098765432';
      const query: GetSchedulesQueryDto = {
        status: ScheduledProcessingStatus.COMPLETED,
        includeCompleted: true,
      };
      const mockSchedules = [mockSchedule];
      vi.mocked(
        mockScheduledProcessingService.getSchedulesForGuild,
      ).mockResolvedValue(mockSchedules as never);

      const result = await controller.getSchedulesForGuild(guildId, query);

      expect(result).toEqual(mockSchedules);
      expect(
        mockScheduledProcessingService.getSchedulesForGuild,
      ).toHaveBeenCalledWith(guildId, {
        status: ScheduledProcessingStatus.COMPLETED,
        includeCompleted: true,
      });
    });
  });

  describe('cancelSchedule', () => {
    it('should_cancel_schedule_when_schedule_exists', async () => {
      const scheduleId = 'schedule-123';
      const cancelledSchedule = {
        ...mockSchedule,
        status: ScheduledProcessingStatus.CANCELLED,
      };
      vi.mocked(
        mockScheduledProcessingService.cancelSchedule,
      ).mockResolvedValue(cancelledSchedule as never);

      const result = await controller.cancelSchedule(scheduleId);

      expect(result).toEqual(cancelledSchedule);
      expect(
        mockScheduledProcessingService.cancelSchedule,
      ).toHaveBeenCalledWith(scheduleId);
    });

    it('should_throw_BadRequestException_when_schedule_not_pending', async () => {
      const scheduleId = 'schedule-123';
      vi.mocked(
        mockScheduledProcessingService.cancelSchedule,
      ).mockRejectedValue(
        new BadRequestException('Cannot cancel schedule with status COMPLETED'),
      );

      await expect(controller.cancelSchedule(scheduleId)).rejects.toThrow(
        BadRequestException,
      );
      expect(
        mockScheduledProcessingService.cancelSchedule,
      ).toHaveBeenCalledWith(scheduleId);
    });

    it('should_throw_NotFoundException_when_schedule_not_found', async () => {
      const scheduleId = 'schedule-999';
      vi.mocked(
        mockScheduledProcessingService.cancelSchedule,
      ).mockRejectedValue(
        new NotFoundException('Schedule schedule-999 not found'),
      );

      await expect(controller.cancelSchedule(scheduleId)).rejects.toThrow(
        NotFoundException,
      );
      expect(
        mockScheduledProcessingService.cancelSchedule,
      ).toHaveBeenCalledWith(scheduleId);
    });
  });
});
