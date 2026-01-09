import {
  IsString,
  IsInt,
  IsOptional,
  IsArray,
  IsDate,
  IsNotEmpty,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateTrackerSnapshotDto {
  @ApiProperty({
    description: 'Tracker ID',
    example: 'clx1234567890',
  })
  @IsString()
  @IsNotEmpty()
  trackerId!: string;

  @ApiPropertyOptional({
    description: 'Rocket League season number',
    example: 15,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  seasonNumber?: number;

  @ApiPropertyOptional({
    description: 'Capture timestamp',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  capturedAt?: Date;

  // MMR values
  @ApiPropertyOptional({
    description: '1v1 MMR',
    example: 1200,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  ones?: number;

  @ApiPropertyOptional({
    description: '2v2 MMR',
    example: 1400,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  twos?: number;

  @ApiPropertyOptional({
    description: '3v3 MMR',
    example: 1600,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  threes?: number;

  @ApiPropertyOptional({
    description: '4v4 MMR',
    example: 1000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  fours?: number;

  // Games played
  @ApiPropertyOptional({
    description: '1v1 games played',
    example: 150,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  onesGamesPlayed?: number;

  @ApiPropertyOptional({
    description: '2v2 games played',
    example: 300,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  twosGamesPlayed?: number;

  @ApiPropertyOptional({
    description: '3v3 games played',
    example: 500,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  threesGamesPlayed?: number;

  @ApiPropertyOptional({
    description: '4v4 games played',
    example: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  foursGamesPlayed?: number;

  @ApiPropertyOptional({
    description: 'Guild IDs that can see this snapshot',
    example: ['123456789012345678'],
    type: [String],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  guildIds?: string[];
}
