import { IsString, IsOptional, IsEmail, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    description: 'Discord user ID (snowflake)',
    example: '123456789012345678',
  })
  @IsString()
  @Matches(/^\d+$/, { message: 'id must be a Discord snowflake' })
  id: string;

  @ApiProperty({
    description: 'Discord username',
    example: 'testuser',
  })
  @IsString()
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

  @ApiPropertyOptional({
    description: 'Discord OAuth access token',
    example: 'access_token_here',
  })
  @IsOptional()
  @IsString()
  accessToken?: string;

  @ApiPropertyOptional({
    description: 'Discord OAuth refresh token',
    example: 'refresh_token_here',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
