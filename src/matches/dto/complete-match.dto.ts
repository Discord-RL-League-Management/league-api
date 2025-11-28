import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CompleteMatchDto {
  @ApiPropertyOptional({
    description: 'Winner ID (CUID) - Player or Team ID',
    example: 'clx1234567890abcdef',
  })
  @IsOptional()
  @IsString()
  winnerId?: string;
}

