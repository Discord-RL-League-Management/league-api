import {
  IsString,
  IsOptional,
  IsObject,
  ValidateNested,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * TrackerDataDto - Tracker data for formula testing
 */
export class TrackerDataDto {
  @ApiPropertyOptional({ description: '1v1 MMR', example: 1200 })
  @IsOptional()
  @IsInt()
  @Min(0)
  ones?: number;

  @ApiPropertyOptional({ description: '2v2 MMR', example: 1400 })
  @IsOptional()
  @IsInt()
  @Min(0)
  twos?: number;

  @ApiPropertyOptional({ description: '3v3 MMR', example: 1600 })
  @IsOptional()
  @IsInt()
  @Min(0)
  threes?: number;

  @ApiPropertyOptional({ description: '4v4 MMR', example: 1000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  fours?: number;

  @ApiPropertyOptional({ description: '1v1 games played', example: 150 })
  @IsOptional()
  @IsInt()
  @Min(0)
  onesGamesPlayed?: number;

  @ApiPropertyOptional({ description: '2v2 games played', example: 300 })
  @IsOptional()
  @IsInt()
  @Min(0)
  twosGamesPlayed?: number;

  @ApiPropertyOptional({ description: '3v3 games played', example: 500 })
  @IsOptional()
  @IsInt()
  @Min(0)
  threesGamesPlayed?: number;

  @ApiPropertyOptional({ description: '4v4 games played', example: 50 })
  @IsOptional()
  @IsInt()
  @Min(0)
  foursGamesPlayed?: number;
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
