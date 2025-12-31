import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule, CACHE_MANAGER } from '@nestjs/cache-manager';
import { cacheModuleOptions } from '../../common/config/cache.config';
import { InAppCachingService } from './services/in-app-caching.service';
import { NoOpCachingService } from './services/no-op-caching.service';
import { ICachingService } from './interfaces/caching.interface';
import type { Cache } from 'cache-manager';

/**
 * CachingModule - Infrastructure module for caching
 *
 * Provides ICachingService with environment-based implementation selection.
 * Supports both in-app (cache-manager) and no-op (gateway mode) implementations.
 *
 * Exports:
 * - ICachingService token for dependency injection
 *
 * Implementation selection:
 * - In-app: Uses InAppCachingService (cache-manager) when GATEWAY_MODE=false
 * - No-op: Uses NoOpCachingService when GATEWAY_MODE=true
 */
@Module({
  imports: [
    ConfigModule,
    CacheModule.register(cacheModuleOptions), // Required for InAppCachingService
  ],
  providers: [
    {
      provide: 'ICachingService',
      useFactory: (
        configService: ConfigService,
        cache: Cache,
      ): ICachingService => {
        const gatewayMode = configService.get<boolean>('gateway.mode', false);
        if (gatewayMode) {
          return new NoOpCachingService();
        }
        return new InAppCachingService(cache);
      },
      inject: [ConfigService, CACHE_MANAGER],
    },
  ],
  exports: ['ICachingService'],
})
export class CachingModule {}
