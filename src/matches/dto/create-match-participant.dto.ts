import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MatchParticipantType } from '@prisma/client';

export class CreateMatchParticipantDto {
  @ApiProperty({ description: 'Player ID (CUID)' })
  @IsString()
  playerId!: string;

  @ApiPropertyOptional({ description: 'Team ID (CUID)' })
  @IsOptional()
  @IsString()
  teamId?: string;

  @ApiPropertyOptional({ description: 'Team member ID (CUID)' })
  @IsOptional()
  @IsString()
  teamMemberId?: string;

  @ApiPropertyOptional({
    enum: MatchParticipantType,
    default: MatchParticipantType.TEAM_MEMBER,
  })
  @IsOptional()
  @IsEnum(MatchParticipantType)
  participantType?: MatchParticipantType;

  @ApiProperty({ description: 'Is winner' })
  @IsBoolean()
  isWinner!: boolean;

  @ApiPropertyOptional({ description: 'Score' })
  @IsOptional()
  @IsNumber()
  score?: number;

  @ApiPropertyOptional({ description: 'Goals' })
  @IsOptional()
  @IsNumber()
  goals?: number;

  @ApiPropertyOptional({ description: 'Assists' })
  @IsOptional()
  @IsNumber()
  assists?: number;

  @ApiPropertyOptional({ description: 'Saves' })
  @IsOptional()
  @IsNumber()
  saves?: number;

  @ApiPropertyOptional({ description: 'Shots' })
  @IsOptional()
  @IsNumber()
  shots?: number;

  @ApiPropertyOptional({ description: 'Was substitute', default: false })
  @IsOptional()
  @IsBoolean()
  wasSubstitute?: boolean;

  @ApiPropertyOptional({ description: 'Substitute reason' })
  @IsOptional()
  @IsString()
  substituteReason?: string;
}


