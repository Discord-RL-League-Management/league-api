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
      roles: {
        admin: [],
        moderator: [],
        member: [],
        league_manager: [],
        tournament_manager: [],
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

    // Ensure metadata is present
    if (!normalized._metadata) {
      normalized._metadata = this.getDefaultMetadata();
    } else {
      // Ensure metadata has current version if missing
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

      // Handle arrays - replace completely (no merging of role arrays)
      if (sourceValue && Array.isArray(sourceValue)) {
        (result[keyTyped] as unknown) = sourceValue;
        continue;
      }

      // Handle nested objects - recursive merge
      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue)
      ) {
        (result[keyTyped] as unknown) = this.deepMergeNested(
          targetValue as any,
          sourceValue as any,
        );
        continue;
      }

      // Handle primitives
      (result[keyTyped] as unknown) = sourceValue;
    }

    return result;
  }

  /**
   * Deep merge nested objects (for channels, roles, etc.)
   */
  private deepMergeNested(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source[key] === undefined || source[key] === null) {
        continue;
      }

      const sourceValue = source[key];

      // Handle arrays - replace completely
      if (Array.isArray(sourceValue)) {
        result[key] = sourceValue;
        continue;
      }

      // Handle nested objects - recursive merge
      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue)
      ) {
        result[key] = this.deepMergeNested(result[key] || {}, sourceValue);
        continue;
      }

      // Handle primitives
      result[key] = sourceValue;
    }

    return result;
  }
}
