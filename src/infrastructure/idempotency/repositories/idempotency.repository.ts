import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, ProcessedEvent } from '@prisma/client';

/**
 * IdempotencyRepository - Single Responsibility: Data access layer for ProcessedEvent entity
 * 
 * Pure data access layer with no business logic.
 * Handles all database operations for ProcessedEvent model.
 */
@Injectable()
export class IdempotencyRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find processed event by event key
   */
  async findByEventKey(eventKey: string): Promise<ProcessedEvent | null> {
    return this.prisma.processedEvent.findUnique({
      where: { eventKey },
    });
  }

  /**
   * Create a processed event
   */
  async create(data: Prisma.ProcessedEventCreateInput): Promise<ProcessedEvent> {
    return this.prisma.processedEvent.create({ data });
  }

  /**
   * Upsert a processed event (idempotent)
   */
  async upsert(
    eventKey: string,
    data: Prisma.ProcessedEventCreateInput,
  ): Promise<ProcessedEvent> {
    return this.prisma.processedEvent.upsert({
      where: { eventKey },
      create: data,
      update: {
        // Idempotent - no change if already exists
      },
    });
  }
}

