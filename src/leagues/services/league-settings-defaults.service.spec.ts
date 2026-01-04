/**
 * LeagueSettingsDefaultsService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LeagueSettingsDefaultsService } from './league-settings-defaults.service';

describe('LeagueSettingsDefaultsService', () => {
  let service: LeagueSettingsDefaultsService;

  beforeEach(() => {
    service = new LeagueSettingsDefaultsService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getDefaults', () => {
    it('should_return_complete_default_settings_structure', () => {
      const result = service.getDefaults();

      expect(result).toMatchObject({
        _metadata: expect.any(Object),
        membership: expect.any(Object),
        game: expect.any(Object),
        skill: expect.any(Object),
        visibility: expect.any(Object),
        administration: expect.any(Object),
      });
    });

    it('should_include_metadata_with_version_info', () => {
      const result = service.getDefaults();

      expect(result._metadata).toBeDefined();
      expect(result._metadata).toHaveProperty('version');
      expect(result._metadata).toHaveProperty('schemaVersion');
    });

    it('should_have_open_membership_config_by_default', () => {
      const result = service.getDefaults();

      expect(result.membership.joinMethod).toBe('OPEN');
      expect(result.membership.requiresApproval).toBe(false);
      expect(result.membership.allowSelfRegistration).toBe(true);
      expect(result.membership.registrationOpen).toBe(true);
    });

    it('should_have_no_capacity_limits_by_default', () => {
      const result = service.getDefaults();

      expect(result.membership.maxPlayers).toBeNull();
      expect(result.membership.maxTeams).toBeNull();
      expect(result.membership.maxOrganizations).toBeNull();
      expect(result.membership.maxTeamsPerOrganization).toBeNull();
    });

    it('should_have_minimal_eligibility_requirements', () => {
      const result = service.getDefaults();

      expect(result.membership.requireGuildMembership).toBe(true);
      expect(result.membership.requirePlayerStatus).toBe(false);
      expect(result.membership.skillRequirements).toBeNull();
    });

    it('should_have_permissive_restrictions', () => {
      const result = service.getDefaults();

      expect(result.membership.allowMultipleLeagues).toBe(true);
      expect(result.membership.cooldownAfterLeave).toBeNull();
    });

    it('should_have_optional_organization_requirements', () => {
      const result = service.getDefaults();

      expect(result.membership.requireOrganization).toBe(false);
    });

    it('should_have_game_agnostic_config', () => {
      const result = service.getDefaults();

      expect(result.game.gameType).toBeNull();
    });

    it('should_have_skill_config', () => {
      const result = service.getDefaults();

      expect(result.skill).toBeDefined();
      expect(result.skill.isSkillBased).toBeDefined();
    });

    it('should_have_visibility_config', () => {
      const result = service.getDefaults();

      expect(result.visibility).toBeDefined();
    });

    it('should_have_administration_config', () => {
      const result = service.getDefaults();

      expect(result.administration).toBeDefined();
    });
  });
});
