import { IsString, IsOptional, IsEnum, Matches, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlayerStatus } from '@prisma/client';

export class CreatePlayerDto {
  @ApiProperty({
    description: 'Discord user ID (snowflake)',
    example: '123456789012345678',
    minLength: 17,
    maxLength: 20,
  })
  @IsString()
  @Matches(/^\d{17,20}$/, {
    message: 'User ID must be a valid Discord snowflake ID (17-20 digits)',
  })
  @Length(17, 20)
  userId!: string;

  @ApiProperty({
    description: 'Discord guild ID (snowflake)',
    example: '987654321098765432',
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
    description: 'Player status',
    enum: PlayerStatus,
    example: PlayerStatus.ACTIVE,
    default: PlayerStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(PlayerStatus, {
    message: 'Status must be a valid PlayerStatus enum value',
  })
  status?: PlayerStatus;

  @ApiPropertyOptional({
    description: 'Primary tracker ID (CUID)',
    example: 'clx1234567890abcdef',
  })
  @IsOptional()
  @IsString()
  primaryTrackerId?: string;
}


