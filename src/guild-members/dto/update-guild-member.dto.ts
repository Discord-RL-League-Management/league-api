import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateGuildMemberDto } from './create-guild-member.dto';

export class UpdateGuildMemberDto extends PartialType(
  OmitType(CreateGuildMemberDto, ['userId', 'guildId'] as const)
) {}
