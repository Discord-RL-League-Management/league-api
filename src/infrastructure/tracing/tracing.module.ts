import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InAppTracingService } from './services/in-app-tracing.service';
import { ITracingService } from './interfaces/tracing.interface';

/**
 * TracingModule - Infrastructure module for distributed tracing
 *
 * Provides ITracingService interface for dependency injection.
 * Uses InAppTracingService which provides in-memory span tracking.
 *
 * Exports:
 * - ITracingService token for dependency injection
 *
 * Note: No no-op implementation needed - tracing is always available
 */
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: ITracingService,
      useFactory: (): ITracingService => {
        return new InAppTracingService();
      },
    },
  ],
  exports: [ITracingService],
})
export class TracingModule {}
