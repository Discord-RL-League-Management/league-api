import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsObject,
  Matches,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ScheduleTrackerProcessingDto {
  @ApiProperty({
    description: 'Discord guild ID (snowflake)',
    example: '987654321098765432',
    minLength: 17,
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{17,20}$/, {
    message: 'Guild ID must be a valid Discord snowflake ID (17-20 digits)',
  })
  @Length(17, 20)
  guildId!: string;

  @ApiProperty({
    description: 'When to process trackers (ISO 8601 date string)',
    example: '2025-01-15T10:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  scheduledAt!: string;

  @ApiProperty({
    description: 'Discord user ID who created the schedule (snowflake)',
    example: '123456789012345678',
    minLength: 17,
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{17,20}$/, {
    message: 'User ID must be a valid Discord snowflake ID (17-20 digits)',
  })
  @Length(17, 20)
  createdBy!: string;

  @ApiPropertyOptional({
    description: 'Optional metadata (e.g., reason, season info)',
    example: { reason: 'Season 15 start', seasonNumber: 15 },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
