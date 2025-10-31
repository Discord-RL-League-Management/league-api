import { Injectable } from '@nestjs/common';
import {
  GuildSettings,
  ChannelsConfig,
  RolesConfig,
  FeaturesConfig,
  PermissionsConfig,
  DisplayConfig,
} from '../interfaces/settings.interface';

@Injectable()
export class SettingsDefaultsService {
  /**
   * Get default settings structure
   * Single Responsibility: Default settings definition
   */
  getDefaults(): GuildSettings {
    return {
      channels: this.getDefaultChannels(),
      roles: this.getDefaultRoles(),
      features: this.getDefaultFeatures(),
      permissions: this.getDefaultPermissions(),
      display: this.getDefaultDisplay(),
    };
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

  private getDefaultChannels(): ChannelsConfig {
    return {
      general: null,
      announcements: null,
      league_chat: null,
      tournament_chat: null,
      logs: null,
    };
  }

  private getDefaultRoles(): RolesConfig {
    return {
      admin: [],
      moderator: [],
      member: [],
      league_manager: [],
      tournament_manager: [],
    };
  }

  private getDefaultFeatures(): FeaturesConfig {
    return {
      league_management: true,
      tournament_mode: false,
      auto_roles: false,
      statistics: true,
      leaderboards: true,
    };
  }

  private getDefaultPermissions(): PermissionsConfig {
    return {
      create_leagues: ['admin'],
      manage_teams: ['admin'],
      view_stats: ['member'],
      manage_tournaments: ['admin'],
      manage_roles: ['admin'],
      view_logs: ['admin', 'moderator'],
    };
  }

  private getDefaultDisplay(): DisplayConfig {
    return {
      show_leaderboards: true,
      show_member_count: false,
      theme: 'default',
      command_prefix: '!',
    };
  }
}
