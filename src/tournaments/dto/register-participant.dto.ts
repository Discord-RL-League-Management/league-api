import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterParticipantDto {
  @ApiPropertyOptional({
    description: 'Player ID (CUID)',
    example: 'clx1234567890abcdef',
  })
  @IsOptional()
  @IsString()
  playerId?: string;

  @ApiPropertyOptional({
    description: 'Team ID (CUID)',
    example: 'clx9876543210fedcba',
  })
  @IsOptional()
  @IsString()
  teamId?: string;

  @ApiProperty({
    description: 'League ID (CUID) - Required',
    example: 'clxabcdef1234567890',
  })
  @IsString()
  @IsNotEmpty()
  leagueId!: string;
}

