import { PartialType, OmitType } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateTeamMemberDto } from './create-team-member.dto';

export class UpdateTeamMemberDto extends PartialType(
  OmitType(CreateTeamMemberDto, ['teamId', 'playerId', 'leagueId'] as const)
) {
  @ApiPropertyOptional({ description: 'Left at date' })
  @IsOptional()
  @IsDateString()
  leftAt?: string | null;
}

