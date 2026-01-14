/**
 * OutboxService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { OutboxService } from './outbox.service';
import { OutboxRepository } from '../repositories/outbox.repository';
import { OutboxStatus } from '@prisma/client';
import {
  OutboxNotFoundException,
  InvalidOutboxStatusException,
} from '../exceptions/outbox.exceptions';

describe('OutboxService', () => {
  let service: OutboxService;
  let mockRepository: OutboxRepository;

  const mockOutboxEvent = {
    id: 'outbox-123',
    sourceType: 'User',
    sourceId: 'user-123',
    eventType: 'USER_CREATED',
    payload: { userId: 'user-123' },
    status: OutboxStatus.PENDING,
    errorMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTransaction = {} as never;

  beforeEach(async () => {
    mockRepository = {
      create: vi.fn(),
      findPendingEvents: vi.fn(),
      findBySource: vi.fn(),
      findById: vi.fn(),
      updateStatus: vi.fn(),
    } as unknown as OutboxRepository;

    const module = await Test.createTestingModule({
      providers: [
        OutboxService,
        { provide: OutboxRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<OutboxService>(OutboxService);
  });

  describe('createEvent', () => {
    it('should_create_event_when_valid_data_provided', async () => {
      vi.spyOn(mockRepository, 'create').mockResolvedValue(
        mockOutboxEvent as never,
      );

      const result = await service.createEvent(
        mockTransaction,
        'User',
        'user-123',
        'USER_CREATED',
        { userId: 'user-123' },
      );

      expect(result).toEqual(mockOutboxEvent);
      expect(mockRepository.create).toHaveBeenCalledWith(
        {
          sourceType: 'User',
          sourceId: 'user-123',
          eventType: 'USER_CREATED',
          payload: { userId: 'user-123' },
        },
        mockTransaction,
      );
    });
  });

  describe('findPendingEvents', () => {
    it('should_return_pending_events_when_called', async () => {
      const mockEvents = [mockOutboxEvent];
      vi.spyOn(mockRepository, 'findPendingEvents').mockResolvedValue(
        mockEvents as never,
      );

      const result = await service.findPendingEvents();

      expect(result).toEqual(mockEvents);
      expect(mockRepository.findPendingEvents).toHaveBeenCalledWith(
        undefined,
        10,
      );
    });

    it('should_filter_by_source_type_when_provided', async () => {
      const mockEvents = [mockOutboxEvent];
      vi.spyOn(mockRepository, 'findPendingEvents').mockResolvedValue(
        mockEvents as never,
      );

      await service.findPendingEvents('User');

      expect(mockRepository.findPendingEvents).toHaveBeenCalledWith('User', 10);
    });

    it('should_use_custom_limit_when_provided', async () => {
      const mockEvents = [mockOutboxEvent];
      vi.spyOn(mockRepository, 'findPendingEvents').mockResolvedValue(
        mockEvents as never,
      );

      await service.findPendingEvents(undefined, 20);

      expect(mockRepository.findPendingEvents).toHaveBeenCalledWith(
        undefined,
        20,
      );
    });
  });

  describe('findBySource', () => {
    it('should_return_events_when_source_provided', async () => {
      const mockEvents = [mockOutboxEvent];
      vi.spyOn(mockRepository, 'findBySource').mockResolvedValue(
        mockEvents as never,
      );

      const result = await service.findBySource('User', 'user-123');

      expect(result).toEqual(mockEvents);
      expect(mockRepository.findBySource).toHaveBeenCalledWith(
        'User',
        'user-123',
      );
    });
  });

  describe('updateStatus', () => {
    it('should_update_status_when_valid_transition', async () => {
      const updatedEvent = {
        ...mockOutboxEvent,
        status: OutboxStatus.PROCESSING,
      };

      vi.spyOn(mockRepository, 'findById').mockResolvedValue(
        mockOutboxEvent as never,
      );
      vi.spyOn(mockRepository, 'updateStatus').mockResolvedValue(
        updatedEvent as never,
      );

      const result = await service.updateStatus(
        'outbox-123',
        OutboxStatus.PROCESSING,
      );

      expect(result).toEqual(updatedEvent);
      expect(mockRepository.findById).toHaveBeenCalledWith('outbox-123');
      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        'outbox-123',
        OutboxStatus.PROCESSING,
        undefined,
      );
    });

    it('should_include_error_message_when_provided', async () => {
      const updatedEvent = {
        ...mockOutboxEvent,
        status: OutboxStatus.FAILED,
        errorMessage: 'Processing failed',
      };

      vi.spyOn(mockRepository, 'findById').mockResolvedValue({
        ...mockOutboxEvent,
        status: OutboxStatus.PROCESSING,
      } as never);
      vi.spyOn(mockRepository, 'updateStatus').mockResolvedValue(
        updatedEvent as never,
      );

      const result = await service.updateStatus(
        'outbox-123',
        OutboxStatus.FAILED,
        'Processing failed',
      );

      expect(result).toEqual(updatedEvent);
      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        'outbox-123',
        OutboxStatus.FAILED,
        'Processing failed',
      );
    });

    it('should_throw_not_found_when_event_does_not_exist', async () => {
      vi.spyOn(mockRepository, 'findById').mockResolvedValue(null as never);

      await expect(
        service.updateStatus('outbox-123', OutboxStatus.PROCESSING),
      ).rejects.toThrow(OutboxNotFoundException);
    });

    it('should_allow_transition_from_pending_to_processing', async () => {
      const pendingEvent = {
        ...mockOutboxEvent,
        status: OutboxStatus.PENDING,
      };
      const updatedEvent = {
        ...pendingEvent,
        status: OutboxStatus.PROCESSING,
      };

      vi.spyOn(mockRepository, 'findById').mockResolvedValue(
        pendingEvent as never,
      );
      vi.spyOn(mockRepository, 'updateStatus').mockResolvedValue(
        updatedEvent as never,
      );

      const result = await service.updateStatus(
        'outbox-123',
        OutboxStatus.PROCESSING,
      );

      expect(result.status).toBe(OutboxStatus.PROCESSING);
    });

    it('should_allow_transition_from_processing_to_completed', async () => {
      const processingEvent = {
        ...mockOutboxEvent,
        status: OutboxStatus.PROCESSING,
      };
      const updatedEvent = {
        ...processingEvent,
        status: OutboxStatus.COMPLETED,
      };

      vi.spyOn(mockRepository, 'findById').mockResolvedValue(
        processingEvent as never,
      );
      vi.spyOn(mockRepository, 'updateStatus').mockResolvedValue(
        updatedEvent as never,
      );

      const result = await service.updateStatus(
        'outbox-123',
        OutboxStatus.COMPLETED,
      );

      expect(result.status).toBe(OutboxStatus.COMPLETED);
    });

    it('should_allow_transition_from_processing_to_pending_for_retry', async () => {
      const processingEvent = {
        ...mockOutboxEvent,
        status: OutboxStatus.PROCESSING,
      };
      const updatedEvent = {
        ...processingEvent,
        status: OutboxStatus.PENDING,
      };

      vi.spyOn(mockRepository, 'findById').mockResolvedValue(
        processingEvent as never,
      );
      vi.spyOn(mockRepository, 'updateStatus').mockResolvedValue(
        updatedEvent as never,
      );

      const result = await service.updateStatus(
        'outbox-123',
        OutboxStatus.PENDING,
      );

      expect(result.status).toBe(OutboxStatus.PENDING);
    });

    it('should_allow_transition_from_processing_to_failed', async () => {
      const processingEvent = {
        ...mockOutboxEvent,
        status: OutboxStatus.PROCESSING,
      };
      const updatedEvent = {
        ...processingEvent,
        status: OutboxStatus.FAILED,
      };

      vi.spyOn(mockRepository, 'findById').mockResolvedValue(
        processingEvent as never,
      );
      vi.spyOn(mockRepository, 'updateStatus').mockResolvedValue(
        updatedEvent as never,
      );

      const result = await service.updateStatus(
        'outbox-123',
        OutboxStatus.FAILED,
      );

      expect(result.status).toBe(OutboxStatus.FAILED);
    });

    it('should_throw_invalid_transition_when_from_pending_to_completed', async () => {
      const pendingEvent = {
        ...mockOutboxEvent,
        status: OutboxStatus.PENDING,
      };

      vi.spyOn(mockRepository, 'findById').mockResolvedValue(
        pendingEvent as never,
      );

      await expect(
        service.updateStatus('outbox-123', OutboxStatus.COMPLETED),
      ).rejects.toThrow(InvalidOutboxStatusException);
    });

    it('should_throw_invalid_transition_when_from_completed_to_processing', async () => {
      const completedEvent = {
        ...mockOutboxEvent,
        status: OutboxStatus.COMPLETED,
      };

      vi.spyOn(mockRepository, 'findById').mockResolvedValue(
        completedEvent as never,
      );

      await expect(
        service.updateStatus('outbox-123', OutboxStatus.PROCESSING),
      ).rejects.toThrow(InvalidOutboxStatusException);
    });

    it('should_throw_invalid_transition_when_from_failed_to_processing', async () => {
      const failedEvent = {
        ...mockOutboxEvent,
        status: OutboxStatus.FAILED,
      };

      vi.spyOn(mockRepository, 'findById').mockResolvedValue(
        failedEvent as never,
      );

      await expect(
        service.updateStatus('outbox-123', OutboxStatus.PROCESSING),
      ).rejects.toThrow(InvalidOutboxStatusException);
    });

    it('should_allow_same_status_transition', async () => {
      const pendingEvent = {
        ...mockOutboxEvent,
        status: OutboxStatus.PENDING,
      };

      vi.spyOn(mockRepository, 'findById').mockResolvedValue(
        pendingEvent as never,
      );
      vi.spyOn(mockRepository, 'updateStatus').mockResolvedValue(
        pendingEvent as never,
      );

      const result = await service.updateStatus(
        'outbox-123',
        OutboxStatus.PENDING,
      );

      expect(result.status).toBe(OutboxStatus.PENDING);
    });
  });
});
