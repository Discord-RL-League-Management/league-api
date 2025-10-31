import { PartialType, OmitType } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['id'] as const),
) {
  @ApiPropertyOptional({
    description: 'Last login timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  lastLoginAt?: Date;
}
