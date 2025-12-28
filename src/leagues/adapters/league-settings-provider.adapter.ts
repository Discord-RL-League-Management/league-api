import { Injectable } from '@nestjs/common';
import { ILeagueSettingsProvider } from '../../league-members/interfaces/league-settings-provider.interface';
import { LeagueSettingsService } from '../league-settings.service';
import { LeagueConfiguration } from '../interfaces/league-settings.interface';

/**
 * LeagueSettingsProviderAdapter - Adapter implementing ILeagueSettingsProvider
 *
 * Implements the interface using LeagueSettingsService to break circular dependency.
 */
@Injectable()
export class LeagueSettingsProviderAdapter implements ILeagueSettingsProvider {
  constructor(private readonly settingsService: LeagueSettingsService) {}

  async getSettings(leagueId: string): Promise<LeagueConfiguration> {
    return this.settingsService.getSettings(leagueId);
  }
}
