import {
  IsString,
  IsUrl,
  IsEnum,
  IsOptional,
  IsNotEmpty,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GamePlatform, Game } from '@prisma/client';

export class RegisterTrackerDto {
  @ApiProperty({
    description: 'Tracker URL (TRN Rocket League)',
    example: 'https://rocketleague.tracker.network/profile/steam/123456789',
  })
  @IsString()
  @IsNotEmpty()
  @IsUrl({}, { message: 'Invalid URL format' })
  url!: string;

  @ApiProperty({
    description: 'Discord guild ID where the registration was made',
    example: '123456789012345678',
  })
  @IsString()
  @IsNotEmpty()
  guildId!: string;
}

export class ProcessRegistrationDto {
  @ApiPropertyOptional({
    description: 'Optional display name for the tracker',
    example: 'Player Tracker',
  })
  @IsOptional()
  @IsString()
  displayName?: string;
}

export class RejectRegistrationDto {
  @ApiProperty({
    description: 'Reason for rejection',
    example: 'Invalid tracker URL',
  })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class TrackerRegistrationResponseDto {
  @ApiProperty()
  registrationId!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  message!: string;
}

