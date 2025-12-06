import { Injectable } from '@nestjs/common';
import { IdempotencyRepository } from '../repositories/idempotency.repository';
import { Prisma, ProcessedEvent } from '@prisma/client';

/**
 * IdempotencyService - Single Responsibility: Idempotency checks
 *
 * Handles idempotency checks and marking events as processed.
 * Ensures operations can be safely retried without side effects.
 */
@Injectable()
export class IdempotencyService {
  constructor(private readonly repository: IdempotencyRepository) {}

  /**
   * Check if an event key has been processed
   */
  async isProcessed(eventKey: string): Promise<boolean> {
    const event = await this.repository.findByEventKey(eventKey);
    return !!event;
  }

  /**
   * Mark an event as processed (idempotent)
   */
  async markProcessed(
    tx: Prisma.TransactionClient,
    eventKey: string,
    entityType?: string,
    entityId?: string,
    metadata?: Prisma.InputJsonValue,
  ): Promise<ProcessedEvent> {
    return tx.processedEvent.upsert({
      where: { eventKey },
      create: {
        eventKey,
        entityType,
        entityId,
        metadata,
      },
      update: {},
    });
  }
}
