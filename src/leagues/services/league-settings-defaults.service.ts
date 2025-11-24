import { Injectable } from '@nestjs/common';
import {
  LeagueConfiguration,
  ConfigMetadata,
  MembershipConfig,
  GameConfig,
  SkillConfig,
  VisibilityConfig,
  AdministrationConfig,
} from '../interfaces/league-settings.interface';
import {
  CURRENT_SCHEMA_VERSION,
  CURRENT_CONFIG_VERSION,
} from '../constants/config-version.constants';

/**
 * LeagueSettingsDefaultsService - Single Responsibility: Default settings definition
 * 
 * Returns the complete default configuration for a new league.
 * These defaults are used by:
 * - Repository upsert operations
 * - Service layer lazy initialization
 * 
 * Default configuration favors openness and accessibility.
 */
@Injectable()
export class LeagueSettingsDefaultsService {
  /**
   * Get default settings structure
   * Single Responsibility: Default settings definition
   * 
   * @returns Complete default league settings structure with metadata
   */
  getDefaults(): LeagueConfiguration {
    return {
      _metadata: this.getDefaultMetadata(),
      membership: this.getDefaultMembershipConfig(),
      game: this.getDefaultGameConfig(),
      skill: this.getDefaultSkillConfig(),
      visibility: this.getDefaultVisibilityConfig(),
      administration: this.getDefaultAdministrationConfig(),
    };
  }

  /**
   * Get default metadata with current version
   * Single Responsibility: Default metadata structure
   */
  private getDefaultMetadata(): ConfigMetadata {
    return {
      version: CURRENT_CONFIG_VERSION,
      schemaVersion: CURRENT_SCHEMA_VERSION,
    };
  }

  /**
   * Get default membership configuration
   * Favor openness: OPEN, auto-approve, unlimited capacity, always open registration
   */
  private getDefaultMembershipConfig(): MembershipConfig {
    return {
      // Access Control - open and accessible by default
      joinMethod: 'OPEN',
      requiresApproval: false,
      allowSelfRegistration: true,
      
      // Capacity - no limits by default
      maxPlayers: null,
      minPlayers: 2,
      maxTeams: null,
      
      // Registration Windows - always open by default
      registrationOpen: true,
      registrationStartDate: null,
      registrationEndDate: null,
      autoCloseOnFull: false,
      
      // Eligibility Requirements - minimal requirements
      requireGuildMembership: true,
      requirePlayerStatus: false,
      skillRequirements: null,
      
      // Restrictions - permissive
      allowMultipleLeagues: true,
      cooldownAfterLeave: null,
    };
  }

  /**
   * Get default game configuration
   * Game-agnostic by default
   */
  private getDefaultGameConfig(): GameConfig {
    return {
      gameType: null, // Game-agnostic
      platform: null, // All platforms allowed
    };
  }

  /**
   * Get default skill configuration
   * No skill restrictions by default
   */
  private getDefaultSkillConfig(): SkillConfig {
    return {
      isSkillBased: false,
      skillMetric: null,
      minSkillLevel: null,
      maxSkillLevel: null,
      requireTracker: false,
      trackerPlatforms: null,
    };
  }

  /**
   * Get default visibility configuration
   * Public and visible by default
   */
  private getDefaultVisibilityConfig(): VisibilityConfig {
    return {
      isPublic: true,
      showInDirectory: true,
      allowSpectators: true,
    };
  }

  /**
   * Get default administration configuration
   * Basic admin setup (relies on guild admins)
   */
  private getDefaultAdministrationConfig(): AdministrationConfig {
    return {
      adminRoles: [],
      allowPlayerReports: true,
      allowSuspensions: true,
      allowBans: true,
    };
  }

  /**
   * Merge settings with defaults
   * Single Responsibility: Settings merging logic
   * 
   * Deep merges new settings with existing settings, handling nested objects
   * Arrays are replaced completely (no merging)
   */
  mergeSettings(
    current: LeagueConfiguration,
    newSettings: Partial<LeagueConfiguration>,
  ): LeagueConfiguration {
    return this.deepMerge(current, newSettings);
  }

  /**
   * Deep merge two objects with proper array handling
   * Single Responsibility: Object merging utility
   */
  private deepMerge(
    target: LeagueConfiguration,
    source: Partial<LeagueConfiguration>,
  ): LeagueConfiguration {
    const result = { ...target };

    for (const key in source) {
      if (
        !(key in source) ||
        source[key as keyof Partial<LeagueConfiguration>] === undefined ||
        source[key as keyof Partial<LeagueConfiguration>] === null
      ) {
        continue;
      }

      const keyTyped = key as keyof LeagueConfiguration;
      const sourceValue = source[keyTyped];
      const targetValue = result[keyTyped];

      // Skip metadata - it's managed separately
      if (key === '_metadata') {
        continue;
      }

      // Handle nested objects - recursive merge
      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        (result[keyTyped] as unknown) = this.deepMergeNested(
          targetValue as any,
          sourceValue as any,
        );
        continue;
      }

      // Handle arrays and primitives - replace completely
      (result[keyTyped] as unknown) = sourceValue;
    }

    return result;
  }

  /**
   * Deep merge nested objects (for membership, game, skill, etc.)
   */
  private deepMergeNested(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (
        !(key in source) ||
        source[key] === undefined ||
        source[key] === null
      ) {
        continue;
      }

      // Handle nested objects - recursive merge
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key]) &&
        target[key] &&
        typeof target[key] === 'object' &&
        !Array.isArray(target[key])
      ) {
        result[key] = this.deepMergeNested(target[key], source[key]);
        continue;
      }

      // Handle arrays and primitives - replace completely
      result[key] = source[key];
    }

    return result;
  }
}


