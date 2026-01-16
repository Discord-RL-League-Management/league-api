/**
 * GuildSettingsDefaultsService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SettingsDefaultsService } from '../services/settings-defaults.service';

describe('SettingsDefaultsService (Guilds)', () => {
  let service: SettingsDefaultsService;

  beforeEach(() => {
    service = new SettingsDefaultsService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getDefaults', () => {
    it('should_return_complete_default_settings_structure', () => {
      const result = service.getDefaults();

      expect(result).toMatchObject({
        _metadata: expect.anything(),
        bot_command_channels: expect.anything(),
        register_command_channels: expect.anything(),
        test_command_channels: expect.anything(),
        public_command_channels: expect.anything(),
        staff_command_channels: expect.anything(),
        roles: expect.anything(),
      });
      expect(result).toMatchObject({
        mmrCalculation: expect.anything(),
        trackerProcessing: expect.anything(),
      });
    });

    it('should_include_metadata_with_version_info', () => {
      const result = service.getDefaults();

      expect(result._metadata).toBeDefined();
      expect(result._metadata).toHaveProperty('version');
      expect(result._metadata).toHaveProperty('schemaVersion');
    });

    it('should_have_empty_bot_command_channels_by_default', () => {
      const result = service.getDefaults();

      expect(result.bot_command_channels).toEqual([]);
    });

    it('should_have_empty_register_command_channels_by_default', () => {
      const result = service.getDefaults();

      expect(result.register_command_channels).toEqual([]);
    });

    it('should_have_empty_test_command_channels_by_default', () => {
      const result = service.getDefaults();

      expect(result.test_command_channels).toEqual([]);
    });

    it('should_have_empty_public_command_channels_by_default', () => {
      const result = service.getDefaults();

      expect(result.public_command_channels).toEqual([]);
    });

    it('should_have_empty_staff_command_channels_by_default', () => {
      const result = service.getDefaults();

      expect(result.staff_command_channels).toEqual([]);
    });

    it('should_have_empty_roles_arrays_by_default', () => {
      const result = service.getDefaults();

      expect(result.roles).toBeDefined();
      expect(result.roles!).toEqual({
        admin: [],
        moderator: [],
        member: [],
        league_manager: [],
        tournament_manager: [],
      });
    });

    it('should_have_default_mmr_calculation_config', () => {
      const result = service.getDefaults();

      expect(result.mmrCalculation).toBeDefined();
      expect(result.mmrCalculation!.algorithm).toBe('WEIGHTED_AVERAGE');
      expect(result.mmrCalculation!.weights).toBeDefined();
      expect(result.mmrCalculation!.minGamesPlayed).toBeDefined();
    });

    it('should_have_default_tracker_processing_config', () => {
      const result = service.getDefaults();

      expect(result.trackerProcessing).toBeDefined();
      expect(result.trackerProcessing!.enabled).toBe(true);
    });
  });

  describe('normalizeToCurrentSchema', () => {
    it('should_add_metadata_when_missing', () => {
      const config = {
        bot_command_channels: [],
      };

      const result = service.normalizeToCurrentSchema(config);

      expect(result._metadata).toBeDefined();
      expect(result._metadata!.version).toBeDefined();
      expect(result._metadata!.schemaVersion).toBeDefined();
    });

    it('should_merge_with_defaults', () => {
      const config = {
        bot_command_channels: [{ id: '123', name: 'test' }],
      };

      const result = service.normalizeToCurrentSchema(config);

      expect(result.bot_command_channels).toEqual([
        { id: '123', name: 'test' },
      ]);
      expect(result.register_command_channels).toEqual([]);
      expect(result.roles).toBeDefined();
    });

    it('should_preserve_existing_metadata', () => {
      const config = {
        _metadata: {
          version: '2.0.0',
          schemaVersion: 2,
        },
      };

      const result = service.normalizeToCurrentSchema(config);

      expect(result._metadata!.version).toBe('2.0.0');
      expect(result._metadata!.schemaVersion).toBe(2);
    });
  });
});
