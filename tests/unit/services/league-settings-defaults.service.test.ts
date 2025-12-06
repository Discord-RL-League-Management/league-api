/**
 * LeagueSettingsDefaultsService Unit Tests
 * 
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LeagueSettingsDefaultsService } from '@/leagues/services/league-settings-defaults.service';

describe('LeagueSettingsDefaultsService', () => {
  let service: LeagueSettingsDefaultsService;

  beforeEach(() => {
    // ARRANGE: Setup test dependencies
    service = new LeagueSettingsDefaultsService();
  });

  describe('getDefaults', () => {
    it('should_return_complete_default_settings_structure', () => {
      // ACT
      const result = service.getDefaults();

      // ASSERT
      expect(result).toHaveProperty('_metadata');
      expect(result).toHaveProperty('membership');
      expect(result).toHaveProperty('game');
      expect(result).toHaveProperty('skill');
      expect(result).toHaveProperty('visibility');
      expect(result).toHaveProperty('administration');
    });

    it('should_include_metadata_with_version_info', () => {
      // ACT
      const result = service.getDefaults();

      // ASSERT
      expect(result._metadata).toBeDefined();
      expect(result._metadata).toHaveProperty('version');
      expect(result._metadata).toHaveProperty('schemaVersion');
    });

    it('should_have_open_membership_config_by_default', () => {
      // ACT
      const result = service.getDefaults();

      // ASSERT
      expect(result.membership.joinMethod).toBe('OPEN');
      expect(result.membership.requiresApproval).toBe(false);
      expect(result.membership.allowSelfRegistration).toBe(true);
      expect(result.membership.registrationOpen).toBe(true);
    });

    it('should_have_no_capacity_limits_by_default', () => {
      // ACT
      const result = service.getDefaults();

      // ASSERT
      expect(result.membership.maxPlayers).toBeNull();
      expect(result.membership.maxTeams).toBeNull();
      expect(result.membership.maxOrganizations).toBeNull();
      expect(result.membership.maxTeamsPerOrganization).toBeNull();
    });

    it('should_have_minimal_eligibility_requirements', () => {
      // ACT
      const result = service.getDefaults();

      // ASSERT
      expect(result.membership.requireGuildMembership).toBe(true);
      expect(result.membership.requirePlayerStatus).toBe(false);
      expect(result.membership.skillRequirements).toBeNull();
    });

    it('should_have_permissive_restrictions', () => {
      // ACT
      const result = service.getDefaults();

      // ASSERT
      expect(result.membership.allowMultipleLeagues).toBe(true);
      expect(result.membership.cooldownAfterLeave).toBeNull();
    });

    it('should_have_optional_organization_requirements', () => {
      // ACT
      const result = service.getDefaults();

      // ASSERT
      expect(result.membership.requireOrganization).toBe(false);
    });

    it('should_have_game_agnostic_config', () => {
      // ACT
      const result = service.getDefaults();

      // ASSERT
      expect(result.game.gameType).toBeNull();
    });

    it('should_have_skill_config', () => {
      // ACT
      const result = service.getDefaults();

      // ASSERT
      expect(result.skill).toBeDefined();
      expect(result.skill.isSkillBased).toBeDefined();
    });

    it('should_have_visibility_config', () => {
      // ACT
      const result = service.getDefaults();

      // ASSERT
      expect(result.visibility).toBeDefined();
    });

    it('should_have_administration_config', () => {
      // ACT
      const result = service.getDefaults();

      // ASSERT
      expect(result.administration).toBeDefined();
    });
  });
});

