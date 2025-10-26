import { IsString, IsOptional, IsEmail, Matches, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DiscordProfileDto {
  @ApiProperty({
    description: 'Discord user ID (snowflake)',
    example: '123456789012345678',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{17,19}$/, { message: 'discordId must be a valid Discord snowflake (17-19 digits)' })
  discordId: string;

  @ApiProperty({
    description: 'Discord username',
    example: 'testuser',
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiPropertyOptional({
    description: 'Discord discriminator (being phased out)',
    example: '1234',
  })
  @IsOptional()
  @IsString()
  discriminator?: string;

  @ApiPropertyOptional({
    description: 'Discord global display name',
    example: 'Test User',
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

  @ApiPropertyOptional({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'Discord OAuth access token',
    example: 'access_token_here',
  })
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @ApiProperty({
    description: 'Discord OAuth refresh token',
    example: 'refresh_token_here',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
