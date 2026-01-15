/**
 * IdempotencyRepository Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IdempotencyRepository } from './idempotency.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProcessedEvent, Prisma } from '@prisma/client';

describe('IdempotencyRepository', () => {
  let repository: IdempotencyRepository;
  let mockPrisma: PrismaService;

  const mockProcessedEvent: ProcessedEvent = {
    id: 'event_123',
    eventKey: 'test-event-key',
    entityType: 'User',
    entityId: 'user_123',
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrisma = {
      processedEvent: {
        findUnique: vi.fn(),
        create: vi.fn(),
        upsert: vi.fn(),
      },
    } as unknown as PrismaService;

    repository = new IdempotencyRepository(mockPrisma);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findByEventKey', () => {
    it('should_return_processed_event_when_found', async () => {
      const eventKey = 'test-event-key';

      vi.mocked(mockPrisma.processedEvent.findUnique).mockResolvedValue(
        mockProcessedEvent,
      );

      const result = await repository.findByEventKey(eventKey);

      expect(result).toEqual(mockProcessedEvent);
      expect(mockPrisma.processedEvent.findUnique).toHaveBeenCalledWith({
        where: { eventKey },
      });
    });

    it('should_return_null_when_event_not_found', async () => {
      const eventKey = 'nonexistent';

      vi.mocked(mockPrisma.processedEvent.findUnique).mockResolvedValue(null);

      const result = await repository.findByEventKey(eventKey);

      expect(result).toBeNull();
      expect(mockPrisma.processedEvent.findUnique).toHaveBeenCalledWith({
        where: { eventKey },
      });
    });
  });

  describe('create', () => {
    it('should_create_processed_event', async () => {
      const data: Prisma.ProcessedEventCreateInput = {
        eventKey: 'test-event-key',
        entityType: 'User',
        entityId: 'user_123',
      };

      vi.mocked(mockPrisma.processedEvent.create).mockResolvedValue(
        mockProcessedEvent,
      );

      const result = await repository.create(data);

      expect(result).toEqual(mockProcessedEvent);
      expect(mockPrisma.processedEvent.create).toHaveBeenCalledWith({ data });
    });
  });

  describe('upsert', () => {
    it('should_upsert_processed_event', async () => {
      const eventKey = 'test-event-key';
      const data: Prisma.ProcessedEventCreateInput = {
        eventKey,
        entityType: 'User',
        entityId: 'user_123',
      };

      vi.mocked(mockPrisma.processedEvent.upsert).mockResolvedValue(
        mockProcessedEvent,
      );

      const result = await repository.upsert(eventKey, data);

      expect(result).toEqual(mockProcessedEvent);
      expect(mockPrisma.processedEvent.upsert).toHaveBeenCalledWith({
        where: { eventKey },
        create: data,
        update: {},
      });
    });
  });
});
