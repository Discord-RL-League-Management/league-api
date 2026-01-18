import {
  IsString,
  IsArray,
  IsOptional,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  IsUrl,
  IsNotEmpty,
} from 'class-validator';
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

export class RegisterByStaffDto {
  @ApiProperty({
    description: 'Discord user ID of staff member calling the command',
    example: '123456789012345678',
  })
  @IsString()
  @IsNotEmpty()
  staffUserId!: string;

  @ApiProperty({
    description: 'Discord guild ID where command was called',
    example: '123456789012345678',
  })
  @IsString()
  @IsNotEmpty()
  guildId!: string;

  @ApiProperty({
    description: 'Discord user ID of user to register',
    example: '987654321098765432',
  })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({
    description: 'Array of tracker URLs (1-4)',
    example: [
      'https://rocketleague.tracker.network/rocket-league/profile/steam/76561198051701160/overview',
      'https://rocketleague.tracker.network/rocket-league/profile/epic/username/overview',
    ],
    minItems: 1,
    maxItems: 4,
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @IsUrl({}, { each: true })
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
