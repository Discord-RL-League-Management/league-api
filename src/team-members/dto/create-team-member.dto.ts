import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  TeamRole,
  TeamMembershipStatus,
  TeamMembershipType,
} from '@prisma/client';

export class CreateTeamMemberDto {
  @ApiProperty({
    description: 'Team ID (CUID)',
    example: 'clx1234567890abcdef',
  })
  @IsString()
  teamId!: string;

  @ApiProperty({
    description: 'Player ID (CUID)',
    example: 'clx9876543210fedcba',
  })
  @IsString()
  playerId!: string;

  @ApiProperty({
    description: 'League ID (CUID)',
    example: 'clx1111111111111111',
  })
  @IsString()
  leagueId!: string;

  @ApiPropertyOptional({
    description: 'Team role',
    enum: TeamRole,
    example: TeamRole.MEMBER,
    default: TeamRole.MEMBER,
  })
  @IsOptional()
  @IsEnum(TeamRole)
  role?: TeamRole;

  @ApiPropertyOptional({
    description: 'Membership status',
    enum: TeamMembershipStatus,
    example: TeamMembershipStatus.ACTIVE,
    default: TeamMembershipStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(TeamMembershipStatus)
  status?: TeamMembershipStatus;

  @ApiPropertyOptional({
    description: 'Membership type',
    enum: TeamMembershipType,
    example: TeamMembershipType.PERMANENT,
    default: TeamMembershipType.PERMANENT,
  })
  @IsOptional()
  @IsEnum(TeamMembershipType)
  membershipType?: TeamMembershipType;

  @ApiPropertyOptional({
    description: 'Start date for temporary membership',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for temporary membership',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Notes about the membership',
    example: 'Temporary substitute',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}


