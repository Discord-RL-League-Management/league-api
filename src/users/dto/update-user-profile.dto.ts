import { IsString, IsOptional, IsEmail, Length } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserProfileDto {
  @ApiPropertyOptional({
    description: 'Username',
    example: 'johndoe',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100, {
    message: 'Username must be between 1 and 100 characters',
  })
  username?: string;

  @ApiPropertyOptional({
    description: 'Email address',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsEmail(
    {},
    {
      message: 'Email must be a valid email address',
    },
  )
  email?: string;
}


