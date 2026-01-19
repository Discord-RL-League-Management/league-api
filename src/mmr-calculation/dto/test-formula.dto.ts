import {
  IsString,
  IsOptional,
  ValidateNested,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * TrackerDataDto - Tracker data for formula testing
 *
 * Used for WEIGHTED_AVERAGE, PEAK_MMR, and CUSTOM algorithms.
 * For ASCENDANCY algorithm, use AscendancyDataDto instead which requires
 * 2v2 and 3v3 data from both current and previous seasons.
 */
export class TrackerDataDto {
  @ApiPropertyOptional({
    description: '1v1 MMR (not used by ASCENDANCY algorithm)',
    example: 1200,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  ones?: number;

  @ApiPropertyOptional({
    description: '2v2 MMR (required for ASCENDANCY algorithm)',
    example: 1400,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  twos?: number;

  @ApiPropertyOptional({
    description: '3v3 MMR (required for ASCENDANCY algorithm)',
    example: 1600,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  threes?: number;

  @ApiPropertyOptional({
    description: '4v4 MMR (not used by ASCENDANCY algorithm)',
    example: 1000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  fours?: number;

  @ApiPropertyOptional({
    description: '1v1 games played (not used by ASCENDANCY algorithm)',
    example: 150,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  onesGamesPlayed?: number;

  @ApiPropertyOptional({
    description: '2v2 games played (required for ASCENDANCY algorithm)',
    example: 300,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  twosGamesPlayed?: number;

  @ApiPropertyOptional({
    description: '3v3 games played (required for ASCENDANCY algorithm)',
    example: 500,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  threesGamesPlayed?: number;

  @ApiPropertyOptional({
    description: '4v4 games played (not used by ASCENDANCY algorithm)',
    example: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  foursGamesPlayed?: number;

  @ApiPropertyOptional({
    description: '1v1 Peak MMR (not used by ASCENDANCY algorithm)',
    example: 1300,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  onesPeak?: number;

  @ApiPropertyOptional({
    description: '2v2 Peak MMR (required for ASCENDANCY algorithm)',
    example: 1500,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  twosPeak?: number;

  @ApiPropertyOptional({
    description: '3v3 Peak MMR (required for ASCENDANCY algorithm)',
    example: 1700,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  threesPeak?: number;

  @ApiPropertyOptional({
    description: '4v4 Peak MMR (not used by ASCENDANCY algorithm)',
    example: 1100,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  foursPeak?: number;
}

/**
 * AscendancyDataDto - DTO for ASCENDANCY algorithm MMR calculation
 *
 * This DTO matches the AscendancyData interface structure and is used specifically
 * for ASCENDANCY algorithm calculations. ASCENDANCY only uses 2v2 and 3v3 data
 * from both current and previous seasons (not 1v1 or 4v4).
 *
 * All fields are required as the ASCENDANCY algorithm needs complete data
 * from both current and previous seasons to calculate bracket percentages.
 */
export class AscendancyDataDto {
  @ApiProperty({ description: '2v2 Current MMR', example: 1400 })
  @IsInt()
  @Min(0)
  mmr2sCurrent!: number;

  @ApiProperty({ description: '2v2 Peak MMR', example: 1500 })
  @IsInt()
  @Min(0)
  mmr2sPeak!: number;

  @ApiProperty({
    description: '2v2 games played in current season',
    example: 300,
  })
  @IsInt()
  @Min(0)
  games2sCurrSeason!: number;

  @ApiProperty({
    description: '2v2 games played in previous season',
    example: 200,
  })
  @IsInt()
  @Min(0)
  games2sPrevSeason!: number;

  @ApiProperty({ description: '3v3 Current MMR', example: 1600 })
  @IsInt()
  @Min(0)
  mmr3sCurrent!: number;

  @ApiProperty({ description: '3v3 Peak MMR', example: 1700 })
  @IsInt()
  @Min(0)
  mmr3sPeak!: number;

  @ApiProperty({
    description: '3v3 games played in current season',
    example: 500,
  })
  @IsInt()
  @Min(0)
  games3sCurrSeason!: number;

  @ApiProperty({
    description: '3v3 games played in previous season',
    example: 150,
  })
  @IsInt()
  @Min(0)
  games3sPrevSeason!: number;
}

/**
 * TestFormulaDto - DTO for testing formulas
 */
export class TestFormulaDto {
  @ApiProperty({
    description: 'Custom MMR formula to test',
    example: '(ones * 0.1 + twos * 0.3 + threes * 0.5 + fours * 0.1)',
  })
  @IsString()
  formula!: string;

  @ApiPropertyOptional({
    type: TrackerDataDto,
    description:
      'Optional test data. If not provided, uses default sample data.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TrackerDataDto)
  testData?: TrackerDataDto;
}
