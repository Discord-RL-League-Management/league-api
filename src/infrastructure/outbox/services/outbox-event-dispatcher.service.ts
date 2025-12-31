import { Injectable, Inject } from '@nestjs/common';
import { ILoggingService } from '../../logging/interfaces/logging.interface';
import { Outbox } from '@prisma/client';

/**
 * OutboxEventDispatcher - Single Responsibility: Event routing
 *
 * Routes outbox events to appropriate handlers based on event type.
 * This service will need to be extended as new event types are added.
 */
@Injectable()
export class OutboxEventDispatcher {
  private readonly serviceName = OutboxEventDispatcher.name;

  constructor(
    @Inject(ILoggingService)
    private readonly loggingService: ILoggingService,
  ) {}

  /**
   * Dispatch an outbox event to the appropriate queue
   * @param event The outbox event to dispatch
   * @throws Error if event type is unknown or handler is not implemented
   *
   * Routes events to appropriate handlers based on event type.
   * Unknown event types throw an error to trigger retry logic, ensuring eventual
   * processing or manual investigation after max retries.
   *
   * This maintains the outbox pattern's guarantee of eventual consistency by
   * ensuring events are either processed successfully or explicitly marked as
   * FAILED for investigation, preventing silent data loss.
   */
  dispatchEvent(event: Outbox): Promise<void> {
    this.loggingService.debug(
      `Dispatching event ${event.id} of type ${event.eventType}`,
      this.serviceName,
    );

    const deprecatedEventTypes = [
      'TRACKER_REGISTRATION_CREATED', // Deprecated: Removed with tracker registration queue system
    ];

    if (deprecatedEventTypes.includes(event.eventType)) {
      this.loggingService.warn(
        `Skipping deprecated event type: ${event.eventType} (event ${event.id}). ` +
          `This event type is no longer processed as the system has been removed.`,
        this.serviceName,
      );
      return Promise.resolve();
    }

    throw new Error(
      `No handler implemented for event type: ${event.eventType} (event ${event.id}). ` +
        `Event will be retried and marked as FAILED after max retries. ` +
        `Implement a handler in OutboxEventDispatcher.dispatchEvent() to process this event type.`,
    );
  }
}
