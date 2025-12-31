import { Injectable, Inject } from '@nestjs/common';
import { ILoggingService } from '../../infrastructure/logging/interfaces/logging.interface';
import { GuildSettings } from '../interfaces/settings.interface';
import {
  CURRENT_SCHEMA_VERSION,
  CURRENT_CONFIG_VERSION,
} from '../constants/config-version.constants';
import { SettingsDefaultsService } from './settings-defaults.service';

/**
 * ConfigMigrationService - Single Responsibility: Configuration schema migrations
 *
 * Handles migration of configuration from older schema versions to the current version.
 * Each migration method handles one version increment.
 *
 * Responsibilities:
 * - Version detection
 * - Migration chain orchestration
 * - Schema normalization
 */
@Injectable()
export class ConfigMigrationService {
  private readonly serviceName = ConfigMigrationService.name;

  constructor(
    private readonly settingsDefaults: SettingsDefaultsService,
    @Inject(ILoggingService)
    private readonly loggingService: ILoggingService,
  ) {}

  /**
   * Migrate configuration from any version to current version
   * Single Responsibility: Migration orchestration
   *
   * @param config Configuration object (may be from any version)
   * @returns Migrated configuration matching current schema
   */
  async migrate(config: unknown): Promise<GuildSettings> {
    const schemaVersion = this.getSchemaVersion(config);

    // If already at current version, just normalize structure
    if (schemaVersion === CURRENT_SCHEMA_VERSION) {
      return this.normalizeToCurrentSchema(config);
    }

    this.loggingService.log(
      `Migrating config from schema version ${schemaVersion} to ${CURRENT_SCHEMA_VERSION}`,
      this.serviceName,
    );

    // Apply migration chain
    let migrated: unknown = config;

    // Migration chain: apply each migration in sequence
    if (schemaVersion < 1) {
      migrated = await this.migrateToV1(migrated);
    }

    if (schemaVersion < 2) {
      migrated = await this.migrateToV2(migrated);
    }

    // Future migrations follow the pattern: if (schemaVersion < N) { migrated = await this.migrateToVN(migrated); }

    return this.normalizeToCurrentSchema(migrated);
  }

  /**
   * Get schema version from config
   * Single Responsibility: Version extraction
   *
   * @param config Configuration object
   * @returns Schema version number (0 if not found/legacy)
   */
  getSchemaVersion(config: unknown): number {
    const configObj = config as Record<string, unknown>;
    if (
      configObj?._metadata &&
      typeof configObj._metadata === 'object' &&
      configObj._metadata !== null
    ) {
      const metadata = configObj._metadata as Record<string, unknown>;
      if (typeof metadata.schemaVersion === 'number') {
        return metadata.schemaVersion;
      }
    }

    // Legacy configs without version info
    return 0;
  }

  /**
   * Normalize config to current schema structure
   * Single Responsibility: Schema normalization
   *
   * Ensures config has all required fields and correct structure.
   * Uses SettingsDefaultsService to merge with defaults.
   */
  normalizeToCurrentSchema(config: unknown): GuildSettings {
    return this.settingsDefaults.normalizeToCurrentSchema(
      config as Record<string, unknown>,
    );
  }

  /**
   * Migrate from version 0 (legacy) to version 1
   * Single Responsibility: V0 to V1 migration
   *
   * Handles migration of configs created before versioning was implemented.
   * Ensures all required fields exist and adds metadata.
   * Uses SettingsDefaultsService to merge with defaults.
   */
  private migrateToV1(config: unknown): unknown {
    this.loggingService.log(
      'Applying migration: version 0 → version 1',
      this.serviceName,
    );

    // V1 migration: Merge with defaults to ensure all fields exist
    const migrated = this.settingsDefaults.mergeWithDefaults(
      config as Record<string, unknown>,
    );

    if (!migrated._metadata) {
      migrated._metadata = {
        version: CURRENT_CONFIG_VERSION,
        schemaVersion: 1,
        lastMigrated: new Date(),
      };
    } else {
      migrated._metadata = {
        ...migrated._metadata,
        version: CURRENT_CONFIG_VERSION,
        schemaVersion: 1,
        lastMigrated: new Date(),
      };
    }

    return migrated as unknown;
  }

  /**
   * Migrate from version 1 to version 2
   * Single Responsibility: V1 to V2 migration
   *
   * Migrates from the old complex schema to the new minimal schema.
   * All old fields are dropped, only bot_command_channels remains.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private migrateToV2(_config: unknown): unknown {
    this.loggingService.log(
      'Applying migration: version 1 → version 2',
      this.serviceName,
    );

    // V2 migration: Strip to minimal schema
    const migrated: Record<string, unknown> = {
      _metadata: {
        version: CURRENT_CONFIG_VERSION,
        schemaVersion: 2,
        lastMigrated: new Date(),
      },
      bot_command_channels: [], // Default to listening on all channels
    };

    return migrated;
  }

  /**
   * Check if config needs migration
   * Single Responsibility: Migration necessity check
   *
   * @param config Configuration object
   * @returns true if config needs migration
   */
  needsMigration(config: unknown): boolean {
    const schemaVersion = this.getSchemaVersion(config);
    return schemaVersion < CURRENT_SCHEMA_VERSION;
  }
}
