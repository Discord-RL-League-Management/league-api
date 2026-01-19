import { IsString, ValidateNested, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TrackerDataDto, AscendancyDataDto } from './test-formula.dto';

/**
 * CalculateMmrDto - DTO for calculating MMR using guild configuration
 *
 * Supports two data structures:
 * - trackerData: For WEIGHTED_AVERAGE, PEAK_MMR, and CUSTOM algorithms
 * - ascendancyData: For ASCENDANCY algorithm (requires 2v2 and 3v3 data from current and previous seasons)
 *
 * Exactly one of trackerData or ascendancyData must be provided.
 */
export class CalculateMmrDto {
  @ApiProperty({
    description: 'Guild ID to use for MMR calculation configuration',
    example: '123456789012345678',
  })
  @IsString()
  guildId!: string;

  @ApiPropertyOptional({
    type: TrackerDataDto,
    description:
      'Tracker data for WEIGHTED_AVERAGE, PEAK_MMR, or CUSTOM algorithms',
  })
  @ValidateIf((o: CalculateMmrDto) => !o.ascendancyData)
  @ValidateNested()
  @Type(() => TrackerDataDto)
  trackerData?: TrackerDataDto;

  @ApiPropertyOptional({
    type: AscendancyDataDto,
    description:
      'Ascendancy data for ASCENDANCY algorithm (requires 2v2 and 3v3 data from current and previous seasons)',
  })
  @ValidateIf((o: CalculateMmrDto) => !o.trackerData)
  @ValidateNested()
  @Type(() => AscendancyDataDto)
  ascendancyData?: AscendancyDataDto;
}
