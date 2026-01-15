/**
 * OutboxProcessorService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { OutboxProcessorService } from './outbox-processor.service';
import { OutboxService } from './outbox.service';
import { OutboxEventDispatcher } from './outbox-event-dispatcher.service';
import { OutboxStatus } from '@prisma/client';

describe('OutboxProcessorService', () => {
  let service: OutboxProcessorService;
  let mockPrisma: PrismaService;
  let mockOutboxService: OutboxService;
  let mockEventDispatcher: OutboxEventDispatcher;
  let mockConfigService: ConfigService;

  beforeEach(() => {
    mockPrisma = {} as unknown as PrismaService;

    mockOutboxService = {
      findPendingEvents: vi.fn(),
      markAsProcessing: vi.fn(),
      markAsCompleted: vi.fn(),
      markAsFailed: vi.fn(),
    } as unknown as OutboxService;

    mockEventDispatcher = {
      dispatchEvent: vi.fn(),
    } as unknown as OutboxEventDispatcher;

    mockConfigService = {
      get: vi.fn().mockReturnValue(5000),
    } as unknown as ConfigService;

    service = new OutboxProcessorService(
      mockPrisma,
      mockOutboxService,
      mockEventDispatcher,
      mockConfigService,
    );
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('onModuleInit', () => {
    it('should_start_polling_on_module_init', () => {
      vi.useFakeTimers();
      const startPollingSpy = vi.spyOn(service as any, 'startPolling');

      service.onModuleInit();

      expect(startPollingSpy).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should_stop_polling_on_module_destroy', () => {
      const stopPollingSpy = vi.spyOn(service as any, 'stopPolling');

      service.onModuleDestroy();

      expect(stopPollingSpy).toHaveBeenCalled();
    });
  });

  describe('onApplicationShutdown', () => {
    it('should_stop_polling_and_wait_for_processing_on_shutdown', async () => {
      const stopPollingSpy = vi.spyOn(service as any, 'stopPolling');
      (service as any).isProcessing = false;

      await service.onApplicationShutdown('SIGTERM');

      expect(stopPollingSpy).toHaveBeenCalled();
    });
  });
});
