import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Inject,
} from '@nestjs/common';
import { GuildSettingsDto } from './dto/guild-settings.dto';
import { ILoggingService } from '../infrastructure/logging/interfaces/logging.interface';
import { SettingsDefaultsService } from './services/settings-defaults.service';
import { SettingsValidationService } from './services/settings-validation.service';
import { ConfigMigrationService } from './services/config-migration.service';
import { SETTINGS_CACHE_TTL } from './constants/settings.constants';
import { ICachingService } from '../infrastructure/caching/interfaces/caching.interface';
import { GuildSettings } from './interfaces/settings.interface';
import { GuildRepository } from './repositories/guild.repository';
import { SettingsService } from '../infrastructure/settings/services/settings.service';
import { ActivityLogService } from '../infrastructure/activity-log/services/activity-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  ITransactionService,
  ITransactionClient,
} from '../infrastructure/transactions/interfaces/transaction.interface';

@Injectable()
export class GuildSettingsService {
  private readonly serviceName = GuildSettingsService.name;

  constructor(
    private guildRepository: GuildRepository,
    private settingsDefaults: SettingsDefaultsService,
    private settingsValidation: SettingsValidationService,
    private configMigration: ConfigMigrationService,
    private settingsService: SettingsService,
    private activityLogService: ActivityLogService,
    private prisma: PrismaService,
    @Inject(ICachingService) private cachingService: ICachingService,
    @Inject(ITransactionService)
    private transactionService: ITransactionService,
    @Inject(ILoggingService)
    private readonly loggingService: ILoggingService,
  ) {}

  /**
   * Get guild settings with caching and defaults
   * Single Responsibility: Settings retrieval with caching and lazy initialization
   *
   * Automatically persists default settings if they don't exist (lazy initialization).
   * Settings creation is independent of user validation - they exist regardless of who accesses them.
   * If settings don't exist, that's a bug - auto-create them immediately.
   * If creation fails, that's a system error - throw it.
   */
  async getSettings(guildId: string): Promise<GuildSettings> {
    try {
      const cacheKey = `settings:${guildId}`;
      const cached = await this.cachingService.get<GuildSettings>(cacheKey);
      if (cached) {
        this.loggingService.log(
          `Settings cache hit for guild ${guildId}`,
          this.serviceName,
        );
        return cached;
      }

      let settings = await this.settingsService.getSettings('guild', guildId);

      if (!settings) {
        // Verify guild exists (defense-in-depth)
        const guildExists = await this.guildRepository.exists(guildId);
        if (!guildExists) {
          throw new NotFoundException(`Guild ${guildId} not found`);
        }

        const defaultSettings = this.settingsDefaults.getDefaults();
        settings = await this.settingsService.upsertSettings(
          'guild',
          guildId,
          defaultSettings as unknown as Prisma.InputJsonValue,
          this.configMigration.getSchemaVersion(defaultSettings),
        );
        this.loggingService.warn(
          `Auto-created missing settings for guild ${guildId}. This should not happen if database trigger is working properly.`,
          this.serviceName,
        );
      }

      let migratedConfig: GuildSettings;
      const rawSettings = settings.settings as unknown;
      if (
        this.configMigration.needsMigration(
          rawSettings as Record<string, unknown>,
        )
      ) {
        this.loggingService.log(
          `Migrating settings for guild ${guildId} from schema version ${this.configMigration.getSchemaVersion(rawSettings as Record<string, unknown>)}`,
          this.serviceName,
        );

        migratedConfig = await this.configMigration.migrate(
          rawSettings as Record<string, unknown>,
        );

        this.settingsValidation.validateStructure(migratedConfig);

        settings = await this.settingsService.updateSettings(
          'guild',
          guildId,
          migratedConfig as unknown as Prisma.InputJsonValue,
        );

        await this.cachingService.del(cacheKey);

        this.loggingService.log(
          `Successfully migrated settings for guild ${guildId} to schema version ${migratedConfig._metadata?.schemaVersion || 'unknown'}`,
          this.serviceName,
        );
      } else {
        const rawSettings = settings.settings as unknown;
        migratedConfig = this.settingsDefaults.mergeWithDefaults(
          rawSettings as Record<string, unknown>,
        );
      }

      const result = this.settingsDefaults.mergeWithDefaults(migratedConfig);

      await this.cachingService.set(cacheKey, result, SETTINGS_CACHE_TTL);

      return result;
    } catch (error) {
      // If guild doesn't exist, that's a real NotFoundException
      if (error instanceof NotFoundException) {
        throw error;
      }
      // If auto-creation or retrieval fails, system is broken
      this.loggingService.error(
        `Error getting settings for guild ${guildId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      throw new InternalServerErrorException(
        `Failed to retrieve settings for guild ${guildId}. This is a system error.`,
      );
    }
  }

  /**
   * Update guild settings with validation and transaction management
   * Single Responsibility: Settings updates with validation and atomic operations
   */
  async updateSettings(
    guildId: string,
    newSettings: GuildSettingsDto,
    userId: string,
  ) {
    try {
      await this.settingsValidation.validate(newSettings, guildId);

      const currentSettings = await this.settingsService.getSettings(
        'guild',
        guildId,
      );

      let mergedSettings: GuildSettings;
      if (currentSettings) {
        mergedSettings = this.settingsDefaults.mergeSettings(
          currentSettings.settings as unknown as GuildSettings,
          newSettings as Partial<GuildSettings>,
        );
      } else {
        mergedSettings = this.settingsDefaults.mergeSettings(
          this.settingsDefaults.getDefaults(),
          newSettings as Partial<GuildSettings>,
        );
      }

      const result = await this.transactionService.executeTransaction(
        async (tx: ITransactionClient) => {
          const updated = await this.settingsService.updateSettings(
            'guild',
            guildId,
            mergedSettings as unknown as Prisma.InputJsonValue,
            tx as Prisma.TransactionClient,
          );

          await this.activityLogService.logActivity(
            tx as Prisma.TransactionClient,
            'guild_settings',
            guildId,
            'SETTINGS_UPDATED',
            'update',
            userId,
            guildId,
            newSettings as unknown as Prisma.InputJsonValue,
            { action: 'update' },
          );

          return updated;
        },
      );

      await this.cachingService.del(`settings:${guildId}`);

      this.loggingService.log(
        `Updated settings for guild ${guildId} by user ${userId}`,
        this.serviceName,
      );
      return result;
    } catch (error) {
      this.loggingService.error(
        `Error updating settings for guild ${guildId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      throw error;
    }
  }

  /**
   * Reset settings to defaults with transaction management
   * Single Responsibility: Settings reset functionality with audit trail
   */
  async resetSettings(guildId: string, userId: string) {
    try {
      const defaultSettings = this.settingsDefaults.getDefaults();

      const result = await this.transactionService.executeTransaction(
        async (tx: ITransactionClient) => {
          const updated = await this.settingsService.updateSettings(
            'guild',
            guildId,
            defaultSettings as unknown as Prisma.InputJsonValue,
            tx as Prisma.TransactionClient,
          );

          await this.activityLogService.logActivity(
            tx as Prisma.TransactionClient,
            'guild_settings',
            guildId,
            'SETTINGS_RESET',
            'reset',
            userId,
            guildId,
            { reset: true },
            { action: 'reset' },
          );

          return updated;
        },
      );

      await this.cachingService.del(`settings:${guildId}`);

      this.loggingService.log(
        `Reset settings to defaults for guild ${guildId} by user ${userId}`,
        this.serviceName,
      );
      return result;
    } catch (error) {
      this.loggingService.error(
        `Error resetting settings for guild ${guildId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      throw new InternalServerErrorException('Failed to reset settings');
    }
  }

  /**
   * Get settings history for audit trail
   * Single Responsibility: Settings history retrieval
   */
  async getSettingsHistory(guildId: string, limit: number = 50) {
    try {
      const result = await this.activityLogService.findWithFilters({
        entityType: 'guild_settings',
        entityId: guildId,
        guildId,
        eventType: 'SETTINGS_UPDATED',
        limit,
      });
      return result.logs;
    } catch (error) {
      this.loggingService.error(
        `Error getting settings history for guild ${guildId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      throw new InternalServerErrorException('Failed to get settings history');
    }
  }
}
