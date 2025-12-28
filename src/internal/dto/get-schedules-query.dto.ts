import { IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ScheduledProcessingStatus } from '@prisma/client';

/**
 * Query DTO for getting scheduled tracker processing jobs
 * Single Responsibility: Validate and transform query parameters for schedule retrieval
 */
export class GetSchedulesQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by schedule status',
    enum: ScheduledProcessingStatus,
    example: ScheduledProcessingStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(ScheduledProcessingStatus)
  status?: ScheduledProcessingStatus;

  @ApiPropertyOptional({
    description:
      'Include completed schedules (default: true). Ignored if status is provided.',
    type: Boolean,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (typeof value === 'string') {
      return value === 'true' || value === '1';
    }
    return Boolean(value);
  })
  includeCompleted?: boolean;
}
