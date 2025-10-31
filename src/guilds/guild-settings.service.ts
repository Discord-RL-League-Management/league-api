import {
  Injectable,
  NotFoundException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { GuildSettingsDto } from './dto/guild-settings.dto';
import { SettingsDefaultsService } from './services/settings-defaults.service';
import { SettingsValidationService } from './services/settings-validation.service';
import { Inject } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { SETTINGS_CACHE_TTL } from './constants/settings.constants';
import { GuildSettings } from './interfaces/settings.interface';
import { GuildSettingsRepository } from './repositories/guild-settings.repository';

@Injectable()
export class GuildSettingsService {
  private readonly logger = new Logger(GuildSettingsService.name);

  constructor(
    private guildSettingsRepository: GuildSettingsRepository,
    private settingsDefaults: SettingsDefaultsService,
    private settingsValidation: SettingsValidationService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Get guild settings with caching and defaults
   * Single Responsibility: Settings retrieval with caching and fallback defaults
   */
  async getSettings(guildId: string) {
    try {
      const cacheKey = `settings:${guildId}`;
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        this.logger.log(`Settings cache hit for guild ${guildId}`);
        return cached;
      }

      const settings = await this.guildSettingsRepository.findByGuildId(guildId);

      let result;
      if (!settings) {
        result = this.settingsDefaults.getDefaults();
      } else {
        result = this.settingsDefaults.mergeWithDefaults(
          settings.settings as any,
        );
      }

      await this.cacheManager.set(cacheKey, result, SETTINGS_CACHE_TTL);

      return result;
    } catch (error) {
      this.logger.error(`Error getting settings for guild ${guildId}:`, error);
      throw new NotFoundException(`Settings for guild ${guildId} not found`);
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
      // Validate settings with validation service
      await this.settingsValidation.validate(newSettings, guildId);

      // Get current settings for merging
      const currentSettings = await this.guildSettingsRepository.findByGuildId(
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

      // Update with history tracking (transaction handled in repository)
      const result = await this.guildSettingsRepository.updateWithHistory(
        guildId,
        mergedSettings,
        userId,
        'update',
        newSettings as unknown as Record<string, any>,
      );

      await this.cacheManager.del(`settings:${guildId}`);

      this.logger.log(
        `Updated settings for guild ${guildId} by user ${userId}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`Error updating settings for guild ${guildId}:`, error);
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

      // Reset with history tracking (transaction handled in repository)
      const result = await this.guildSettingsRepository.updateWithHistory(
        guildId,
        defaultSettings,
        userId,
        'reset',
        { reset: true } as unknown as Record<string, any>,
      );

      await this.cacheManager.del(`settings:${guildId}`);

      this.logger.log(
        `Reset settings to defaults for guild ${guildId} by user ${userId}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Error resetting settings for guild ${guildId}:`,
        error,
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
      return this.guildSettingsRepository.getHistory(guildId, limit);
    } catch (error) {
      this.logger.error(
        `Error getting settings history for guild ${guildId}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to get settings history');
    }
  }
}
