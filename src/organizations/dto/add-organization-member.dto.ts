import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationMemberRole } from '@prisma/client';

export class AddOrganizationMemberDto {
  @ApiProperty({
    description: 'Player ID (CUID)',
    example: 'clx9876543210fedcba',
  })
  @IsString()
  playerId!: string;

  @ApiPropertyOptional({
    description: 'Member role',
    enum: OrganizationMemberRole,
    default: OrganizationMemberRole.MEMBER,
  })
  @IsOptional()
  @IsEnum(OrganizationMemberRole)
  role?: OrganizationMemberRole;

  @ApiPropertyOptional({
    description: 'Notes about the member',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
