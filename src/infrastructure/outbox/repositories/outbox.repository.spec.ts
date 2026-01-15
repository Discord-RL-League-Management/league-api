/**
 * OutboxRepository Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OutboxRepository } from './outbox.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { Outbox, OutboxStatus, Prisma } from '@prisma/client';

describe('OutboxRepository', () => {
  let repository: OutboxRepository;
  let mockPrisma: PrismaService;

  const mockOutbox: Outbox = {
    id: 'outbox_123',
    sourceType: 'League',
    sourceId: 'league_123',
    eventType: 'league.created',
    payload: { name: 'Test League' },
    status: OutboxStatus.PENDING,
    errorMessage: null,
    processedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrisma = {
      outbox: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
    } as unknown as PrismaService;

    repository = new OutboxRepository(mockPrisma);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('create', () => {
    it('should_create_outbox_event_without_transaction', async () => {
      const data: Prisma.OutboxCreateInput = {
        sourceType: 'League',
        sourceId: 'league_123',
        eventType: 'league.created',
        payload: { name: 'Test League' },
        status: OutboxStatus.PENDING,
      };

      vi.mocked(mockPrisma.outbox.create).mockResolvedValue(mockOutbox);

      const result = await repository.create(data);

      expect(result).toEqual(mockOutbox);
      expect(mockPrisma.outbox.create).toHaveBeenCalledWith({ data });
    });

    it('should_create_outbox_event_with_transaction', async () => {
      const data: Prisma.OutboxCreateInput = {
        sourceType: 'League',
        sourceId: 'league_123',
        eventType: 'league.created',
        payload: { name: 'Test League' },
        status: OutboxStatus.PENDING,
      };
      const mockTx = {
        outbox: {
          create: vi.fn().mockResolvedValue(mockOutbox),
        },
      } as unknown as Prisma.TransactionClient;

      const result = await repository.create(data, mockTx);

      expect(result).toEqual(mockOutbox);
      expect(mockTx.outbox.create).toHaveBeenCalledWith({ data });
      expect(mockPrisma.outbox.create).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should_return_outbox_event_when_found', async () => {
      const id = 'outbox_123';

      vi.mocked(mockPrisma.outbox.findUnique).mockResolvedValue(mockOutbox);

      const result = await repository.findById(id);

      expect(result).toEqual(mockOutbox);
      expect(mockPrisma.outbox.findUnique).toHaveBeenCalledWith({
        where: { id },
      });
    });

    it('should_return_null_when_outbox_event_not_found', async () => {
      const id = 'nonexistent';

      vi.mocked(mockPrisma.outbox.findUnique).mockResolvedValue(null);

      const result = await repository.findById(id);

      expect(result).toBeNull();
      expect(mockPrisma.outbox.findUnique).toHaveBeenCalledWith({
        where: { id },
      });
    });
  });

  describe('findPendingEvents', () => {
    it('should_return_pending_events_without_source_type', async () => {
      const events = [mockOutbox];

      vi.mocked(mockPrisma.outbox.findMany).mockResolvedValue(events);

      const result = await repository.findPendingEvents();

      expect(result).toEqual(events);
      expect(mockPrisma.outbox.findMany).toHaveBeenCalledWith({
        where: {
          status: OutboxStatus.PENDING,
        },
        orderBy: { createdAt: 'asc' },
        take: 10,
      });
    });

    it('should_return_pending_events_with_source_type', async () => {
      const sourceType = 'League';
      const events = [mockOutbox];

      vi.mocked(mockPrisma.outbox.findMany).mockResolvedValue(events);

      const result = await repository.findPendingEvents(sourceType);

      expect(result).toEqual(events);
      expect(mockPrisma.outbox.findMany).toHaveBeenCalledWith({
        where: {
          status: OutboxStatus.PENDING,
          sourceType,
        },
        orderBy: { createdAt: 'asc' },
        take: 10,
      });
    });

    it('should_use_custom_limit', async () => {
      const limit = 20;
      const events = [mockOutbox];

      vi.mocked(mockPrisma.outbox.findMany).mockResolvedValue(events);

      const result = await repository.findPendingEvents(undefined, limit);

      expect(result).toEqual(events);
      expect(mockPrisma.outbox.findMany).toHaveBeenCalledWith({
        where: {
          status: OutboxStatus.PENDING,
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
      });
    });
  });

  describe('findBySource', () => {
    it('should_return_events_for_source', async () => {
      const sourceType = 'League';
      const sourceId = 'league_123';
      const events = [mockOutbox];

      vi.mocked(mockPrisma.outbox.findMany).mockResolvedValue(events);

      const result = await repository.findBySource(sourceType, sourceId);

      expect(result).toEqual(events);
      expect(mockPrisma.outbox.findMany).toHaveBeenCalledWith({
        where: {
          sourceType,
          sourceId,
        },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should_return_empty_array_when_no_events_exist', async () => {
      const sourceType = 'League';
      const sourceId = 'league_123';

      vi.mocked(mockPrisma.outbox.findMany).mockResolvedValue([]);

      const result = await repository.findBySource(sourceType, sourceId);

      expect(result).toEqual([]);
      expect(mockPrisma.outbox.findMany).toHaveBeenCalledWith({
        where: {
          sourceType,
          sourceId,
        },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('update', () => {
    it('should_update_outbox_event', async () => {
      const id = 'outbox_123';
      const data: Prisma.OutboxUpdateInput = {
        status: OutboxStatus.COMPLETED,
      };
      const updatedOutbox = { ...mockOutbox, status: OutboxStatus.COMPLETED };

      vi.mocked(mockPrisma.outbox.update).mockResolvedValue(updatedOutbox);

      const result = await repository.update(id, data);

      expect(result).toEqual(updatedOutbox);
      expect(mockPrisma.outbox.update).toHaveBeenCalledWith({
        where: { id },
        data,
      });
    });
  });

  describe('updateStatus', () => {
    it('should_update_status_without_error_message', async () => {
      const id = 'outbox_123';
      const status = OutboxStatus.PROCESSING;
      const updatedOutbox = { ...mockOutbox, status };

      vi.mocked(mockPrisma.outbox.update).mockResolvedValue(updatedOutbox);

      const result = await repository.updateStatus(id, status);

      expect(result).toEqual(updatedOutbox);
      expect(mockPrisma.outbox.update).toHaveBeenCalledWith({
        where: { id },
        data: {
          status,
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should_update_status_with_error_message', async () => {
      const id = 'outbox_123';
      const status = OutboxStatus.FAILED;
      const errorMessage = 'Processing failed';
      const updatedOutbox = {
        ...mockOutbox,
        status,
        errorMessage,
      };

      vi.mocked(mockPrisma.outbox.update).mockResolvedValue(updatedOutbox);

      const result = await repository.updateStatus(id, status, errorMessage);

      expect(result).toEqual(updatedOutbox);
      expect(mockPrisma.outbox.update).toHaveBeenCalledWith({
        where: { id },
        data: {
          status,
          errorMessage,
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should_set_processed_at_when_status_is_completed', async () => {
      const id = 'outbox_123';
      const status = OutboxStatus.COMPLETED;
      const updatedOutbox = {
        ...mockOutbox,
        status,
        processedAt: new Date(),
      };

      vi.mocked(mockPrisma.outbox.update).mockResolvedValue(updatedOutbox);

      const result = await repository.updateStatus(id, status);

      expect(result).toEqual(updatedOutbox);
      expect(mockPrisma.outbox.update).toHaveBeenCalledWith({
        where: { id },
        data: {
          status,
          processedAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      });
    });
  });
});
