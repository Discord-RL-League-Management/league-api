import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateGuildDto } from './create-guild.dto';

export class UpdateGuildDto extends PartialType(
  OmitType(CreateGuildDto, ['id'] as const),
) {}
