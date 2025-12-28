import { describe, it, expect, afterEach, vi } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { GetSchedulesQueryDto } from '../../../src/internal/dto/get-schedules-query.dto';
import { ScheduledProcessingStatus } from '@prisma/client';

describe('GetSchedulesQueryDto', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('should_validate_status_enum_when_provided', () => {
    it('should_accept_valid_status_enum', async () => {
      // ARRANGE
      const dto = plainToInstance(GetSchedulesQueryDto, {
        status: ScheduledProcessingStatus.PENDING,
      });

      // ACT
      const errors = await validate(dto);

      // ASSERT
      expect(errors).toHaveLength(0);
      expect(dto.status).toBe(ScheduledProcessingStatus.PENDING);
    });

    it('should_accept_all_valid_status_values', async () => {
      // ARRANGE
      const validStatuses = [
        ScheduledProcessingStatus.PENDING,
        ScheduledProcessingStatus.COMPLETED,
        ScheduledProcessingStatus.CANCELLED,
        ScheduledProcessingStatus.FAILED,
      ];

      // ACT & ASSERT
      for (const status of validStatuses) {
        const dto = plainToInstance(GetSchedulesQueryDto, { status });
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
        expect(dto.status).toBe(status);
      }
    });

    it('should_reject_invalid_status_value', async () => {
      // ARRANGE
      const dto = plainToInstance(GetSchedulesQueryDto, {
        status: 'INVALID_STATUS',
      });

      // ACT
      const errors = await validate(dto);

      // ASSERT
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe('status');
      expect(errors[0]?.constraints).toHaveProperty('isEnum');
    });
  });

  describe('should_validate_includeCompleted_boolean_when_provided', () => {
    it('should_accept_boolean_true', async () => {
      // ARRANGE
      const dto = plainToInstance(GetSchedulesQueryDto, {
        includeCompleted: true,
      });

      // ACT
      const errors = await validate(dto);

      // ASSERT
      expect(errors).toHaveLength(0);
      expect(dto.includeCompleted).toBe(true);
    });

    it('should_accept_boolean_false', async () => {
      // ARRANGE
      const dto = plainToInstance(GetSchedulesQueryDto, {
        includeCompleted: false,
      });

      // ACT
      const errors = await validate(dto);

      // ASSERT
      expect(errors).toHaveLength(0);
      expect(dto.includeCompleted).toBe(false);
    });

    it('should_transform_string_true_to_boolean', async () => {
      // ARRANGE
      const dto = plainToInstance(GetSchedulesQueryDto, {
        includeCompleted: 'true',
      });

      // ACT
      const errors = await validate(dto);

      // ASSERT
      expect(errors).toHaveLength(0);
      expect(dto.includeCompleted).toBe(true);
    });

    it('should_transform_string_1_to_boolean', async () => {
      // ARRANGE
      const dto = plainToInstance(GetSchedulesQueryDto, {
        includeCompleted: '1',
      });

      // ACT
      const errors = await validate(dto);

      // ASSERT
      expect(errors).toHaveLength(0);
      expect(dto.includeCompleted).toBe(true);
    });

    it('should_transform_string_false_to_boolean', async () => {
      // ARRANGE
      const dto = plainToInstance(GetSchedulesQueryDto, {
        includeCompleted: 'false',
      });

      // ACT
      const errors = await validate(dto);

      // ASSERT
      expect(errors).toHaveLength(0);
      expect(dto.includeCompleted).toBe(false);
    });

    it('should_handle_undefined_values', async () => {
      // ARRANGE
      const dto = plainToInstance(GetSchedulesQueryDto, {});

      // ACT
      const errors = await validate(dto);

      // ASSERT
      expect(errors).toHaveLength(0);
      expect(dto.status).toBeUndefined();
      expect(dto.includeCompleted).toBeUndefined();
    });

    it('should_handle_null_values', async () => {
      // ARRANGE
      const dto = plainToInstance(GetSchedulesQueryDto, {
        status: null,
        includeCompleted: null,
      });

      // ACT
      const errors = await validate(dto);

      // ASSERT
      expect(errors).toHaveLength(0);
      expect(dto.status).toBeNull();
      expect(dto.includeCompleted).toBeUndefined(); // Transform converts null to undefined
    });
  });

  describe('should_accept_combined_parameters', () => {
    it('should_validate_both_status_and_includeCompleted', async () => {
      // ARRANGE
      const dto = plainToInstance(GetSchedulesQueryDto, {
        status: ScheduledProcessingStatus.COMPLETED,
        includeCompleted: true,
      });

      // ACT
      const errors = await validate(dto);

      // ASSERT
      expect(errors).toHaveLength(0);
      expect(dto.status).toBe(ScheduledProcessingStatus.COMPLETED);
      expect(dto.includeCompleted).toBe(true);
    });

    it('should_accept_only_status', async () => {
      // ARRANGE
      const dto = plainToInstance(GetSchedulesQueryDto, {
        status: ScheduledProcessingStatus.PENDING,
      });

      // ACT
      const errors = await validate(dto);

      // ASSERT
      expect(errors).toHaveLength(0);
      expect(dto.status).toBe(ScheduledProcessingStatus.PENDING);
      expect(dto.includeCompleted).toBeUndefined();
    });

    it('should_accept_only_includeCompleted', async () => {
      // ARRANGE
      const dto = plainToInstance(GetSchedulesQueryDto, {
        includeCompleted: false,
      });

      // ACT
      const errors = await validate(dto);

      // ASSERT
      expect(errors).toHaveLength(0);
      expect(dto.status).toBeUndefined();
      expect(dto.includeCompleted).toBe(false);
    });
  });
});
