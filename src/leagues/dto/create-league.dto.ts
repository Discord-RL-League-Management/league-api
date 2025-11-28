import {
  IsString,
  IsOptional,
  IsEnum,
  Matches,
  Length,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Game, LeagueStatus } from '@prisma/client';

export class CreateLeagueDto {
  @ApiProperty({
    description: 'League name',
    example: 'Diamond League',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @Length(1, 200, {
    message: 'League name must be between 1 and 200 characters',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'League description',
    example: 'A competitive league for Diamond-ranked players',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000, {
    message: 'Description cannot exceed 5000 characters',
  })
  description?: string;

  @ApiProperty({
    description: 'Discord guild ID (snowflake)',
    example: '123456789012345678',
    minLength: 17,
    maxLength: 20,
  })
  @IsString()
  @Matches(/^\d{17,20}$/, {
    message: 'Guild ID must be a valid Discord snowflake ID (17-20 digits)',
  })
  @Length(17, 20)
  guildId!: string;

  @ApiPropertyOptional({
    description: 'Game type associated with this league',
    enum: Game,
    example: Game.ROCKET_LEAGUE,
  })
  @IsOptional()
  @IsEnum(Game, {
    message: 'Game must be a valid Game enum value',
  })
  game?: Game;

  @ApiPropertyOptional({
    description: 'League status',
    enum: LeagueStatus,
    example: LeagueStatus.ACTIVE,
    default: LeagueStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(LeagueStatus, {
    message: 'Status must be a valid LeagueStatus enum value',
  })
  status?: LeagueStatus;
}
