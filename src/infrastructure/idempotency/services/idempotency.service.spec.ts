/**
 * IdempotencyService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IdempotencyService } from './idempotency.service';
import { IdempotencyRepository } from '../repositories/idempotency.repository';
import { ProcessedEvent, Prisma } from '@prisma/client';

describe('IdempotencyService', () => {
  let service: IdempotencyService;
  let mockRepository: IdempotencyRepository;

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
    mockRepository = {
      findByEventKey: vi.fn(),
    } as unknown as IdempotencyRepository;

    service = new IdempotencyService(mockRepository);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isProcessed', () => {
    it('should_return_true_when_event_has_been_processed', async () => {
      const eventKey = 'test-event-key';

      vi.mocked(mockRepository.findByEventKey).mockResolvedValue(
        mockProcessedEvent,
      );

      const result = await service.isProcessed(eventKey);

      expect(result).toBe(true);
      expect(mockRepository.findByEventKey).toHaveBeenCalledWith(eventKey);
    });

    it('should_return_false_when_event_has_not_been_processed', async () => {
      const eventKey = 'test-event-key';

      vi.mocked(mockRepository.findByEventKey).mockResolvedValue(null);

      const result = await service.isProcessed(eventKey);

      expect(result).toBe(false);
      expect(mockRepository.findByEventKey).toHaveBeenCalledWith(eventKey);
    });
  });

  describe('markProcessed', () => {
    it('should_create_processed_event_when_event_does_not_exist', async () => {
      const eventKey = 'test-event-key';
      const entityType = 'User';
      const entityId = 'user_123';
      const metadata = { test: 'data' };
      const mockTx = {
        processedEvent: {
          upsert: vi.fn().mockResolvedValue(mockProcessedEvent),
        },
      } as unknown as Prisma.TransactionClient;

      const result = await service.markProcessed(
        mockTx,
        eventKey,
        entityType,
        entityId,
        metadata,
      );

      expect(result).toEqual(mockProcessedEvent);
      expect(mockTx.processedEvent.upsert).toHaveBeenCalledWith({
        where: { eventKey },
        create: {
          eventKey,
          entityType,
          entityId,
          metadata,
        },
        update: {},
      });
    });

    it('should_update_processed_event_when_event_already_exists', async () => {
      const eventKey = 'test-event-key';
      const mockTx = {
        processedEvent: {
          upsert: vi.fn().mockResolvedValue(mockProcessedEvent),
        },
      } as unknown as Prisma.TransactionClient;

      const result = await service.markProcessed(mockTx, eventKey);

      expect(result).toEqual(mockProcessedEvent);
      expect(mockTx.processedEvent.upsert).toHaveBeenCalledWith({
        where: { eventKey },
        create: {
          eventKey,
          entityType: undefined,
          entityId: undefined,
          metadata: undefined,
        },
        update: {},
      });
    });

    it('should_handle_optional_parameters', async () => {
      const eventKey = 'test-event-key';
      const mockTx = {
        processedEvent: {
          upsert: vi.fn().mockResolvedValue(mockProcessedEvent),
        },
      } as unknown as Prisma.TransactionClient;

      const result = await service.markProcessed(mockTx, eventKey);

      expect(result).toEqual(mockProcessedEvent);
      expect(mockTx.processedEvent.upsert).toHaveBeenCalledWith({
        where: { eventKey },
        create: {
          eventKey,
          entityType: undefined,
          entityId: undefined,
          metadata: undefined,
        },
        update: {},
      });
    });
  });
});
