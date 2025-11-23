import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GamePlatform, Game } from '@prisma/client';

export class CreateTrackerDto {
  @ApiProperty({
    description: 'Tracker URL',
    example: 'https://rocketleague.tracker.network/profile/steam/123456789',
  })
  @IsString()
  @IsNotEmpty()
  url!: string;

  @ApiProperty({
    description: 'Game',
    enum: Game,
    example: Game.ROCKET_LEAGUE,
  })
  @IsEnum(Game)
  game!: Game;

  @ApiProperty({
    description: 'Game platform',
    enum: GamePlatform,
    example: GamePlatform.STEAM,
  })
  @IsEnum(GamePlatform)
  platform!: GamePlatform;

  @ApiProperty({
    description: 'Username from URL',
    example: '123456789',
  })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiPropertyOptional({
    description: 'Optional display name',
    example: 'Player Tracker',
  })
  @IsOptional()
  @IsString()
  displayName?: string;
}

export class UpdateTrackerDto {
  @ApiPropertyOptional({
    description: 'Display name',
    example: 'Player Tracker',
  })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Is tracker active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class RegisterTrackerDto {
  @ApiProperty({
    description: 'Tracker URL (TRN format)',
    example: 'https://rocketleague.tracker.network/rocket-league/profile/steam/76561198051701160/overview',
  })
  @IsString()
  @IsNotEmpty()
  url!: string;
}

export class RefreshTrackerDto {
  @ApiPropertyOptional({
    description: 'Force refresh even if recently scraped',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}






