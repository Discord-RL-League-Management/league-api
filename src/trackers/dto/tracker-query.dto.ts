import {
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { GamePlatform, TrackerScrapingStatus } from '@prisma/client';

/**
 * Query DTO for getting trackers with filtering, sorting, and pagination
 * Single Responsibility: Validate and transform query parameters for tracker retrieval
 */
export class TrackerQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by platform (single value or comma-separated array)',
    enum: GamePlatform,
    example: GamePlatform.STEAM,
  })
  @IsOptional()
  @Transform(({ value }): GamePlatform | GamePlatform[] | undefined => {
    if (!value) return undefined;
    if (Array.isArray(value)) return value as GamePlatform[];
    if (typeof value === 'string') {
      // Handle comma-separated values
      const values = value.split(',').map((v) => v.trim()) as GamePlatform[];
      return values.length === 1 ? values[0] : values;
    }
    return value as GamePlatform;
  })
  @IsEnum(GamePlatform, { each: true })
  platform?: GamePlatform | GamePlatform[];

  @ApiPropertyOptional({
    description:
      'Filter by scraping status (single value or comma-separated array)',
    enum: TrackerScrapingStatus,
    example: TrackerScrapingStatus.COMPLETED,
  })
  @IsOptional()
  @Transform(
    ({
      value,
    }): TrackerScrapingStatus | TrackerScrapingStatus[] | undefined => {
      if (!value) return undefined;
      if (Array.isArray(value)) return value as TrackerScrapingStatus[];
      if (typeof value === 'string') {
        // Handle comma-separated values
        const values = value
          .split(',')
          .map((v) => v.trim()) as TrackerScrapingStatus[];
        return values.length === 1 ? values[0] : values;
      }
      return value as TrackerScrapingStatus;
    },
  )
  @IsEnum(TrackerScrapingStatus, { each: true })
  status?: TrackerScrapingStatus | TrackerScrapingStatus[];

  @ApiPropertyOptional({
    description: 'Filter by active status',
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
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    type: Number,
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page (max 100)',
    type: Number,
    example: 50,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: ['createdAt', 'updatedAt', 'lastScrapedAt'],
    example: 'createdAt',
  })
  @IsOptional()
  @IsEnum(['createdAt', 'updatedAt', 'lastScrapedAt'])
  sortBy?: 'createdAt' | 'updatedAt' | 'lastScrapedAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
