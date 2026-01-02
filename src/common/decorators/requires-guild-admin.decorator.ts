import { SetMetadata } from '@nestjs/common';

// Metadata key used by guards to identify routes that require guild admin access
export const REQUIRES_GUILD_ADMIN_KEY = 'requiresGuildAdmin';

export const RequiresGuildAdmin = () =>
  SetMetadata(REQUIRES_GUILD_ADMIN_KEY, true);
