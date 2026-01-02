/**
 * GuildIdParam Decorator Unit Tests
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
  GuildIdParam,
  GUILD_ID_PARAM_KEY,
} from '@/common/decorators/guild-id-param.decorator';
import { Reflector } from '@nestjs/core';

describe('GuildIdParam Decorator', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GUILD_ID_PARAM_KEY', () => {
    it('should_export_metadata_key_constant', () => {
      expect(GUILD_ID_PARAM_KEY).toBe('guildIdParam');
    });
  });

  describe('GuildIdParam', () => {
    it('should_set_metadata_with_default_param_name_id', () => {
      class TestController {
        @GuildIdParam()
        testMethod() {
          return 'test';
        }
      }

      const reflector = new Reflector();
      const metadata = reflector.get<string>(
        GUILD_ID_PARAM_KEY,
        TestController.prototype.testMethod,
      );

      expect(metadata).toBe('id');
    });

    it('should_set_metadata_with_custom_param_name', () => {
      class TestController {
        @GuildIdParam('guildId')
        testMethod() {
          return 'test';
        }
      }

      const reflector = new Reflector();
      const metadata = reflector.get<string>(
        GUILD_ID_PARAM_KEY,
        TestController.prototype.testMethod,
      );

      expect(metadata).toBe('guildId');
    });

    it('should_set_metadata_with_alternative_param_name', () => {
      class TestController {
        @GuildIdParam('serverId')
        testMethod() {
          return 'test';
        }
      }

      const reflector = new Reflector();
      const metadata = reflector.get<string>(
        GUILD_ID_PARAM_KEY,
        TestController.prototype.testMethod,
      );

      expect(metadata).toBe('serverId');
    });

    it('should_work_when_applied_to_controller_class', () => {
      @GuildIdParam('guildId')
      class TestController {
        testMethod() {
          return 'test';
        }
      }

      const reflector = new Reflector();
      const metadata = reflector.get<string>(
        GUILD_ID_PARAM_KEY,
        TestController,
      );

      expect(metadata).toBe('guildId');
    });

    it('should_return_undefined_when_not_applied', () => {
      class TestController {
        testMethod() {
          return 'test';
        }
      }

      const reflector = new Reflector();
      const metadata = reflector.get<string>(
        GUILD_ID_PARAM_KEY,
        TestController.prototype.testMethod,
      );

      expect(metadata).toBeUndefined();
    });
  });
});
