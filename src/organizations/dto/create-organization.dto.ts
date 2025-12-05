import { IsString, IsOptional, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty({
    description: 'League ID (CUID)',
    example: 'clx1234567890abcdef',
  })
  @IsString()
  leagueId!: string;

  @ApiProperty({
    description: 'Organization name',
    example: 'Alpha Organization',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @Length(1, 200)
  name!: string;

  @ApiPropertyOptional({
    description: 'Organization tag',
    example: 'ALPHA',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @Length(0, 20)
  tag?: string;

  @ApiPropertyOptional({
    description: 'Organization description',
    example: 'A competitive organization',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

