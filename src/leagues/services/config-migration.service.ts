import { Injectable } from '@nestjs/common';
import {
  LeagueConfiguration,
  ConfigMetadata,
} from '../interfaces/league-settings.interface';
import {
  CURRENT_SCHEMA_VERSION,
  CURRENT_CONFIG_VERSION,
} from '../constants/config-version.constants';
import { LeagueSettingsDefaultsService } from './league-settings-defaults.service';

/**
 * ConfigMigrationService - Single Responsibility: Configuration version migration
 *
 * Handles migration of league configuration between schema versions.
 * Ensures backward compatibility and smooth upgrades.
 */
@Injectable()
export class ConfigMigrationService {
  constructor(
    private readonly settingsDefaults: LeagueSettingsDefaultsService,
  ) {}

  /**
   * Check if configuration needs migration
   * Single Responsibility: Migration need detection
   *
   * @param config - Configuration to check
   * @returns true if migration is needed
   */
  needsMigration(config: any): boolean {
    if (!config) {
      return true; // Missing config needs initialization
    }

    // Check if config has metadata
    if (!config._metadata) {
      return true; // Missing metadata needs initialization
    }

    // Check schema version
    const schemaVersion = config._metadata.schemaVersion || 1;
    return schemaVersion < CURRENT_SCHEMA_VERSION;
  }

  /**
   * Migrate configuration to current schema version
   * Single Responsibility: Configuration migration
   *
   * @param config - Configuration to migrate
   * @returns Migrated configuration
   */
  migrate(config: any): LeagueConfiguration {
    if (!config) {
      // No config - return defaults
      return this.settingsDefaults.getDefaults();
    }

    // Ensure config has metadata
    if (!config._metadata) {
      // Missing metadata - merge with defaults and update metadata
      const defaults = this.settingsDefaults.getDefaults();
      const merged = this.settingsDefaults.mergeSettings(defaults, config);
      merged._metadata = {
        version: CURRENT_CONFIG_VERSION,
        schemaVersion: CURRENT_SCHEMA_VERSION,
      };
      return merged;
    }

    // Get current schema version from config
    const currentVersion = config._metadata.schemaVersion || 1;

    // If already at current version, just ensure metadata is up to date
    if (currentVersion >= CURRENT_SCHEMA_VERSION) {
      return {
        ...config,
        _metadata: {
          ...config._metadata,
          version: config._metadata.version || CURRENT_CONFIG_VERSION,
          schemaVersion: CURRENT_SCHEMA_VERSION,
        },
      } as LeagueConfiguration;
    }

    // Migrate from current version to CURRENT_SCHEMA_VERSION
    let migrated = config;
    for (
      let version = currentVersion + 1;
      version <= CURRENT_SCHEMA_VERSION;
      version++
    ) {
      migrated = this.migrateToVersion(migrated, version);
    }

    // Update metadata
    migrated._metadata = {
      version: CURRENT_CONFIG_VERSION,
      schemaVersion: CURRENT_SCHEMA_VERSION,
    };

    return migrated as LeagueConfiguration;
  }

  /**
   * Migrate configuration to specific version
   * Single Responsibility: Version-specific migration
   *
   * @param config - Configuration to migrate
   * @param targetVersion - Target schema version
   * @returns Migrated configuration
   */
  private migrateToVersion(config: any, targetVersion: number): any {
    // For now, just merge with defaults to ensure all fields exist
    // Future versions can add specific migration logic here
    switch (targetVersion) {
      case 1:
        // Version 1 is the initial version - merge with defaults
        const defaults = this.settingsDefaults.getDefaults();
        return this.settingsDefaults.mergeSettings(defaults, config);

      default:
        // Unknown version - merge with defaults for safety
        const safeDefaults = this.settingsDefaults.getDefaults();
        return this.settingsDefaults.mergeSettings(safeDefaults, config);
    }
  }

  /**
   * Get schema version from configuration
   * Single Responsibility: Schema version extraction
   *
   * @param config - Configuration to check
   * @returns Schema version (defaults to 1)
   */
  getSchemaVersion(config: any): number {
    if (!config || !config._metadata) {
      return 1;
    }
    return config._metadata.schemaVersion || 1;
  }
}
