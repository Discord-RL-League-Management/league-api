import { IsArray, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class BatchRefreshDto {
  @ApiPropertyOptional({
    description: 'Array of tracker IDs to refresh. If not provided, all trackers will be refreshed.',
    example: ['clx1234567890abcdef', 'clx9876543210fedcba'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  trackerIds?: string[];
}

