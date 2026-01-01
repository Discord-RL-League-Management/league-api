import { Injectable } from '@nestjs/common';
import { ILeagueSettingsService } from '../interfaces/league-settings-service.interface';
import { LeagueSettingsService } from '../league-settings.service';
import { LeagueSettingsDto } from '../dto/league-settings.dto';
import { LeagueConfiguration } from '../interfaces/league-settings.interface';

/**
 * LeagueSettingsServiceAdapter - Adapter implementing ILeagueSettingsService
 *
 * Implements the ILeagueSettingsService interface using LeagueSettingsService.
 * This adapter enables dependency inversion by allowing other modules to depend
 * on the interface rather than concrete services.
 */
@Injectable()
export class LeagueSettingsServiceAdapter implements ILeagueSettingsService {
  constructor(private readonly leagueSettingsService: LeagueSettingsService) {}

  /**
   * Get league settings with caching and defaults
   * Delegates to LeagueSettingsService.getSettings()
   */
  async getSettings(leagueId: string): Promise<LeagueConfiguration> {
    return this.leagueSettingsService.getSettings(leagueId);
  }

  /**
   * Update league settings with validation and caching
   * Delegates to LeagueSettingsService.updateSettings()
   */
  async updateSettings(
    leagueId: string,
    newSettings: Partial<LeagueSettingsDto>,
  ): Promise<LeagueConfiguration> {
    return this.leagueSettingsService.updateSettings(leagueId, newSettings);
  }
}
