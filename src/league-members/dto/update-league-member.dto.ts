import { PartialType, OmitType } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateLeagueMemberDto } from './create-league-member.dto';

export class UpdateLeagueMemberDto extends PartialType(
  OmitType(CreateLeagueMemberDto, ['playerId', 'leagueId'] as const),
) {
  @ApiPropertyOptional({ description: 'Left at date' })
  @IsOptional()
  @IsDateString()
  leftAt?: string | null;
}
