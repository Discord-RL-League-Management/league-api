import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMatchDto {
  @ApiProperty({ description: 'League ID (CUID)' })
  @IsString()
  leagueId!: string;

  @ApiPropertyOptional({ description: 'Tournament ID (CUID)' })
  @IsOptional()
  @IsString()
  tournamentId?: string;

  @ApiPropertyOptional({ description: 'Round number' })
  @IsOptional()
  @IsNumber()
  round?: number;

  @ApiPropertyOptional({ description: 'Scheduled date/time' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}


