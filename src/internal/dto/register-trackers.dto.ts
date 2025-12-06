import { IsString, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class UserDataDto {
  @ApiProperty({
    description: 'Discord username',
    example: 'johndoe',
  })
  @IsString()
  username!: string;

  @ApiPropertyOptional({
    description: 'Discord global name',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  globalName?: string;

  @ApiPropertyOptional({
    description: 'Discord avatar hash',
    example: 'a_abc123def456',
  })
  @IsOptional()
  @IsString()
  avatar?: string;
}

export class InternalRegisterTrackersDto {
  @ApiProperty({
    description: 'Discord user ID (snowflake)',
    example: '123456789012345678',
  })
  @IsString()
  userId!: string;

  @ApiProperty({
    description: 'Array of tracker URLs',
    example: ['https://tracker.gg/rocket-league/profile/steam/player1'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  urls!: string[];

  @ApiPropertyOptional({
    type: UserDataDto,
    description: 'User data from Discord',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UserDataDto)
  userData?: UserDataDto;

  @ApiPropertyOptional({
    description: 'Discord channel ID where registration command was called',
    example: '123456789012345678',
  })
  @IsOptional()
  @IsString()
  channelId?: string;

  @ApiPropertyOptional({
    description: 'Discord interaction token for ephemeral follow-up messages',
    example: 'interaction_token_here',
  })
  @IsOptional()
  @IsString()
  interactionToken?: string;
}
