/**
 * InternalController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { InternalController } from './internal.controller';

describe('InternalController', () => {
  let controller: InternalController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [InternalController],
    }).compile();

    controller = module.get<InternalController>(InternalController);
  });

  describe('healthCheck', () => {
    it('should_return_health_status_when_endpoint_is_called', () => {
      const beforeTime = new Date().toISOString();

      const result = controller.healthCheck();

      const afterTime = new Date().toISOString();
      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty(
        'message',
        'Bot authenticated successfully',
      );
      expect(result).toHaveProperty('timestamp');
      // Convert to Date objects for numeric comparison
      expect(new Date(result.timestamp).getTime()).toBeGreaterThanOrEqual(
        new Date(beforeTime).getTime(),
      );
      expect(new Date(result.timestamp).getTime()).toBeLessThanOrEqual(
        new Date(afterTime).getTime(),
      );
      expect(() => new Date(result.timestamp)).not.toThrow();
    });

    it('should_return_valid_timestamp_when_health_check_is_called', () => {
      const result = controller.healthCheck();

      expect(typeof result.timestamp).toBe('string');
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });
});
