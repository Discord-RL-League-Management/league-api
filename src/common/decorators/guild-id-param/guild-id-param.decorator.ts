import { SetMetadata } from '@nestjs/common';

// Metadata key used by guards to identify which route parameter contains the guild ID
export const GUILD_ID_PARAM_KEY = 'guildIdParam';

// Specifies which route parameter name contains the guild ID (defaults to 'id')
export const GuildIdParam = (paramName: string = 'id') =>
  SetMetadata(GUILD_ID_PARAM_KEY, paramName);
