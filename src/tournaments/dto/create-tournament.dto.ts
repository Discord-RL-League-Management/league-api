import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTournamentDto {
  @ApiProperty({ description: 'League ID (CUID)' })
  @IsString()
  leagueId!: string;

  @ApiProperty({ description: 'Tournament name' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Format' })
  @IsOptional()
  @IsString()
  format?: string;

  @ApiPropertyOptional({ description: 'Start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Max participants' })
  @IsOptional()
  @IsNumber()
  maxParticipants?: number;
}
