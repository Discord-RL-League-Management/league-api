import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNotEmpty,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsUrl,
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
  @IsUrl()
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

export class RegisterTrackersDto {
  @ApiProperty({
    description: 'Array of tracker URLs (1-4)',
    example: [
      'https://rocketleague.tracker.network/rocket-league/profile/steam/76561198051701160/overview',
      'https://rocketleague.tracker.network/rocket-league/profile/epic/username/overview',
    ],
    minItems: 1,
    maxItems: 4,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @IsUrl({}, { each: true })
  urls!: string[];
}

export class AddTrackerDto {
  @ApiProperty({
    description: 'Tracker URL (TRN format)',
    example: 'https://rocketleague.tracker.network/rocket-league/profile/steam/76561198051701160/overview',
  })
  @IsString()
  @IsNotEmpty()
  @IsUrl()
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






