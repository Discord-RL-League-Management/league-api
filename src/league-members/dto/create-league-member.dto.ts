import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeagueMemberStatus, LeagueMemberRole } from '@prisma/client';

export class CreateLeagueMemberDto {
  @ApiProperty({
    description: 'Player ID (CUID)',
    example: 'clx1234567890abcdef',
  })
  @IsString()
  playerId!: string;

  @ApiProperty({
    description: 'League ID (CUID)',
    example: 'clx9876543210fedcba',
  })
  @IsString()
  leagueId!: string;

  @ApiPropertyOptional({
    description: 'League member status',
    enum: LeagueMemberStatus,
    example: LeagueMemberStatus.ACTIVE,
    default: LeagueMemberStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(LeagueMemberStatus, {
    message: 'Status must be a valid LeagueMemberStatus enum value',
  })
  status?: LeagueMemberStatus;

  @ApiPropertyOptional({
    description: 'League member role',
    enum: LeagueMemberRole,
    example: LeagueMemberRole.MEMBER,
    default: LeagueMemberRole.MEMBER,
  })
  @IsOptional()
  @IsEnum(LeagueMemberRole, {
    message: 'Role must be a valid LeagueMemberRole enum value',
  })
  role?: LeagueMemberRole;

  @ApiPropertyOptional({
    description: 'Approver user ID (Discord snowflake)',
    example: '123456789012345678',
  })
  @IsOptional()
  @IsString()
  approvedBy?: string;

  @ApiPropertyOptional({
    description: 'Notes about the membership',
    example: 'Approved by admin',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

