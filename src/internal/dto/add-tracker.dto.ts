import { IsString, IsOptional, ValidateNested } from 'class-validator';
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

export class AddTrackerDto {
  @ApiProperty({
    description: 'Discord user ID (snowflake)',
    example: '123456789012345678',
  })
  @IsString()
  userId!: string;

  @ApiProperty({
    description: 'Tracker URL',
    example: 'https://tracker.gg/rocket-league/profile/steam/player1',
  })
  @IsString()
  url!: string;

  @ApiPropertyOptional({
    type: UserDataDto,
    description: 'User data from Discord',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UserDataDto)
  userData?: UserDataDto;
}

