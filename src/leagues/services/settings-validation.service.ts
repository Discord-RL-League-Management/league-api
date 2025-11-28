import { Injectable, BadRequestException } from '@nestjs/common';
import {
  LeagueConfiguration,
  MembershipConfig,
  SkillConfig,
} from '../interfaces/league-settings.interface';
import { LeagueValidationException } from '../exceptions/league.exceptions';

/**
 * SettingsValidationService - Single Responsibility: League configuration validation
 *
 * Validates league configuration values and structure.
 * Ensures configuration values are valid and consistent.
 */
@Injectable()
export class SettingsValidationService {
  /**
   * Validate league configuration
   * Single Responsibility: Complete configuration validation
   *
   * @param config - Configuration to validate
   * @throws LeagueValidationException if validation fails
   */
  validate(config: Partial<LeagueConfiguration>): void {
    const errors: string[] = [];

    // Validate membership configuration
    if (config.membership) {
      errors.push(...this.validateMembershipConfig(config.membership));
    }

    // Validate skill configuration
    if (config.skill) {
      errors.push(...this.validateSkillConfig(config.skill));
    }

    // If there are errors, throw validation exception
    if (errors.length > 0) {
      throw new LeagueValidationException(errors.join('; '));
    }
  }

  /**
   * Validate membership configuration
   * Single Responsibility: Membership config validation
   */
  private validateMembershipConfig(
    config: Partial<MembershipConfig>,
  ): string[] {
    const errors: string[] = [];

    // Validate capacity limits
    if (config.minPlayers !== undefined && config.minPlayers !== null) {
      if (config.minPlayers < 1) {
        errors.push('minPlayers must be at least 1');
      }

      if (config.maxPlayers !== undefined && config.maxPlayers !== null) {
        if (config.maxPlayers < config.minPlayers) {
          errors.push('maxPlayers must be greater than or equal to minPlayers');
        }
      }
    }

    if (config.maxPlayers !== undefined && config.maxPlayers !== null) {
      if (config.maxPlayers < 1) {
        errors.push('maxPlayers must be at least 1');
      }
    }

    // Validate registration dates
    if (config.registrationStartDate && config.registrationEndDate) {
      if (
        new Date(config.registrationStartDate) >=
        new Date(config.registrationEndDate)
      ) {
        errors.push('registrationStartDate must be before registrationEndDate');
      }
    }

    // Validate cooldown
    if (
      config.cooldownAfterLeave !== undefined &&
      config.cooldownAfterLeave !== null
    ) {
      if (config.cooldownAfterLeave < 0) {
        errors.push('cooldownAfterLeave cannot be negative');
      }
    }

    // Validate organization requirements
    if (
      config.maxOrganizations !== undefined &&
      config.maxOrganizations !== null
    ) {
      if (config.maxOrganizations < 1) {
        errors.push('maxOrganizations must be at least 1');
      }
    }

    if (
      config.maxTeamsPerOrganization !== undefined &&
      config.maxTeamsPerOrganization !== null
    ) {
      if (config.maxTeamsPerOrganization < 1) {
        errors.push('maxTeamsPerOrganization must be at least 1');
      }
    }

    // Validate skill requirements
    if (config.skillRequirements) {
      const skillErrors = this.validateSkillRequirements(
        config.skillRequirements,
      );
      errors.push(...skillErrors);
    }

    return errors;
  }

  /**
   * Validate skill configuration
   * Single Responsibility: Skill config validation
   */
  private validateSkillConfig(config: Partial<SkillConfig>): string[] {
    const errors: string[] = [];

    // Validate skill levels if skill-based
    if (config.isSkillBased) {
      if (config.minSkillLevel !== undefined && config.minSkillLevel !== null) {
        if (config.minSkillLevel < 0) {
          errors.push('minSkillLevel cannot be negative');
        }

        if (
          config.maxSkillLevel !== undefined &&
          config.maxSkillLevel !== null
        ) {
          if (config.maxSkillLevel < config.minSkillLevel) {
            errors.push(
              'maxSkillLevel must be greater than or equal to minSkillLevel',
            );
          }
        }
      }

      if (config.maxSkillLevel !== undefined && config.maxSkillLevel !== null) {
        if (config.maxSkillLevel < 0) {
          errors.push('maxSkillLevel cannot be negative');
        }
      }

      // If skill-based, should have a metric
      if (!config.skillMetric) {
        errors.push('skillMetric is required when isSkillBased is true');
      }
    }

    return errors;
  }

  /**
   * Validate skill requirements
   * Single Responsibility: Skill requirements validation
   */
  private validateSkillRequirements(requirements: {
    minSkill?: number;
    maxSkill?: number;
    skillMetric: string;
  }): string[] {
    const errors: string[] = [];

    if (requirements.minSkill !== undefined && requirements.minSkill !== null) {
      if (requirements.minSkill < 0) {
        errors.push('skillRequirements.minSkill cannot be negative');
      }

      if (
        requirements.maxSkill !== undefined &&
        requirements.maxSkill !== null
      ) {
        if (requirements.maxSkill < requirements.minSkill) {
          errors.push(
            'skillRequirements.maxSkill must be greater than or equal to minSkill',
          );
        }
      }
    }

    if (requirements.maxSkill !== undefined && requirements.maxSkill !== null) {
      if (requirements.maxSkill < 0) {
        errors.push('skillRequirements.maxSkill cannot be negative');
      }
    }

    // Validate skill metric
    const validMetrics = ['MMR', 'RANK', 'ELO', 'CUSTOM'];
    if (!validMetrics.includes(requirements.skillMetric)) {
      errors.push(
        `skillRequirements.skillMetric must be one of: ${validMetrics.join(', ')}`,
      );
    }

    return errors;
  }
}
