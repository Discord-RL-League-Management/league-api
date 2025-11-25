import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { SettingsService } from '../infrastructure/settings/services/settings.service';
import { LeagueRepository } from './repositories/league.repository';
import { LeagueSettingsDefaultsService } from './services/league-settings-defaults.service';
import { SettingsValidationService } from './services/settings-validation.service';
import { ConfigMigrationService } from './services/config-migration.service';
import {
  LeagueConfiguration,
} from './interfaces/league-settings.interface';
import { LeagueNotFoundException } from './exceptions/league.exceptions';
import { LeagueSettingsDto } from './dto/league-settings.dto';

/**
 * LeagueSettingsService - Single Responsibility: League configuration management
 * 
 * Handles league settings retrieval, updates, caching, and migration.
 * Provides lazy initialization of settings if they don't exist.
 */
@Injectable()
export class LeagueSettingsService {
  private readonly logger = new Logger(LeagueSettingsService.name);
  private readonly cacheTtl: number;

  constructor(
    private settingsService: SettingsService,
    private leagueRepository: LeagueRepository,
    private settingsDefaults: LeagueSettingsDefaultsService,
    private settingsValidation: SettingsValidationService,
    private configMigration: ConfigMigrationService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.cacheTtl = 300; // 5 minutes cache TTL
  }

  /**
   * Get league settings with caching and defaults
   * Single Responsibility: Settings retrieval with caching and lazy initialization
   * 
   * Automatically persists default settings if they don't exist (lazy initialization).
   * Settings creation is independent of user validation - they exist regardless of who accesses them.
   * If settings don't exist, that's a bug - auto-create them immediately.
   * If creation fails, that's a system error - throw it.
   */
  async getSettings(leagueId: string): Promise<LeagueConfiguration> {
    try {
      const cacheKey = `league:${leagueId}:settings`;
      const cached = await this.cacheManager.get<LeagueConfiguration>(cacheKey);
      if (cached) {
        this.logger.log(`Settings cache hit for league ${leagueId}`);
        return cached;
      }

      let settings = await this.settingsService.getSettings('league', leagueId);

      // If settings don't exist, ensure league exists first, then auto-create and persist settings
      if (!settings) {
        // Verify league exists (defense-in-depth)
        const leagueExists = await this.leagueRepository.exists(leagueId);
        if (!leagueExists) {
          throw new LeagueNotFoundException(leagueId);
        }

        // Auto-create and persist default settings using existing upsert method
        const defaultSettings = this.settingsDefaults.getDefaults();
        settings = await this.settingsService.upsertSettings(
          'league',
          leagueId,
          defaultSettings as Record<string, any>,
          1, // schemaVersion
          undefined, // configVersion
        );
        this.logger.warn(
          `Auto-created missing settings for league ${leagueId}. This should not happen if settings were created with league.`,
        );
      }

      // Migrate config to current schema version if needed
      let migratedConfig: LeagueConfiguration;
      if (this.configMigration.needsMigration(settings.settings as any)) {
        this.logger.log(
          `Migrating league ${leagueId} settings from schema version ${this.configMigration.getSchemaVersion(settings.settings as any)} to ${1}`,
        );
        migratedConfig = this.configMigration.migrate(settings.settings as any);
        
        // Persist migrated config
        await this.settingsService.updateSettings(
          'league',
          leagueId,
          migratedConfig as Record<string, any>,
        );
        this.logger.log(`Successfully migrated settings for league ${leagueId}`);
      } else {
        migratedConfig = settings.settings as unknown as LeagueConfiguration;
      }

      // Ensure config structure is normalized (merge with defaults to ensure all fields exist)
      const normalized = this.settingsDefaults.mergeSettings(
        this.settingsDefaults.getDefaults(),
        migratedConfig,
      );

      // Cache the result
      await this.cacheManager.set(cacheKey, normalized, this.cacheTtl * 1000);

      return normalized;
    } catch (error) {
      if (error instanceof LeagueNotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to get settings for league ${leagueId}:`, error);
      throw new NotFoundException('League', leagueId);
    }
  }

  /**
   * Update league settings with validation and caching
   * Single Responsibility: Settings update with validation
   * 
   * Validates new settings, merges with existing, and persists.
   * Invalidates cache after update.
   */
  async updateSettings(
    leagueId: string,
    newSettings: Partial<LeagueSettingsDto>,
  ): Promise<LeagueConfiguration> {
    try {
      // Verify league exists
      const leagueExists = await this.leagueRepository.exists(leagueId);
      if (!leagueExists) {
        throw new LeagueNotFoundException(leagueId);
      }

      // Get current settings
      const currentSettings = await this.getSettings(leagueId);

      // Merge new settings with current settings
      const mergedSettings = this.settingsDefaults.mergeSettings(
        currentSettings,
        newSettings as Partial<LeagueConfiguration>,
      );

      // Validate merged settings
      this.settingsValidation.validate(mergedSettings);

      // Persist updated settings
      await this.settingsService.updateSettings(
        'league',
        leagueId,
        mergedSettings as Record<string, any>,
      );

      // Invalidate cache
      const cacheKey = `league:${leagueId}:settings`;
      await this.cacheManager.del(cacheKey);

      this.logger.log(`Updated settings for league ${leagueId}`);
      return mergedSettings;
    } catch (error) {
      if (error instanceof LeagueNotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update settings for league ${leagueId}:`, error);
      throw error;
    }
  }
}


