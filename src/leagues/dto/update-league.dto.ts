import { PartialType } from '@nestjs/swagger';
import { CreateLeagueDto } from './create-league.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { LeagueStatus } from '@prisma/client';

export class UpdateLeagueDto extends PartialType(CreateLeagueDto) {
  @ApiPropertyOptional({
    description: 'League status',
    enum: LeagueStatus,
    example: LeagueStatus.PAUSED,
  })
  @IsOptional()
  @IsEnum(LeagueStatus, {
    message: 'Status must be a valid LeagueStatus enum value',
  })
  status?: LeagueStatus;
}


