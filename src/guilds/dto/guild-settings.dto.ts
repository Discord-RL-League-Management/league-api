import {
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  Matches,
  Length,
  IsEnum,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

/**
 * Channel configuration with Discord ID validation
 */
export class ChannelConfigDto {
  @ApiPropertyOptional({
    description: 'Discord channel ID (17-20 digit snowflake)',
    example: '123456789012345678',
  })
  @IsString()
  @Matches(/^\d{17,20}$/, {
    message: 'Channel ID must be a valid Discord snowflake (17-20 digits)',
  })
  id!: string;

  @ApiPropertyOptional({
    description: 'Channel name',
    example: 'bot-commands',
  })
  @IsString()
  @Length(1, 100, {
    message: 'Channel name must be between 1 and 100 characters',
  })
  name!: string;
}

/**
 * MMR weights configuration DTO
 */
export class MmrWeightsDto {
  @ApiPropertyOptional({
    description: 'Weight for 1v1 MMR (0-1)',
    example: 0.1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  ones?: number;

  @ApiPropertyOptional({
    description: 'Weight for 2v2 MMR (0-1)',
    example: 0.3,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  twos?: number;

  @ApiPropertyOptional({
    description: 'Weight for 3v3 MMR (0-1)',
    example: 0.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  threes?: number;

  @ApiPropertyOptional({
    description: 'Weight for 4v4 MMR (0-1)',
    example: 0.1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  fours?: number;
}

/**
 * Minimum games played thresholds DTO
 */
export class MinGamesPlayedDto {
  @ApiPropertyOptional({
    description: 'Minimum games for 1v1',
    example: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  ones?: number;

  @ApiPropertyOptional({
    description: 'Minimum games for 2v2',
    example: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  twos?: number;

  @ApiPropertyOptional({
    description: 'Minimum games for 3v3',
    example: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  threes?: number;

  @ApiPropertyOptional({
    description: 'Minimum games for 4v4',
    example: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fours?: number;
}

/**
 * Ascendancy algorithm weights DTO
 */
export class AscendancyWeightsDto {
  @ApiProperty({
    description: 'Current MMR weight (Q) - typically 0.25',
    example: 0.25,
  })
  @IsNumber()
  @Min(0)
  current!: number;

  @ApiProperty({
    description: 'Peak MMR weight (R) - typically 0.75',
    example: 0.75,
  })
  @IsNumber()
  @Min(0)
  peak!: number;
}

/**
 * MMR calculation configuration DTO
 */
export class MmrCalculationConfigDto {
  @ApiProperty({
    description: 'MMR calculation algorithm',
    enum: ['WEIGHTED_AVERAGE', 'PEAK_MMR', 'CUSTOM', 'ASCENDANCY'],
    example: 'WEIGHTED_AVERAGE',
  })
  @IsEnum(['WEIGHTED_AVERAGE', 'PEAK_MMR', 'CUSTOM', 'ASCENDANCY'])
  algorithm!: 'WEIGHTED_AVERAGE' | 'PEAK_MMR' | 'CUSTOM' | 'ASCENDANCY';

  @ApiPropertyOptional({ type: MmrWeightsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MmrWeightsDto)
  weights?: MmrWeightsDto;

  @ApiPropertyOptional({ type: MinGamesPlayedDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MinGamesPlayedDto)
  minGamesPlayed?: MinGamesPlayedDto;

  @ApiPropertyOptional({
    description: 'Custom formula (required if algorithm is CUSTOM)',
    example: '(ones * 0.1 + twos * 0.3 + threes * 0.5 + fours * 0.1)',
  })
  @IsOptional()
  @IsString()
  customFormula?: string;

  @ApiPropertyOptional({
    type: AscendancyWeightsDto,
    description:
      'Ascendancy algorithm weights (defaults to current=0.25, peak=0.75 if not provided)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AscendancyWeightsDto)
  ascendancyWeights?: AscendancyWeightsDto;
}

/**
 * Main guild settings DTO
 */
export class GuildSettingsDto {
  @ApiPropertyOptional({
    type: [ChannelConfigDto],
    description:
      'Channels where bot listens for commands. Empty = all channels.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChannelConfigDto)
  bot_command_channels?: ChannelConfigDto[];

  @ApiPropertyOptional({
    type: [ChannelConfigDto],
    description:
      'Channels where /register command can be used. Empty = uses bot_command_channels or all channels.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChannelConfigDto)
  register_command_channels?: ChannelConfigDto[];

  @ApiPropertyOptional({ type: MmrCalculationConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MmrCalculationConfigDto)
  mmrCalculation?: MmrCalculationConfigDto;
}
