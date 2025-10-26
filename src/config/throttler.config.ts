import { ConfigService } from '@nestjs/config';
import { ThrottlerModuleOptions } from '@nestjs/throttler';

export const throttlerConfig = (configService: ConfigService): ThrottlerModuleOptions => ({
  throttlers: [
    {
      ttl: configService.get<number>('throttler.ttl') || 60000,
      limit: configService.get<number>('throttler.limit') || 100,
    },
  ],
});
