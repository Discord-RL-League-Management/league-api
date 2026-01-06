import { Injectable } from '@nestjs/common';
import { LeagueConfiguration } from '../interfaces/league-settings.interface';
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
  needsMigration(config: unknown): boolean {
    if (!config || typeof config !== 'object' || config === null) {
      return true; // Missing config needs initialization
    }

    const configObj = config as Record<string, unknown>;
    if (
      !configObj._metadata ||
      typeof configObj._metadata !== 'object' ||
      configObj._metadata === null
    ) {
      return true; // Missing metadata needs initialization
    }

    const metadata = configObj._metadata as Record<string, unknown>;
    const schemaVersion =
      typeof metadata.schemaVersion === 'number' ? metadata.schemaVersion : 1;
    return schemaVersion < CURRENT_SCHEMA_VERSION;
  }

  /**
   * Migrate configuration to current schema version
   * Single Responsibility: Configuration migration
   *
   * @param config - Configuration to migrate
   * @returns Migrated configuration
   */
  migrate(config: unknown): LeagueConfiguration {
    if (!config || typeof config !== 'object' || config === null) {
      return this.settingsDefaults.getDefaults();
    }

    const configObj = config as Record<string, unknown>;
    if (
      !configObj._metadata ||
      typeof configObj._metadata !== 'object' ||
      configObj._metadata === null
    ) {
      const defaults = this.settingsDefaults.getDefaults();
      const merged = this.settingsDefaults.mergeSettings(
        defaults,
        configObj as Partial<LeagueConfiguration>,
      );
      merged._metadata = {
        version: CURRENT_CONFIG_VERSION,
        schemaVersion: CURRENT_SCHEMA_VERSION,
      };
      return merged;
    }

    const metadata = configObj._metadata as Record<string, unknown>;
    const currentVersion =
      typeof metadata.schemaVersion === 'number' ? metadata.schemaVersion : 1;

    // If already at current version, just ensure metadata is up to date
    if (currentVersion >= CURRENT_SCHEMA_VERSION) {
      const version =
        typeof metadata.version === 'string'
          ? metadata.version
          : CURRENT_CONFIG_VERSION;
      return {
        ...configObj,
        _metadata: {
          ...metadata,
          version,
          schemaVersion: CURRENT_SCHEMA_VERSION,
        },
      } as LeagueConfiguration;
    }

    // Migrate from current version to CURRENT_SCHEMA_VERSION
    let migrated: unknown = configObj;
    for (
      let version = currentVersion + 1;
      version <= CURRENT_SCHEMA_VERSION;
      version++
    ) {
      migrated = this.migrateToVersion(migrated, version);
    }

    const migratedObj = migrated as Record<string, unknown>;
    migratedObj._metadata = {
      version: CURRENT_CONFIG_VERSION,
      schemaVersion: CURRENT_SCHEMA_VERSION,
    };

    return migratedObj as unknown as LeagueConfiguration;
  }

  /**
   * Migrate configuration to specific version
   * Single Responsibility: Version-specific migration
   *
   * @param config - Configuration to migrate
   * @param targetVersion - Target schema version
   * @returns Migrated configuration
   */
  private migrateToVersion(config: unknown, targetVersion: number): unknown {
    // For now, just merge with defaults to ensure all fields exist
    // Future versions can add specific migration logic here
    const configObj = config as Record<string, unknown>;
    switch (targetVersion) {
      case 1: {
        const defaults = this.settingsDefaults.getDefaults();
        return this.settingsDefaults.mergeSettings(
          defaults,
          configObj as Partial<LeagueConfiguration>,
        );
      }

      default: {
        // Unknown version - merge with defaults for safety
        const safeDefaults = this.settingsDefaults.getDefaults();
        return this.settingsDefaults.mergeSettings(
          safeDefaults,
          configObj as Partial<LeagueConfiguration>,
        );
      }
    }
  }

  /**
   * Get schema version from configuration
   * Single Responsibility: Schema version extraction
   *
   * @param config - Configuration to check
   * @returns Schema version (defaults to 1)
   */
  getSchemaVersion(config: unknown): number {
    if (!config || typeof config !== 'object' || config === null) {
      return 1;
    }
    const configObj = config as Record<string, unknown>;
    if (
      !configObj._metadata ||
      typeof configObj._metadata !== 'object' ||
      configObj._metadata === null
    ) {
      return 1;
    }
    const metadata = configObj._metadata as Record<string, unknown>;
    if (typeof metadata.schemaVersion === 'number') {
      return metadata.schemaVersion;
    }
    return 1;
  }
}
