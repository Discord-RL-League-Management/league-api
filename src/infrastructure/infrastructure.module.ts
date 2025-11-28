import { Module } from '@nestjs/common';
import { OutboxModule } from './outbox/outbox.module';
import { IdempotencyModule } from './idempotency/idempotency.module';
import { ActivityLogModule } from './activity-log/activity-log.module';
import { SettingsModule } from './settings/settings.module';
import { VisibilityModule } from './visibility/visibility.module';

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
  ],
  exports: [
    OutboxModule,
    IdempotencyModule,
    ActivityLogModule,
    SettingsModule,
    VisibilityModule,
  ],
})
export class InfrastructureModule {}
