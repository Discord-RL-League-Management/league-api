/**
 * GuildSettingsDefaultsService Unit Tests
 * 
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsDefaultsService } from '@/guilds/services/settings-defaults.service';

describe('SettingsDefaultsService (Guilds)', () => {
  let service: SettingsDefaultsService;

  beforeEach(() => {
    // ARRANGE: Setup test dependencies
    service = new SettingsDefaultsService();
  });

  describe('getDefaults', () => {
    it('should_return_complete_default_settings_structure', () => {
      // ACT
      const result = service.getDefaults();

      // ASSERT
      expect(result).toHaveProperty('_metadata');
      expect(result).toHaveProperty('bot_command_channels');
      expect(result).toHaveProperty('register_command_channels');
      expect(result).toHaveProperty('roles');
      expect(result).toHaveProperty('mmrCalculation');
      expect(result).toHaveProperty('trackerProcessing');
    });

    it('should_include_metadata_with_version_info', () => {
      // ACT
      const result = service.getDefaults();

      // ASSERT
      expect(result._metadata).toBeDefined();
      expect(result._metadata).toHaveProperty('version');
      expect(result._metadata).toHaveProperty('schemaVersion');
    });

    it('should_have_empty_bot_command_channels_by_default', () => {
      // ACT
      const result = service.getDefaults();

      // ASSERT
      expect(result.bot_command_channels).toEqual([]);
    });

    it('should_have_empty_register_command_channels_by_default', () => {
      // ACT
      const result = service.getDefaults();

      // ASSERT
      expect(result.register_command_channels).toEqual([]);
    });

    it('should_have_empty_roles_arrays_by_default', () => {
      // ACT
      const result = service.getDefaults();

      // ASSERT
      expect(result.roles).toBeDefined();
      expect(result.roles.admin).toEqual([]);
      expect(result.roles.moderator).toEqual([]);
      expect(result.roles.member).toEqual([]);
      expect(result.roles.league_manager).toEqual([]);
      expect(result.roles.tournament_manager).toEqual([]);
    });

    it('should_have_default_mmr_calculation_config', () => {
      // ACT
      const result = service.getDefaults();

      // ASSERT
      expect(result.mmrCalculation).toBeDefined();
      expect(result.mmrCalculation.algorithm).toBe('WEIGHTED_AVERAGE');
      expect(result.mmrCalculation.weights).toBeDefined();
      expect(result.mmrCalculation.minGamesPlayed).toBeDefined();
    });

    it('should_have_default_tracker_processing_config', () => {
      // ACT
      const result = service.getDefaults();

      // ASSERT
      expect(result.trackerProcessing).toBeDefined();
      expect(result.trackerProcessing.enabled).toBe(true);
    });
  });

  describe('normalizeToCurrentSchema', () => {
    it('should_add_metadata_when_missing', () => {
      // ARRANGE
      const config = {
        bot_command_channels: [],
      };

      // ACT
      const result = service.normalizeToCurrentSchema(config);

      // ASSERT
      expect(result._metadata).toBeDefined();
      expect(result._metadata.version).toBeDefined();
      expect(result._metadata.schemaVersion).toBeDefined();
    });

    it('should_merge_with_defaults', () => {
      // ARRANGE
      const config = {
        bot_command_channels: [{ id: '123', name: 'test' }],
      };

      // ACT
      const result = service.normalizeToCurrentSchema(config);

      // ASSERT
      expect(result.bot_command_channels).toEqual([
        { id: '123', name: 'test' },
      ]);
      expect(result.register_command_channels).toEqual([]);
      expect(result.roles).toBeDefined();
    });

    it('should_preserve_existing_metadata', () => {
      // ARRANGE
      const config = {
        _metadata: {
          version: '2.0.0',
          schemaVersion: 2,
        },
      };

      // ACT
      const result = service.normalizeToCurrentSchema(config);

      // ASSERT
      expect(result._metadata.version).toBe('2.0.0');
      expect(result._metadata.schemaVersion).toBe(2);
    });
  });
});

