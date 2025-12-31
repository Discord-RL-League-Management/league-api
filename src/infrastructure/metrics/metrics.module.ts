import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InAppMetricsService } from './services/in-app-metrics.service';
import { IMetricsService } from './interfaces/metrics.interface';

/**
 * MetricsModule - Infrastructure module for metrics collection
 *
 * Provides IMetricsService interface for dependency injection.
 * Uses InAppMetricsService which provides in-memory metrics collection.
 *
 * Exports:
 * - IMetricsService token for dependency injection
 *
 * Note: No no-op implementation needed - metrics collection is always available
 */
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: IMetricsService,
      useFactory: (): IMetricsService => {
        return new InAppMetricsService();
      },
    },
  ],
  exports: [IMetricsService],
})
export class MetricsModule {}
