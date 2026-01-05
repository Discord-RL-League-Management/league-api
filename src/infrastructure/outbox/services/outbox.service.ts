import { Injectable } from '@nestjs/common';
import { OutboxRepository } from '../repositories/outbox.repository';
import { Prisma, Outbox, OutboxStatus } from '@prisma/client';
import {
  OutboxNotFoundException,
  InvalidOutboxStatusException,
} from '../exceptions/outbox.exceptions';

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
    return this.repository.create(
      {
        sourceType,
        sourceId,
        eventType,
        payload,
      },
      tx,
    );
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
   * Single Responsibility: Status updates with transition validation
   */
  async updateStatus(
    id: string,
    status: OutboxStatus,
    errorMessage?: string,
  ): Promise<Outbox> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new OutboxNotFoundException(id);
    }

    this.validateStatusTransition(existing.status, status);

    return this.repository.updateStatus(id, status, errorMessage);
  }

  /**
   * Validate status transition
   * Single Responsibility: Status transition validation
   *
   * @param currentStatus - Current outbox status
   * @param newStatus - New outbox status
   * @throws InvalidOutboxStatusException if transition is invalid
   */
  private validateStatusTransition(
    currentStatus: OutboxStatus,
    newStatus: OutboxStatus,
  ): void {
    const validTransitions: Record<OutboxStatus, OutboxStatus[]> = {
      [OutboxStatus.PENDING]: [OutboxStatus.PROCESSING],
      [OutboxStatus.PROCESSING]: [
        OutboxStatus.COMPLETED,
        OutboxStatus.PENDING, // Retry on error
        OutboxStatus.FAILED, // After max retries
      ],
      [OutboxStatus.COMPLETED]: [], // Terminal state - no transitions allowed
      [OutboxStatus.FAILED]: [], // Terminal state - no transitions allowed
    };

    const allowedTransitions = validTransitions[currentStatus] || [];
    if (
      !allowedTransitions.includes(newStatus) &&
      currentStatus !== newStatus
    ) {
      throw new InvalidOutboxStatusException(
        `Cannot transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }
}
