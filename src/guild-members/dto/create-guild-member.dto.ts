import {
  IsString,
  IsArray,
  IsOptional,
  Matches,
  Length,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGuildMemberDto {
  @ApiProperty({
    description: 'Discord user ID',
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
    description: 'Discord guild ID',
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

  @ApiProperty({
    description: 'Discord username',
    example: 'testuser',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @Length(1, 100, { message: 'Username must be between 1 and 100 characters' })
  username!: string;

  @ApiPropertyOptional({
    description: 'Array of Discord role IDs',
    example: ['role1', 'role2'],
    maxItems: 250,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(250, { message: 'Cannot have more than 250 roles' })
  @Matches(/^\d{17,20}$/, {
    each: true,
    message: 'Each role ID must be a valid Discord snowflake ID',
  })
  roles?: string[];
}
