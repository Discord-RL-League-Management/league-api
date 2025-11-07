import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Outbox } from '@prisma/client';
import { TrackerRegistrationQueueService } from '../../../trackers/queues/tracker-registration.queue';

/**
 * OutboxEventDispatcher - Single Responsibility: Event routing
 * 
 * Routes outbox events to appropriate handlers based on event type.
 * This service will need to be extended as new event types are added.
 */
@Injectable()
export class OutboxEventDispatcher {
  private readonly logger = new Logger(OutboxEventDispatcher.name);

  constructor(
    private readonly queueService: TrackerRegistrationQueueService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Dispatch an outbox event to the appropriate queue
   * @param event The outbox event to dispatch
   * @throws Error if event type is unknown
   */
  async dispatchEvent(event: Outbox): Promise<void> {
    this.logger.debug(`Dispatching event ${event.id} of type ${event.eventType}`);

    // Dispatch to queue based on event type
    if (event.eventType === 'TRACKER_REGISTRATION_CREATED') {
      await this.dispatchTrackerRegistrationCreated(event);
    } else {
      throw new Error(`Unknown event type: ${event.eventType}`);
    }
  }

  /**
   * Dispatch TRACKER_REGISTRATION_CREATED event to queue
   */
  private async dispatchTrackerRegistrationCreated(
    event: Outbox,
  ): Promise<void> {
    const payload = event.payload as any;

    // Create job in queue
    const jobId = await this.queueService.addJob({
      registrationId: payload.registrationId,
      userId: payload.userId,
      guildId: payload.guildId,
      url: payload.url,
      submittedAt: new Date(payload.submittedAt),
    });

    // Update registration with job ID
    await this.prisma.trackerRegistration.update({
      where: { id: payload.registrationId },
      data: { jobId },
    });

    this.logger.debug(
      `Dispatched TRACKER_REGISTRATION_CREATED event ${event.id} to queue with job ID ${jobId}`,
    );
  }
}

