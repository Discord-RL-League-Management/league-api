import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LeagueStatus } from '@prisma/client';

export class UpdateLeagueStatusDto {
  @ApiProperty({
    description: 'League status',
    enum: LeagueStatus,
    example: LeagueStatus.ACTIVE,
  })
  @IsEnum(LeagueStatus, {
    message: 'Status must be a valid LeagueStatus enum value',
  })
  @IsNotEmpty()
  status!: LeagueStatus;
}


