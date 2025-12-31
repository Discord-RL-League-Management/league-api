import type { InjectionToken } from '@nestjs/common';
import { ITransactionClient } from '../../transactions/interfaces/transaction.interface';

/**
 * EventPublishOptions - Options for event publishing
 */
export interface EventPublishOptions {
  /**
   * Source type of the event (e.g., 'guild', 'league', 'tracker')
   */
  sourceType?: string;

  /**
   * Source ID of the event (e.g., guild ID, league ID)
   */
  sourceId?: string;

  /**
   * Additional metadata for the event
   */
  metadata?: Record<string, unknown>;
}

/**
 * IEventService - Interface for event publishing operations
 *
 * Abstracts event publishing functionality to enable dependency inversion and message queue integration.
 * This interface allows business logic to depend on abstractions rather than concrete
 * implementations (e.g., OutboxService), enabling events to be published to a message
 * queue (RabbitMQ, Kafka, AWS SQS, etc.) when scaling to microservices architecture.
 *
 * Future extraction target: Message Queue (events published to message queue for async processing)
 */
export interface IEventService {
  /**
   * Publish an event (non-transactional)
   * @param eventType - Type of event (e.g., 'GUILD_CREATED', 'LEAGUE_UPDATED')
   * @param payload - Event payload/data
   * @param options - Optional event publishing options
   */
  publish(
    eventType: string,
    payload: Record<string, unknown>,
    options?: EventPublishOptions,
  ): Promise<void>;

  /**
   * Publish an event within a transaction (transactional outbox pattern)
   * Ensures event is published atomically with database changes
   * @param tx - Transaction client
   * @param eventType - Type of event (e.g., 'GUILD_CREATED', 'LEAGUE_UPDATED')
   * @param payload - Event payload/data
   * @param options - Optional event publishing options
   */
  publishWithTransaction(
    tx: ITransactionClient,
    eventType: string,
    payload: Record<string, unknown>,
    options?: EventPublishOptions,
  ): Promise<void>;
}

export const IEventService = Symbol(
  'IEventService',
) as InjectionToken<IEventService>;
