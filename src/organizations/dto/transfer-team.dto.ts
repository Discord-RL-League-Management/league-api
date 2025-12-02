import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransferTeamDto {
  @ApiProperty({
    description: 'Target organization ID (CUID)',
    example: 'clxorg1234567890',
  })
  @IsString()
  targetOrganizationId!: string;

  @ApiPropertyOptional({
    description: 'Notes about the transfer',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
