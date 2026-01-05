/**
 * LeagueSettingsValidationService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SettingsValidationService } from '../services/settings-validation.service';
import { LeagueValidationException } from '../exceptions/league.exceptions';

describe('SettingsValidationService (Leagues)', () => {
  let service: SettingsValidationService;

  beforeEach(() => {
    service = new SettingsValidationService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validate', () => {
    it('should_pass_when_all_validations_pass', () => {
      const config = {
        membership: {
          joinMethod: 'OPEN' as const,
          requiresApproval: false,
          allowSelfRegistration: true,
          registrationOpen: true,
          autoCloseOnFull: false,
          requireGuildMembership: false,
          requirePlayerStatus: false,
          allowMultipleLeagues: true,
          requireOrganization: false,
          minPlayers: 1,
          maxPlayers: 100,
          registrationStartDate: new Date('2024-01-01'),
          registrationEndDate: new Date('2024-12-31'),
          cooldownAfterLeave: 7,
          maxOrganizations: 10,
          maxTeamsPerOrganization: 5,
        },
        skill: {
          isSkillBased: true,
          requireTracker: false,
          minSkillLevel: 1000,
          maxSkillLevel: 2000,
          skillMetric: 'MMR' as const,
        },
      };

      // Should not throw - verify validation passes
      expect(() => service.validate(config)).not.toThrow();
    });

    it('should_throw_LeagueValidationException_when_minPlayers_less_than_one', () => {
      const config = {
        membership: {
          joinMethod: 'OPEN' as const,
          requiresApproval: false,
          allowSelfRegistration: true,
          registrationOpen: true,
          autoCloseOnFull: false,
          requireGuildMembership: false,
          requirePlayerStatus: false,
          allowMultipleLeagues: true,
          requireOrganization: false,
          minPlayers: 0,
        },
      };

      expect(() => service.validate(config)).toThrow(LeagueValidationException);
      expect(() => service.validate(config)).toThrow(
        'minPlayers must be at least 1',
      );
    });

    it('should_throw_LeagueValidationException_when_maxPlayers_less_than_minPlayers', () => {
      const config = {
        membership: {
          joinMethod: 'OPEN' as const,
          requiresApproval: false,
          allowSelfRegistration: true,
          registrationOpen: true,
          autoCloseOnFull: false,
          requireGuildMembership: false,
          requirePlayerStatus: false,
          allowMultipleLeagues: true,
          requireOrganization: false,
          minPlayers: 10,
          maxPlayers: 5,
        },
      };

      expect(() => service.validate(config)).toThrow(LeagueValidationException);
      expect(() => service.validate(config)).toThrow(
        'maxPlayers must be greater than or equal to minPlayers',
      );
    });

    it('should_throw_LeagueValidationException_when_registrationStartDate_after_registrationEndDate', () => {
      const config = {
        membership: {
          joinMethod: 'OPEN' as const,
          requiresApproval: false,
          allowSelfRegistration: true,
          registrationOpen: true,
          autoCloseOnFull: false,
          requireGuildMembership: false,
          requirePlayerStatus: false,
          allowMultipleLeagues: true,
          requireOrganization: false,
          registrationStartDate: new Date('2024-12-31'),
          registrationEndDate: new Date('2024-01-01'),
        },
      };

      expect(() => service.validate(config)).toThrow(LeagueValidationException);
      expect(() => service.validate(config)).toThrow(
        'registrationStartDate must be before registrationEndDate',
      );
    });

    it('should_throw_LeagueValidationException_when_cooldownAfterLeave_negative', () => {
      const config = {
        membership: {
          joinMethod: 'OPEN' as const,
          requiresApproval: false,
          allowSelfRegistration: true,
          registrationOpen: true,
          autoCloseOnFull: false,
          requireGuildMembership: false,
          requirePlayerStatus: false,
          allowMultipleLeagues: true,
          requireOrganization: false,
          cooldownAfterLeave: -1,
        },
      };

      expect(() => service.validate(config)).toThrow(LeagueValidationException);
      expect(() => service.validate(config)).toThrow(
        'cooldownAfterLeave cannot be negative',
      );
    });

    it('should_throw_LeagueValidationException_when_maxOrganizations_less_than_one', () => {
      const config = {
        membership: {
          joinMethod: 'OPEN' as const,
          requiresApproval: false,
          allowSelfRegistration: true,
          registrationOpen: true,
          autoCloseOnFull: false,
          requireGuildMembership: false,
          requirePlayerStatus: false,
          allowMultipleLeagues: true,
          requireOrganization: false,
          maxOrganizations: 0,
        },
      };

      expect(() => service.validate(config)).toThrow(LeagueValidationException);
      expect(() => service.validate(config)).toThrow(
        'maxOrganizations must be at least 1',
      );
    });

    it('should_throw_LeagueValidationException_when_maxTeamsPerOrganization_less_than_one', () => {
      const config = {
        membership: {
          joinMethod: 'OPEN' as const,
          requiresApproval: false,
          allowSelfRegistration: true,
          registrationOpen: true,
          autoCloseOnFull: false,
          requireGuildMembership: false,
          requirePlayerStatus: false,
          allowMultipleLeagues: true,
          requireOrganization: false,
          maxTeamsPerOrganization: 0,
        },
      };

      expect(() => service.validate(config)).toThrow(LeagueValidationException);
      expect(() => service.validate(config)).toThrow(
        'maxTeamsPerOrganization must be at least 1',
      );
    });

    it('should_throw_LeagueValidationException_when_skillRequirements_minSkill_less_than_maxSkill', () => {
      const config = {
        membership: {
          joinMethod: 'OPEN' as const,
          requiresApproval: false,
          allowSelfRegistration: true,
          registrationOpen: true,
          autoCloseOnFull: false,
          requireGuildMembership: false,
          requirePlayerStatus: false,
          allowMultipleLeagues: true,
          requireOrganization: false,
          skillRequirements: {
            minSkill: 2000,
            maxSkill: 1000,
            skillMetric: 'MMR' as const,
          },
        },
      };

      expect(() => service.validate(config)).toThrow(LeagueValidationException);
      expect(() => service.validate(config)).toThrow(
        'skillRequirements.maxSkill must be greater than or equal to minSkill',
      );
    });

    it('should_throw_LeagueValidationException_when_skillRequirements_has_invalid_metric', () => {
      const config = {
        membership: {
          joinMethod: 'OPEN' as const,
          requiresApproval: false,
          allowSelfRegistration: true,
          registrationOpen: true,
          autoCloseOnFull: false,
          requireGuildMembership: false,
          requirePlayerStatus: false,
          allowMultipleLeagues: true,
          requireOrganization: false,
          skillRequirements: {
            minSkill: 1000,
            maxSkill: 2000,
            skillMetric: 'INVALID' as any,
          },
        },
      };

      expect(() => service.validate(config)).toThrow(LeagueValidationException);
      expect(() => service.validate(config)).toThrow(
        'skillRequirements.skillMetric must be one of',
      );
    });

    it('should_throw_LeagueValidationException_when_minSkillLevel_less_than_zero', () => {
      const config = {
        skill: {
          isSkillBased: true,
          requireTracker: false,
          minSkillLevel: -1,
        },
      };

      expect(() => service.validate(config)).toThrow(LeagueValidationException);
      expect(() => service.validate(config)).toThrow(
        'minSkillLevel cannot be negative',
      );
    });

    it('should_throw_LeagueValidationException_when_maxSkillLevel_less_than_minSkillLevel', () => {
      const config = {
        skill: {
          isSkillBased: true,
          requireTracker: false,
          minSkillLevel: 2000,
          maxSkillLevel: 1000,
        },
      };

      expect(() => service.validate(config)).toThrow(LeagueValidationException);
      expect(() => service.validate(config)).toThrow(
        'maxSkillLevel must be greater than or equal to minSkillLevel',
      );
    });

    it('should_throw_LeagueValidationException_when_isSkillBased_true_but_skillMetric_missing', () => {
      const config = {
        skill: {
          isSkillBased: true,
          requireTracker: false,
        },
      };

      expect(() => service.validate(config)).toThrow(LeagueValidationException);
      expect(() => service.validate(config)).toThrow(
        'skillMetric is required when isSkillBased is true',
      );
    });
  });
});
