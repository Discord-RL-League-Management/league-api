import { SetMetadata } from '@nestjs/common';

// Metadata key used by guards to identify routes that skip JWT authentication for bot-only endpoints
export const IS_BOT_ONLY_KEY = 'isBotOnly';

// Marks routes as bot-only to bypass JWT authentication guards, allowing BotAuthGuard to handle authentication
export const BotOnly = () => SetMetadata(IS_BOT_ONLY_KEY, true);
