import {
  IsString,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class JoinLeagueDto {
  @ApiProperty({
    description: 'Player ID (CUID)',
    example: 'clx1234567890abcdef',
  })
  @IsString()
  playerId!: string;

  @ApiPropertyOptional({
    description: 'Notes for the join request',
    example: 'Interested in competitive play',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

