import { Module } from '@nestjs/common';
import { OutboxModule } from './outbox/outbox.module';
import { IdempotencyModule } from './idempotency/idempotency.module';
import { ActivityLogModule } from './activity-log/activity-log.module';
import { SettingsModule } from './settings/settings.module';
import { VisibilityModule } from './visibility/visibility.module';
import { RateLimitingModule } from './rate-limiting/rate-limiting.module';
import { CachingModule } from './caching/caching.module';
import { LoggingModule } from './logging/logging.module';
import { MetricsModule } from './metrics/metrics.module';
import { TracingModule } from './tracing/tracing.module';
import { ConfigurationModule } from './configuration/configuration.module';
import { TransactionModule } from './transactions/transaction.module';
import { EventModule } from './events/event.module';

/**
 * InfrastructureModule - Barrel export for all infrastructure modules
 *
 * Provides a single entry point for all infrastructure modules.
 * Enables clean imports across the application.
 */
@Module({
  imports: [
    OutboxModule,
    IdempotencyModule,
    ActivityLogModule,
    SettingsModule,
    VisibilityModule,
    RateLimitingModule,
    CachingModule,
    LoggingModule,
    MetricsModule,
    TracingModule,
    ConfigurationModule,
    TransactionModule,
    EventModule,
  ],
  exports: [
    OutboxModule,
    IdempotencyModule,
    ActivityLogModule,
    SettingsModule,
    VisibilityModule,
    RateLimitingModule,
    CachingModule,
    LoggingModule,
    MetricsModule,
    TracingModule,
    ConfigurationModule,
    TransactionModule,
    EventModule,
  ],
})
export class InfrastructureModule {}
