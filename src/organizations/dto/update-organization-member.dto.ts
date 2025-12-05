import { IsOptional, IsEnum, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  OrganizationMemberRole,
  OrganizationMemberStatus,
} from '@prisma/client';

export class UpdateOrganizationMemberDto {
  @ApiPropertyOptional({
    description: 'Member role',
    enum: OrganizationMemberRole,
  })
  @IsOptional()
  @IsEnum(OrganizationMemberRole)
  role?: OrganizationMemberRole;

  @ApiPropertyOptional({
    description: 'Member status',
    enum: OrganizationMemberStatus,
  })
  @IsOptional()
  @IsEnum(OrganizationMemberStatus)
  status?: OrganizationMemberStatus;

  @ApiPropertyOptional({
    description: 'Notes about the member',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

