import {
  IsString,
  IsOptional,
  IsNumber,
  Matches,
  Length,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateGuildDto {
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
  id!: string;

  @ApiProperty({
    description: 'Guild name',
    example: 'My Gaming Server',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @Length(1, 100, {
    message: 'Guild name must be between 1 and 100 characters',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Guild icon hash',
    example: 'a_abc123def456',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @Length(1, 50, { message: 'Icon hash must be between 1 and 50 characters' })
  icon?: string;

  @ApiProperty({
    description: 'Guild owner Discord ID',
    example: '987654321098765432',
    minLength: 17,
    maxLength: 20,
  })
  @IsString()
  @Matches(/^\d{17,20}$/, {
    message: 'Owner ID must be a valid Discord snowflake ID (17-20 digits)',
  })
  @Length(17, 20)
  ownerId!: string;

  @ApiPropertyOptional({
    description: 'Member count',
    example: 150,
    minimum: 0,
    maximum: 1000000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Member count cannot be negative' })
  @Max(1000000, { message: 'Member count cannot exceed 1,000,000' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return parseInt(value, 10);
    }
    return value as number | undefined;
  })
  memberCount?: number;
}
