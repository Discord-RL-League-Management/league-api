import { IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TrackerDataDto } from './test-formula.dto';

/**
 * CalculateMmrDto - DTO for calculating MMR using guild configuration
 */
export class CalculateMmrDto {
  @ApiProperty({
    description: 'Guild ID to use for MMR calculation configuration',
    example: '123456789012345678',
  })
  @IsString()
  guildId!: string;

  @ApiProperty({
    type: TrackerDataDto,
    description: 'Tracker data to calculate MMR from',
  })
  @ValidateNested()
  @Type(() => TrackerDataDto)
  trackerData!: TrackerDataDto;
}
