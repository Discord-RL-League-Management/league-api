import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MatchStatus } from '@prisma/client';

export class UpdateMatchStatusDto {
  @ApiProperty({
    description: 'Match status',
    enum: MatchStatus,
    example: MatchStatus.IN_PROGRESS,
  })
  @IsEnum(MatchStatus, {
    message: 'Status must be a valid MatchStatus enum value',
  })
  @IsNotEmpty()
  status!: MatchStatus;
}


