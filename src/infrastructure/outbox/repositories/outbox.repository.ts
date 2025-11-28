import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, Outbox, OutboxStatus } from '@prisma/client';

/**
 * OutboxRepository - Single Responsibility: Data access layer for Outbox entity
 *
 * Pure data access layer with no business logic.
 * Handles all database operations for Outbox model.
 */
@Injectable()
export class OutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new outbox event
   */
  async create(data: Prisma.OutboxCreateInput): Promise<Outbox> {
    return this.prisma.outbox.create({ data });
  }

  /**
   * Find outbox event by ID
   */
  async findById(id: string): Promise<Outbox | null> {
    return this.prisma.outbox.findUnique({ where: { id } });
  }

  /**
   * Find pending events
   */
  async findPendingEvents(sourceType?: string, limit = 10): Promise<Outbox[]> {
    return this.prisma.outbox.findMany({
      where: {
        status: OutboxStatus.PENDING,
        ...(sourceType && { sourceType }),
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  /**
   * Find events by source
   */
  async findBySource(sourceType: string, sourceId: string): Promise<Outbox[]> {
    return this.prisma.outbox.findMany({
      where: {
        sourceType,
        sourceId,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Update outbox event status
   */
  async update(id: string, data: Prisma.OutboxUpdateInput): Promise<Outbox> {
    return this.prisma.outbox.update({
      where: { id },
      data,
    });
  }

  /**
   * Update status
   */
  async updateStatus(
    id: string,
    status: OutboxStatus,
    errorMessage?: string,
  ): Promise<Outbox> {
    return this.prisma.outbox.update({
      where: { id },
      data: {
        status,
        ...(errorMessage && { errorMessage }),
        ...(status === 'COMPLETED' && { processedAt: new Date() }),
        updatedAt: new Date(),
      },
    });
  }
}
