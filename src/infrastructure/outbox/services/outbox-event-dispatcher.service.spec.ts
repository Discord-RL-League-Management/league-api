/**
 * OutboxEventDispatcher Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OutboxEventDispatcher } from './outbox-event-dispatcher.service';
import { Outbox } from '@prisma/client';

describe('OutboxEventDispatcher', () => {
  let service: OutboxEventDispatcher;

  beforeEach(() => {
    service = new OutboxEventDispatcher();
  });

  describe('dispatchEvent', () => {
    it('should_skip_deprecated_event_types', async () => {
      const event: Outbox = {
        id: 'event-123',
        eventType: 'TRACKER_REGISTRATION_CREATED',
        payload: {},
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Outbox;

      await expect(service.dispatchEvent(event)).resolves.toBeUndefined();
    });

    it('should_throw_error_for_unknown_event_types', () => {
      const event: Outbox = {
        id: 'event-123',
        eventType: 'UNKNOWN_EVENT_TYPE',
        payload: {},
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Outbox;

      expect(() => service.dispatchEvent(event)).toThrow(
        /No handler implemented/,
      );
    });
  });
});
