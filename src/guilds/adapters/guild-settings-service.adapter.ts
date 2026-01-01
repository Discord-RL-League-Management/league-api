import { Injectable } from '@nestjs/common';
import { IGuildSettingsService } from '../interfaces/guild-settings-service.interface';
import { GuildSettingsService } from '../guild-settings.service';
import { GuildSettingsDto } from '../dto/guild-settings.dto';
import { GuildSettings } from '../interfaces/settings.interface';
import { Settings } from '@prisma/client';

/**
 * GuildSettingsServiceAdapter - Adapter implementing IGuildSettingsService
 *
 * Implements the IGuildSettingsService interface using GuildSettingsService.
 * This adapter enables dependency inversion by allowing other modules to depend
 * on the interface rather than concrete services.
 */
@Injectable()
export class GuildSettingsServiceAdapter implements IGuildSettingsService {
  constructor(private readonly guildSettingsService: GuildSettingsService) {}

  /**
   * Get guild settings with caching and defaults
   * Delegates to GuildSettingsService.getSettings()
   */
  async getSettings(guildId: string): Promise<GuildSettings> {
    return this.guildSettingsService.getSettings(guildId);
  }

  /**
   * Update guild settings with validation and transaction management
   * Delegates to GuildSettingsService.updateSettings()
   */
  async updateSettings(
    guildId: string,
    newSettings: GuildSettingsDto,
    userId: string,
  ): Promise<Settings> {
    return this.guildSettingsService.updateSettings(
      guildId,
      newSettings,
      userId,
    );
  }

  /**
   * Reset settings to defaults with transaction management
   * Delegates to GuildSettingsService.resetSettings()
   */
  async resetSettings(guildId: string, userId: string): Promise<Settings> {
    return this.guildSettingsService.resetSettings(guildId, userId);
  }

  /**
   * Get settings history for audit trail
   * Delegates to GuildSettingsService.getSettingsHistory()
   */
  async getSettingsHistory(
    guildId: string,
    limit?: number,
  ): Promise<unknown[]> {
    return this.guildSettingsService.getSettingsHistory(guildId, limit);
  }
}
