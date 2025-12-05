import { Injectable } from '@nestjs/common';
import { OutboxRepository } from '../repositories/outbox.repository';
import { Prisma, Outbox, OutboxStatus } from '@prisma/client';

/**
 * OutboxService - Single Responsibility: Business logic for outbox operations
 *
 * Handles outbox event creation, retrieval, and status updates.
 * Coordinates between repository and transaction context.
 */
@Injectable()
export class OutboxService {
  constructor(private readonly repository: OutboxRepository) {}

  /**
   * Create an outbox event atomically within a transaction
   */
  async createEvent(
    tx: Prisma.TransactionClient,
    sourceType: string,
    sourceId: string,
    eventType: string,
    payload: Prisma.InputJsonValue,
  ): Promise<Outbox> {
    return tx.outbox.create({
      data: {
        sourceType,
        sourceId,
        eventType,
        payload,
      },
    });
  }

  /**
   * Find pending events for processing
   */
  async findPendingEvents(sourceType?: string, limit = 10): Promise<Outbox[]> {
    return this.repository.findPendingEvents(sourceType, limit);
  }

  /**
   * Find events by source entity
   */
  async findBySource(sourceType: string, sourceId: string): Promise<Outbox[]> {
    return this.repository.findBySource(sourceType, sourceId);
  }

  /**
   * Update outbox event status
   */
  async updateStatus(
    id: string,
    status: OutboxStatus,
    errorMessage?: string,
  ): Promise<Outbox> {
    return this.repository.updateStatus(id, status, errorMessage);
  }
}
