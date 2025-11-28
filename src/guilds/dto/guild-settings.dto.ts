import {
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  Matches,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Channel configuration with Discord ID validation
 */
export class ChannelConfigDto {
  @ApiPropertyOptional({
    description: 'Discord channel ID (17-20 digit snowflake)',
    example: '123456789012345678',
  })
  @IsString()
  @Matches(/^\d{17,20}$/, {
    message: 'Channel ID must be a valid Discord snowflake (17-20 digits)',
  })
  id!: string;

  @ApiPropertyOptional({
    description: 'Channel name',
    example: 'bot-commands',
  })
  @IsString()
  @Length(1, 100, {
    message: 'Channel name must be between 1 and 100 characters',
  })
  name!: string;
}

/**
 * Main guild settings DTO
 */
export class GuildSettingsDto {
  @ApiPropertyOptional({
    type: [ChannelConfigDto],
    description:
      'Channels where bot listens for commands. Empty = all channels.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChannelConfigDto)
  bot_command_channels?: ChannelConfigDto[];

  @ApiPropertyOptional({
    type: [ChannelConfigDto],
    description:
      'Channels where /register command can be used. Empty = uses bot_command_channels or all channels.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChannelConfigDto)
  register_command_channels?: ChannelConfigDto[];
}
