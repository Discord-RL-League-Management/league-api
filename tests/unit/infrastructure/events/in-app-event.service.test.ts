/**
 * InAppEventService Unit Tests
 *
 * Tests for in-app event service implementation.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import { OutboxService } from '@/infrastructure/outbox/services/outbox.service';
import { InAppEventService } from '@/infrastructure/events/services/in-app-event.service';
import { ITransactionClient } from '@/infrastructure/transactions/interfaces/transaction.interface';
import { Prisma } from '@prisma/client';

describe('InAppEventService', () => {
  let service: InAppEventService;
  let mockOutboxService: OutboxService;

  beforeEach(() => {
    mockOutboxService = {
      createEvent: vi.fn(),
    } as unknown as OutboxService;

    service = new InAppEventService(mockOutboxService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('publish', () => {
    it('should_emit_event_to_in_memory_bus', async () => {
      const eventType = 'GUILD_CREATED';
      const payload = { guildId: '123', name: 'Test Guild' };
      let emittedData: unknown;

      // Listen for the event
      const eventEmitter = (service as any).eventEmitter as EventEmitter;
      eventEmitter.once(eventType, (data) => {
        emittedData = data;
      });

      await service.publish(eventType, payload);

      expect(emittedData).toMatchObject({
        eventType,
        payload,
      });
    });

    it('should_include_options_in_event', async () => {
      const eventType = 'LEAGUE_UPDATED';
      const payload = { leagueId: '456' };
      const options = {
        sourceType: 'league',
        sourceId: '456',
        metadata: { userId: '789' },
      };
      let emittedData: unknown;

      const eventEmitter = (service as any).eventEmitter as EventEmitter;
      eventEmitter.once(eventType, (data) => {
        emittedData = data;
      });

      await service.publish(eventType, payload, options);

      expect(emittedData).toMatchObject({
        eventType,
        payload,
        sourceType: options.sourceType,
        sourceId: options.sourceId,
        metadata: options.metadata,
      });
    });

    it('should_handle_events_without_options', async () => {
      const eventType = 'TRACKER_CREATED';
      const payload = { trackerId: '789' };
      let emitted = false;

      const eventEmitter = (service as any).eventEmitter as EventEmitter;
      eventEmitter.once(eventType, () => {
        emitted = true;
      });

      await service.publish(eventType, payload);

      expect(emitted).toBe(true);
    });
  });

  describe('publishWithTransaction', () => {
    it('should_create_outbox_event_within_transaction', async () => {
      const mockTx = {} as Prisma.TransactionClient;
      const eventType = 'GUILD_CREATED';
      const payload = { guildId: '123', name: 'Test Guild' };
      const options = {
        sourceType: 'guild',
        sourceId: '123',
      };
      const mockOutboxEvent = {
        id: 'outbox-1',
        eventType,
        payload: payload as Prisma.InputJsonValue,
      };
      vi.mocked(mockOutboxService.createEvent).mockResolvedValue(
        mockOutboxEvent as any,
      );

      await service.publishWithTransaction(
        mockTx as ITransactionClient,
        eventType,
        payload,
        options,
      );

      expect(mockOutboxService.createEvent).toHaveBeenCalledWith(
        mockTx,
        options.sourceType || 'system',
        options.sourceId || '',
        eventType,
        payload as Prisma.InputJsonValue,
      );
    });

    it('should_use_default_source_when_options_not_provided', async () => {
      const mockTx = {} as Prisma.TransactionClient;
      const eventType = 'LEAGUE_UPDATED';
      const payload = { leagueId: '456' };
      vi.mocked(mockOutboxService.createEvent).mockResolvedValue({
        id: 'outbox-2',
      } as any);

      await service.publishWithTransaction(
        mockTx as ITransactionClient,
        eventType,
        payload,
      );

      expect(mockOutboxService.createEvent).toHaveBeenCalledWith(
        mockTx,
        'system',
        '',
        eventType,
        payload as Prisma.InputJsonValue,
      );
    });

    it('should_handle_transaction_errors', async () => {
      const mockTx = {} as Prisma.TransactionClient;
      const eventType = 'TRACKER_CREATED';
      const payload = { trackerId: '789' };
      const error = new Error('Outbox creation failed');
      vi.mocked(mockOutboxService.createEvent).mockRejectedValue(error);

      await expect(
        service.publishWithTransaction(
          mockTx as ITransactionClient,
          eventType,
          payload,
        ),
      ).rejects.toThrow('Outbox creation failed');
    });
  });
});
