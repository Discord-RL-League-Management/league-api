import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTeamDto {
  @ApiProperty({
    description: 'League ID (CUID)',
    example: 'clx1234567890abcdef',
  })
  @IsString()
  leagueId!: string;

  @ApiProperty({
    description: 'Team name',
    example: 'Team Alpha',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @Length(1, 200)
  name!: string;

  @ApiPropertyOptional({
    description: 'Team tag',
    example: 'TALP',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @Length(0, 20)
  tag?: string;

  @ApiPropertyOptional({
    description: 'Team description',
    example: 'A competitive team',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Captain player ID (CUID)',
    example: 'clx9876543210fedcba',
  })
  @IsOptional()
  @IsString()
  captainId?: string;

  @ApiPropertyOptional({
    description: 'Maximum players',
    example: 5,
    default: 5,
    minimum: 2,
    maximum: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(20)
  maxPlayers?: number;

  @ApiPropertyOptional({
    description: 'Minimum players',
    example: 2,
    default: 2,
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  minPlayers?: number;

  @ApiPropertyOptional({
    description: 'Allow emergency substitutes',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  allowEmergencySubs?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum substitutes',
    example: 2,
    default: 2,
    minimum: 0,
    maximum: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  maxSubstitutes?: number;
}

