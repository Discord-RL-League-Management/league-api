import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import { OutboxService } from '../../outbox/services/outbox.service';
import { IEventService } from '../interfaces/event.interface';
import { ITransactionClient } from '../../transactions/interfaces/transaction.interface';
import { Prisma } from '@prisma/client';

/**
 * InAppEventService - In-app implementation of IEventService
 *
 * Provides event publishing through the infrastructure abstraction interface.
 * Uses in-memory EventEmitter for non-transactional events and OutboxService
 * for transactional events (transactional outbox pattern).
 *
 * Implementation:
 * - Non-transactional: Node.js EventEmitter (in-memory event bus)
 * - Transactional: OutboxService (writes to outbox table within transaction)
 */
@Injectable()
export class InAppEventService implements IEventService {
  private readonly eventEmitter: EventEmitter;

  constructor(private readonly outboxService: OutboxService) {
    this.eventEmitter = new EventEmitter();
  }

  /**
   * Publish an event (non-transactional)
   * @param eventType - Type of event (e.g., 'GUILD_CREATED', 'LEAGUE_UPDATED')
   * @param payload - Event payload/data
   * @param options - Optional event publishing options
   */
  publish(
    eventType: string,
    payload: Record<string, unknown>,
    options?: {
      sourceType?: string;
      sourceId?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    try {
      this.eventEmitter.emit(eventType, {
        eventType,
        payload,
        sourceType: options?.sourceType,
        sourceId: options?.sourceId,
        metadata: options?.metadata,
        timestamp: new Date().toISOString(),
      });
      return Promise.resolve();
    } catch {
      // Event publishing failures should not break the application
      return Promise.resolve();
    }
  }

  /**
   * Publish an event within a transaction (transactional outbox pattern)
   * Ensures event is published atomically with database changes
   * @param tx - Transaction client
   * @param eventType - Type of event (e.g., 'GUILD_CREATED', 'LEAGUE_UPDATED')
   * @param payload - Event payload/data
   * @param options - Optional event publishing options
   */
  async publishWithTransaction(
    tx: ITransactionClient,
    eventType: string,
    payload: Record<string, unknown>,
    options?: {
      sourceType?: string;
      sourceId?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.outboxService.createEvent(
      tx as Prisma.TransactionClient,
      options?.sourceType || 'system',
      options?.sourceId || '',
      eventType,
      payload as Prisma.InputJsonValue,
    );
  }
}
