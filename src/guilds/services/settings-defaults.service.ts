import { Injectable } from '@nestjs/common';
import {
  GuildSettings,
  ConfigMetadata,
} from '../interfaces/settings.interface';
import {
  CURRENT_SCHEMA_VERSION,
  CURRENT_CONFIG_VERSION,
} from '../constants/config-version.constants';

@Injectable()
export class SettingsDefaultsService {
  /**
   * Get default settings structure
   * Single Responsibility: Default settings definition
   *
   * Returns the complete default configuration for a new guild.
   * These defaults are used by:
   * - Database trigger (auto-creates settings on guild insert)
   * - Repository upsert operations
   * - Service layer lazy initialization
   *
   * Default structure:
   * - _metadata: Version tracking info (schemaVersion, configVersion)
   * - bot_command_channels: Empty array (listen on all channels)
   *
   * @returns Complete default guild settings structure with metadata
   */
  getDefaults(): GuildSettings {
    return {
      _metadata: this.getDefaultMetadata(),
      bot_command_channels: [], // Empty = listen on all channels
      register_command_channels: [], // Empty = use bot_command_channels fallback
      test_command_channels: [], // Empty = all channels
      public_command_channels: [], // Empty = all channels
      staff_command_channels: [], // Empty = all channels
      roles: {
        admin: [],
        moderator: [],
        member: [],
        league_manager: [],
        tournament_manager: [],
      },
      mmrCalculation: {
        algorithm: 'WEIGHTED_AVERAGE',
        weights: {
          ones: 0.1,
          twos: 0.3,
          threes: 0.5,
          fours: 0.1,
        },
        minGamesPlayed: {
          ones: 50,
          twos: 50,
          threes: 50,
          fours: 50,
        },
      },
      trackerProcessing: {
        enabled: true,
      },
    };
  }

  /**
   * Get default metadata with current version
   * Single Responsibility: Default metadata structure
   */
  private getDefaultMetadata(): ConfigMetadata {
    return {
      version: CURRENT_CONFIG_VERSION,
      schemaVersion: CURRENT_SCHEMA_VERSION,
    };
  }

  /**
   * Normalize config to current schema structure
   * Ensures metadata is present if missing
   * Single Responsibility: Metadata normalization
   */
  normalizeToCurrentSchema(config: Partial<GuildSettings>): GuildSettings {
    const normalized = this.mergeWithDefaults(config);

    if (!normalized._metadata) {
      normalized._metadata = this.getDefaultMetadata();
    } else {
      normalized._metadata = {
        ...this.getDefaultMetadata(),
        ...normalized._metadata,
        version: normalized._metadata.version || CURRENT_CONFIG_VERSION,
        schemaVersion:
          normalized._metadata.schemaVersion || CURRENT_SCHEMA_VERSION,
      };
    }

    return normalized;
  }

  /**
   * Merge new settings with defaults
   * Single Responsibility: Settings merging logic with defaults
   */
  mergeWithDefaults(settings: Partial<GuildSettings>): GuildSettings {
    const defaults = this.getDefaults();
    return this.deepMerge(defaults, settings);
  }

  /**
   * Merge new settings with current settings
   * Single Responsibility: Settings update merging
   */
  mergeSettings(
    current: GuildSettings,
    newSettings: Partial<GuildSettings>,
  ): GuildSettings {
    return this.deepMerge(current, newSettings);
  }

  /**
   * Deep merge two objects with proper array handling
   * Single Responsibility: Object merging utility
   */
  private deepMerge(
    target: GuildSettings,
    source: Partial<GuildSettings>,
  ): GuildSettings {
    const result = { ...target };

    for (const key in source) {
      if (
        !(key in source) ||
        source[key as keyof Partial<GuildSettings>] === undefined ||
        source[key as keyof Partial<GuildSettings>] === null
      ) {
        continue;
      }

      const keyTyped = key as keyof GuildSettings;
      const sourceValue = source[keyTyped];
      const targetValue = result[keyTyped];

      // Arrays are replaced completely (no merging of role arrays)
      if (sourceValue && Array.isArray(sourceValue)) {
        (result[keyTyped] as unknown) = sourceValue;
        continue;
      }

      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue)
      ) {
        (result[keyTyped] as unknown) = this.deepMergeNested(
          (targetValue as Record<string, unknown>) || {},
          sourceValue as Record<string, unknown>,
        );
        continue;
      }

      (result[keyTyped] as unknown) = sourceValue;
    }

    return result;
  }

  /**
   * Deep merge nested objects (for channels, roles, etc.)
   */
  private deepMergeNested(
    target: Record<string, unknown>,
    source: Record<string, unknown>,
  ): Record<string, unknown> {
    const result = { ...target };

    for (const key in source) {
      if (source[key] === undefined || source[key] === null) {
        continue;
      }

      const sourceValue = source[key];

      if (Array.isArray(sourceValue)) {
        result[key] = sourceValue;
        continue;
      }

      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue)
      ) {
        result[key] = this.deepMergeNested(
          (result[key] as Record<string, unknown>) || {},
          sourceValue as Record<string, unknown>,
        );
        continue;
      }

      result[key] = sourceValue;
    }

    return result;
  }
}
