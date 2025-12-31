import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule, CACHE_MANAGER } from '@nestjs/cache-manager';
import { cacheModuleOptions } from '../../common/config/cache.config';
import { InAppRateLimitingService } from './services/in-app-rate-limiting.service';
import { NoOpRateLimitingService } from './services/no-op-rate-limiting.service';
import { IRateLimitingService } from './interfaces/rate-limiting.interface';
import type { Cache } from 'cache-manager';

/**
 * RateLimitingModule - Infrastructure module for rate limiting
 *
 * Provides IRateLimitingService with environment-based implementation selection.
 * Supports both in-app (cache-manager) and no-op (gateway mode) implementations.
 *
 * Exports:
 * - IRateLimitingService token for dependency injection
 *
 * Implementation selection:
 * - In-app: Uses InAppRateLimitingService (cache-manager) when GATEWAY_MODE=false
 * - No-op: Uses NoOpRateLimitingService when GATEWAY_MODE=true
 */
@Module({
  imports: [
    ConfigModule,
    CacheModule.register(cacheModuleOptions), // Required for InAppRateLimitingService
  ],
  providers: [
    {
      provide: IRateLimitingService,
      useFactory: (
        configService: ConfigService,
        cache: Cache,
      ): IRateLimitingService => {
        const gatewayMode = configService.get<boolean>('gateway.mode', false);
        if (gatewayMode) {
          return new NoOpRateLimitingService();
        }
        return new InAppRateLimitingService(cache);
      },
      inject: [ConfigService, CACHE_MANAGER],
    },
  ],
  exports: [IRateLimitingService],
})
export class RateLimitingModule {}
