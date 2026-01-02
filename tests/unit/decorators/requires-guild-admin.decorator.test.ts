/**
 * RequiresGuildAdmin Decorator Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import 'reflect-metadata';
import {
  RequiresGuildAdmin,
  REQUIRES_GUILD_ADMIN_KEY,
} from '@/common/decorators/requires-guild-admin.decorator';
import { Reflector } from '@nestjs/core';

describe('RequiresGuildAdmin Decorator', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('REQUIRES_GUILD_ADMIN_KEY', () => {
    it('should_export_metadata_key_constant', () => {
      expect(REQUIRES_GUILD_ADMIN_KEY).toBe('requiresGuildAdmin');
    });
  });

  describe('RequiresGuildAdmin', () => {
    it('should_set_metadata_with_correct_key_and_value', () => {
      class TestController {
        @RequiresGuildAdmin()
        testMethod() {
          return 'test';
        }
      }

      const reflector = new Reflector();
      const metadata = reflector.get<boolean>(
        REQUIRES_GUILD_ADMIN_KEY,
        TestController.prototype.testMethod,
      );

      expect(metadata).toBe(true);
    });

    it('should_set_metadata_to_true_when_applied', () => {
      class TestController {
        @RequiresGuildAdmin()
        testMethod() {
          return 'test';
        }
      }

      const reflector = new Reflector();
      const metadata = reflector.get<boolean>(
        REQUIRES_GUILD_ADMIN_KEY,
        TestController.prototype.testMethod,
      );

      expect(metadata).toBe(true);
    });

    it('should_work_when_applied_to_controller_class', () => {
      @RequiresGuildAdmin()
      class TestController {
        testMethod() {
          return 'test';
        }
      }

      const reflector = new Reflector();
      const metadata = reflector.get<boolean>(
        REQUIRES_GUILD_ADMIN_KEY,
        TestController,
      );

      expect(metadata).toBe(true);
    });

    it('should_return_undefined_when_not_applied', () => {
      class TestController {
        testMethod() {
          return 'test';
        }
      }

      const reflector = new Reflector();
      const metadata = reflector.get<boolean>(
        REQUIRES_GUILD_ADMIN_KEY,
        TestController.prototype.testMethod,
      );

      expect(metadata).toBeUndefined();
    });
  });
});
