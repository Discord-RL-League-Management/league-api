import { Module } from '@nestjs/common';
import { OutboxModule } from '../outbox/outbox.module';
import { OutboxService } from '../outbox/services/outbox.service';
import { InAppEventService } from './services/in-app-event.service';
import { IEventService } from './interfaces/event.interface';

/**
 * EventModule - Infrastructure module for event publishing
 *
 * Provides IEventService interface for dependency injection.
 * Uses InAppEventService which provides in-memory event bus and transactional outbox.
 *
 * Exports:
 * - IEventService token for dependency injection
 *
 * Note: No no-op implementation needed - events are always required
 */
@Module({
  imports: [OutboxModule],
  providers: [
    {
      provide: 'IEventService',
      useFactory: (outboxService: OutboxService): IEventService => {
        return new InAppEventService(outboxService);
      },
      inject: [OutboxService],
    },
  ],
  exports: ['IEventService'],
})
export class EventModule {}
