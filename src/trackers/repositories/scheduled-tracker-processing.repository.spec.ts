/**
 * ScheduledTrackerProcessingRepository Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ScheduledTrackerProcessingRepository } from './scheduled-tracker-processing.repository';
import { PrismaService } from '@/prisma/prisma.service';
import {
  ScheduledTrackerProcessing,
  ScheduledProcessingStatus,
  Prisma,
} from '@prisma/client';

describe('ScheduledTrackerProcessingRepository', () => {
  let repository: ScheduledTrackerProcessingRepository;
  let mockPrisma: PrismaService;

  const mockScheduledProcessing: ScheduledTrackerProcessing = {
    id: 'schedule-123',
    guildId: 'guild-123',
    scheduledAt: new Date('2024-01-01'),
    createdBy: 'user-123',
    status: ScheduledProcessingStatus.PENDING,
    executedAt: null,
    errorMessage: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrisma = {
      scheduledTrackerProcessing: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    } as unknown as PrismaService;

    repository = new ScheduledTrackerProcessingRepository(mockPrisma);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('create', () => {
    it('should_create_schedule_when_status_provided', async () => {
      const createData = {
        guildId: 'guild-123',
        scheduledAt: new Date('2024-01-01'),
        createdBy: 'user-123',
        status: ScheduledProcessingStatus.COMPLETED,
      };
      const createdSchedule = {
        ...mockScheduledProcessing,
        status: ScheduledProcessingStatus.COMPLETED,
      };
      vi.mocked(mockPrisma.scheduledTrackerProcessing.create).mockResolvedValue(
        createdSchedule as never,
      );

      const result = await repository.create(createData);

      expect(result).toEqual(createdSchedule);
      expect(result.status).toBe(ScheduledProcessingStatus.COMPLETED);
      expect(mockPrisma.scheduledTrackerProcessing.create).toHaveBeenCalledWith(
        {
          data: {
            ...createData,
            status: ScheduledProcessingStatus.COMPLETED,
          },
        },
      );
    });

    it('should_create_schedule_when_status_not_provided', async () => {
      const createData = {
        guildId: 'guild-123',
        scheduledAt: new Date('2024-01-01'),
        createdBy: 'user-123',
      };
      vi.mocked(mockPrisma.scheduledTrackerProcessing.create).mockResolvedValue(
        mockScheduledProcessing as never,
      );

      const result = await repository.create(createData);

      expect(result).toEqual(mockScheduledProcessing);
      expect(result.status).toBe(ScheduledProcessingStatus.PENDING);
      expect(mockPrisma.scheduledTrackerProcessing.create).toHaveBeenCalledWith(
        {
          data: {
            ...createData,
            status: ScheduledProcessingStatus.PENDING,
          },
        },
      );
    });

    it('should_create_schedule_when_metadata_provided', async () => {
      const createData = {
        guildId: 'guild-123',
        scheduledAt: new Date('2024-01-01'),
        createdBy: 'user-123',
        metadata: { priority: 'high' } as Prisma.InputJsonValue,
      };
      const createdSchedule = {
        ...mockScheduledProcessing,
        metadata: { priority: 'high' },
      };
      vi.mocked(mockPrisma.scheduledTrackerProcessing.create).mockResolvedValue(
        createdSchedule as never,
      );

      const result = await repository.create(createData);

      expect(result).toEqual(createdSchedule);
      expect(result.metadata).toEqual({ priority: 'high' });
    });

    it('should_create_schedule_when_status_and_metadata_provided', async () => {
      const createData = {
        guildId: 'guild-123',
        scheduledAt: new Date('2024-01-01'),
        createdBy: 'user-123',
        status: ScheduledProcessingStatus.PENDING,
        metadata: { priority: 'high' } as Prisma.InputJsonValue,
      };
      const createdSchedule = {
        ...mockScheduledProcessing,
        metadata: { priority: 'high' },
      };
      vi.mocked(mockPrisma.scheduledTrackerProcessing.create).mockResolvedValue(
        createdSchedule as never,
      );

      const result = await repository.create(createData);

      expect(result).toEqual(createdSchedule);
      expect(result.status).toBe(ScheduledProcessingStatus.PENDING);
      expect(result.metadata).toEqual({ priority: 'high' });
    });
  });

  describe('findById', () => {
    it('should_return_schedule_when_schedule_exists', async () => {
      vi.mocked(
        mockPrisma.scheduledTrackerProcessing.findUnique,
      ).mockResolvedValue(mockScheduledProcessing as never);

      const result = await repository.findById('schedule-123');

      expect(result).toEqual(mockScheduledProcessing);
      expect(
        mockPrisma.scheduledTrackerProcessing.findUnique,
      ).toHaveBeenCalledWith({
        where: { id: 'schedule-123' },
      });
    });

    it('should_return_null_when_schedule_not_found', async () => {
      vi.mocked(
        mockPrisma.scheduledTrackerProcessing.findUnique,
      ).mockResolvedValue(null);

      const result = await repository.findById('schedule-999');

      expect(result).toBeNull();
    });
  });

  describe('findMany', () => {
    it('should_return_schedules_when_status_filter_provided', async () => {
      const schedules = [mockScheduledProcessing];
      vi.mocked(
        mockPrisma.scheduledTrackerProcessing.findMany,
      ).mockResolvedValue(schedules as never);

      const result = await repository.findMany({
        guildId: 'guild-123',
        status: ScheduledProcessingStatus.PENDING,
      });

      expect(result).toEqual(schedules);
      expect(
        mockPrisma.scheduledTrackerProcessing.findMany,
      ).toHaveBeenCalledWith({
        where: {
          guildId: 'guild-123',
          status: ScheduledProcessingStatus.PENDING,
        },
        orderBy: { scheduledAt: 'asc' },
      });
    });

    it('should_return_schedules_when_status_not_provided', async () => {
      const schedules = [mockScheduledProcessing];
      vi.mocked(
        mockPrisma.scheduledTrackerProcessing.findMany,
      ).mockResolvedValue(schedules as never);

      const result = await repository.findMany({
        guildId: 'guild-123',
      });

      expect(result).toEqual(schedules);
      expect(
        mockPrisma.scheduledTrackerProcessing.findMany,
      ).toHaveBeenCalledWith({
        where: {
          guildId: 'guild-123',
        },
        orderBy: { scheduledAt: 'asc' },
      });
    });

    it('should_return_schedules_when_status_not_filter_provided', async () => {
      const schedules = [mockScheduledProcessing];
      vi.mocked(
        mockPrisma.scheduledTrackerProcessing.findMany,
      ).mockResolvedValue(schedules as never);

      const result = await repository.findMany({
        guildId: 'guild-123',
        status: { not: ScheduledProcessingStatus.COMPLETED },
      });

      expect(result).toEqual(schedules);
      expect(
        mockPrisma.scheduledTrackerProcessing.findMany,
      ).toHaveBeenCalledWith({
        where: {
          guildId: 'guild-123',
          status: { not: ScheduledProcessingStatus.COMPLETED },
        },
        orderBy: { scheduledAt: 'asc' },
      });
    });

    it('should_return_empty_array_when_no_schedules_exist', async () => {
      vi.mocked(
        mockPrisma.scheduledTrackerProcessing.findMany,
      ).mockResolvedValue([] as never);

      const result = await repository.findMany({
        guildId: 'guild-123',
      });

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('findPending', () => {
    it('should_return_pending_schedules_when_pending_schedules_exist', async () => {
      const schedules = [mockScheduledProcessing];
      vi.mocked(
        mockPrisma.scheduledTrackerProcessing.findMany,
      ).mockResolvedValue(schedules as never);

      const result = await repository.findPending();

      expect(result).toEqual(schedules);
      expect(
        mockPrisma.scheduledTrackerProcessing.findMany,
      ).toHaveBeenCalledWith({
        where: {
          status: ScheduledProcessingStatus.PENDING,
        },
        orderBy: { scheduledAt: 'asc' },
      });
    });

    it('should_return_empty_array_when_no_pending_schedules_exist', async () => {
      vi.mocked(
        mockPrisma.scheduledTrackerProcessing.findMany,
      ).mockResolvedValue([] as never);

      const result = await repository.findPending();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('should_update_schedule_when_status_provided', async () => {
      const updateData = {
        status: ScheduledProcessingStatus.COMPLETED,
      };
      const updatedSchedule = {
        ...mockScheduledProcessing,
        status: ScheduledProcessingStatus.COMPLETED,
      };
      vi.mocked(mockPrisma.scheduledTrackerProcessing.update).mockResolvedValue(
        updatedSchedule as never,
      );

      const result = await repository.update('schedule-123', updateData);

      expect(result).toEqual(updatedSchedule);
      expect(result.status).toBe(ScheduledProcessingStatus.COMPLETED);
      expect(mockPrisma.scheduledTrackerProcessing.update).toHaveBeenCalledWith(
        {
          where: { id: 'schedule-123' },
          data: updateData,
        },
      );
    });

    it('should_update_schedule_when_executedAt_provided', async () => {
      const executedAt = new Date('2024-01-01');
      const updateData = {
        executedAt,
      };
      const updatedSchedule = {
        ...mockScheduledProcessing,
        executedAt,
      };
      vi.mocked(mockPrisma.scheduledTrackerProcessing.update).mockResolvedValue(
        updatedSchedule as never,
      );

      const result = await repository.update('schedule-123', updateData);

      expect(result).toEqual(updatedSchedule);
      expect(result.executedAt).toEqual(executedAt);
    });

    it('should_update_schedule_when_executedAt_set_to_null', async () => {
      const updateData = {
        executedAt: null,
      };
      const updatedSchedule = {
        ...mockScheduledProcessing,
        executedAt: null,
      };
      vi.mocked(mockPrisma.scheduledTrackerProcessing.update).mockResolvedValue(
        updatedSchedule as never,
      );

      const result = await repository.update('schedule-123', updateData);

      expect(result).toEqual(updatedSchedule);
      expect(result.executedAt).toBeNull();
    });

    it('should_update_schedule_when_errorMessage_provided', async () => {
      const updateData = {
        errorMessage: 'Processing failed',
      };
      const updatedSchedule = {
        ...mockScheduledProcessing,
        errorMessage: 'Processing failed',
      };
      vi.mocked(mockPrisma.scheduledTrackerProcessing.update).mockResolvedValue(
        updatedSchedule as never,
      );

      const result = await repository.update('schedule-123', updateData);

      expect(result).toEqual(updatedSchedule);
      expect(result.errorMessage).toBe('Processing failed');
    });

    it('should_update_schedule_when_metadata_provided', async () => {
      const updateData = {
        metadata: { updated: true } as Prisma.InputJsonValue,
      };
      const updatedSchedule = {
        ...mockScheduledProcessing,
        metadata: { updated: true },
      };
      vi.mocked(mockPrisma.scheduledTrackerProcessing.update).mockResolvedValue(
        updatedSchedule as never,
      );

      const result = await repository.update('schedule-123', updateData);

      expect(result).toEqual(updatedSchedule);
      expect(result.metadata).toEqual({ updated: true });
    });

    it('should_update_schedule_when_multiple_fields_provided', async () => {
      const updateData = {
        status: ScheduledProcessingStatus.COMPLETED,
        executedAt: new Date('2024-01-01'),
        metadata: { completed: true } as Prisma.InputJsonValue,
      };
      const updatedSchedule = {
        ...mockScheduledProcessing,
        ...updateData,
      };
      vi.mocked(mockPrisma.scheduledTrackerProcessing.update).mockResolvedValue(
        updatedSchedule as never,
      );

      const result = await repository.update('schedule-123', updateData);

      expect(result).toEqual(updatedSchedule);
      expect(result.status).toBe(ScheduledProcessingStatus.COMPLETED);
      expect(result.executedAt).toEqual(updateData.executedAt);
      expect(result.metadata).toEqual({ completed: true });
    });
  });

  describe('delete', () => {
    it('should_delete_schedule_when_schedule_exists', async () => {
      vi.mocked(mockPrisma.scheduledTrackerProcessing.delete).mockResolvedValue(
        mockScheduledProcessing as never,
      );

      const result = await repository.delete('schedule-123');

      expect(result).toEqual(mockScheduledProcessing);
      expect(mockPrisma.scheduledTrackerProcessing.delete).toHaveBeenCalledWith(
        {
          where: { id: 'schedule-123' },
        },
      );
    });
  });
});
