/**
 * OrganizationValidationService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrganizationValidationService } from '@/organizations/services/organization-validation.service';
import { OrganizationRepository } from '@/organizations/repositories/organization.repository';
import { LeagueRepository } from '@/leagues/repositories/league.repository';
import { PlayerService } from '@/players/services/player.service';
import { LeagueSettingsService } from '@/leagues/league-settings.service';
import {
  OrganizationNotFoundException,
  NoGeneralManagerException,
  CannotRemoveLastGeneralManagerException,
  PlayerAlreadyInOrganizationException,
  OrganizationCapacityExceededException,
  LeagueOrganizationCapacityExceededException,
  OrganizationHasTeamsException,
} from '@/organizations/exceptions/organization.exceptions';
import { LeagueNotFoundException } from '@/leagues/exceptions/league.exceptions';
import { OrganizationMemberRole } from '@prisma/client';

describe('OrganizationValidationService', () => {
  let service: OrganizationValidationService;
  let mockOrganizationRepository: OrganizationRepository;
  let mockLeagueRepository: LeagueRepository;
  let mockPlayerService: PlayerService;
  let mockLeagueSettingsService: LeagueSettingsService;

  beforeEach(() => {
    // ARRANGE: Setup test dependencies
    mockOrganizationRepository = {
      exists: vi.fn(),
      findByIdAndLeague: vi.fn(),
      findMembersByPlayer: vi.fn(),
      countGeneralManagers: vi.fn(),
      findMemberById: vi.fn(),
      countTeamsByOrganization: vi.fn(),
      findByLeagueId: vi.fn(),
    } as unknown as OrganizationRepository;

    mockLeagueRepository = {
      exists: vi.fn(),
    } as unknown as LeagueRepository;

    mockPlayerService = {
      findOne: vi.fn(),
    } as unknown as PlayerService;

    mockLeagueSettingsService = {
      getSettings: vi.fn(),
    } as unknown as LeagueSettingsService;

    service = new OrganizationValidationService(
      mockOrganizationRepository,
      mockLeagueRepository,
      mockPlayerService,
      mockLeagueSettingsService,
    );
  });

  describe('validateCreate', () => {
    it('should_pass_when_league_exists', async () => {
      // ARRANGE
      const data = { leagueId: 'league123', name: 'Test Org' };
      vi.mocked(mockLeagueRepository.exists).mockResolvedValue(true);

      // ACT
      await service.validateCreate(data);

      // ASSERT
      expect(mockLeagueRepository.exists).toHaveBeenCalledWith(data.leagueId);
    });

    it('should_throw_LeagueNotFoundException_when_league_does_not_exist', async () => {
      // ARRANGE
      const data = { leagueId: 'league123', name: 'Test Org' };
      vi.mocked(mockLeagueRepository.exists).mockResolvedValue(false);

      // ACT & ASSERT
      await expect(service.validateCreate(data)).rejects.toThrow(
        LeagueNotFoundException,
      );
    });
  });

  describe('validateMemberAdd', () => {
    it('should_pass_when_all_validations_pass', async () => {
      // ARRANGE
      const organizationId = 'org123';
      const playerId = 'player123';
      const leagueId = 'league123';
      const organization = { id: organizationId, leagueId };
      const player = { id: playerId };

      vi.mocked(mockOrganizationRepository.findByIdAndLeague).mockResolvedValue(
        organization as any,
      );
      vi.mocked(mockPlayerService.findOne).mockResolvedValue(player as any);
      vi.mocked(
        mockOrganizationRepository.findMembersByPlayer,
      ).mockResolvedValue(null);

      // ACT
      await service.validateMemberAdd(organizationId, playerId, leagueId);

      // ASSERT
      expect(mockOrganizationRepository.findByIdAndLeague).toHaveBeenCalledWith(
        organizationId,
        leagueId,
      );
      expect(mockPlayerService.findOne).toHaveBeenCalledWith(playerId);
    });

    it('should_throw_OrganizationNotFoundException_when_organization_not_found', async () => {
      // ARRANGE
      const organizationId = 'org123';
      const playerId = 'player123';
      const leagueId = 'league123';

      vi.mocked(mockOrganizationRepository.findByIdAndLeague).mockResolvedValue(
        null,
      );

      // ACT & ASSERT
      await expect(
        service.validateMemberAdd(organizationId, playerId, leagueId),
      ).rejects.toThrow(OrganizationNotFoundException);
    });

    it('should_throw_PlayerAlreadyInOrganizationException_when_player_already_in_organization', async () => {
      // ARRANGE
      const organizationId = 'org123';
      const playerId = 'player123';
      const leagueId = 'league123';
      const organization = { id: organizationId, leagueId };
      const existingMembership = {
        organizationId,
        playerId,
      };

      vi.mocked(mockOrganizationRepository.findByIdAndLeague).mockResolvedValue(
        organization as any,
      );
      vi.mocked(mockPlayerService.findOne).mockResolvedValue({} as any);
      vi.mocked(
        mockOrganizationRepository.findMembersByPlayer,
      ).mockResolvedValue(existingMembership as any);

      // ACT & ASSERT
      await expect(
        service.validateMemberAdd(organizationId, playerId, leagueId),
      ).rejects.toThrow(PlayerAlreadyInOrganizationException);
    });
  });

  describe('validateGeneralManagerRequirement', () => {
    it('should_pass_when_at_least_one_general_manager_exists', async () => {
      // ARRANGE
      const organizationId = 'org123';
      vi.mocked(
        mockOrganizationRepository.countGeneralManagers,
      ).mockResolvedValue(1);

      // ACT
      await service.validateGeneralManagerRequirement(organizationId);

      // ASSERT
      expect(
        mockOrganizationRepository.countGeneralManagers,
      ).toHaveBeenCalledWith(organizationId);
    });

    it('should_throw_NoGeneralManagerException_when_no_general_managers_exist', async () => {
      // ARRANGE
      const organizationId = 'org123';
      vi.mocked(
        mockOrganizationRepository.countGeneralManagers,
      ).mockResolvedValue(0);

      // ACT & ASSERT
      await expect(
        service.validateGeneralManagerRequirement(organizationId),
      ).rejects.toThrow(NoGeneralManagerException);
    });
  });

  describe('validateCanRemoveGeneralManager', () => {
    it('should_pass_when_member_is_not_general_manager', async () => {
      // ARRANGE
      const organizationId = 'org123';
      const memberId = 'member123';
      const member = {
        id: memberId,
        role: OrganizationMemberRole.MEMBER,
      };

      vi.mocked(mockOrganizationRepository.findMemberById).mockResolvedValue(
        member as any,
      );

      // ACT
      await service.validateCanRemoveGeneralManager(organizationId, memberId);

      // ASSERT
      expect(mockOrganizationRepository.findMemberById).toHaveBeenCalledWith(
        memberId,
      );
    });

    it('should_pass_when_multiple_general_managers_exist', async () => {
      // ARRANGE
      const organizationId = 'org123';
      const memberId = 'member123';
      const member = {
        id: memberId,
        role: OrganizationMemberRole.GENERAL_MANAGER,
      };

      vi.mocked(mockOrganizationRepository.findMemberById).mockResolvedValue(
        member as any,
      );
      vi.mocked(
        mockOrganizationRepository.countGeneralManagers,
      ).mockResolvedValue(2);

      // ACT
      await service.validateCanRemoveGeneralManager(organizationId, memberId);

      // ASSERT
      expect(
        mockOrganizationRepository.countGeneralManagers,
      ).toHaveBeenCalledWith(organizationId);
    });

    it('should_throw_CannotRemoveLastGeneralManagerException_when_removing_last_general_manager', async () => {
      // ARRANGE
      const organizationId = 'org123';
      const memberId = 'member123';
      const member = {
        id: memberId,
        role: OrganizationMemberRole.GENERAL_MANAGER,
      };

      vi.mocked(mockOrganizationRepository.findMemberById).mockResolvedValue(
        member as any,
      );
      vi.mocked(
        mockOrganizationRepository.countGeneralManagers,
      ).mockResolvedValue(1);

      // ACT & ASSERT
      await expect(
        service.validateCanRemoveGeneralManager(organizationId, memberId),
      ).rejects.toThrow(CannotRemoveLastGeneralManagerException);
    });
  });

  describe('validateOrganizationCapacity', () => {
    it('should_pass_when_no_organization_id_provided', async () => {
      // ARRANGE
      const leagueId = 'league123';

      // ACT
      await service.validateOrganizationCapacity(leagueId);

      // ASSERT
      expect(
        mockOrganizationRepository.countTeamsByOrganization,
      ).not.toHaveBeenCalled();
    });

    it('should_pass_when_team_count_is_within_capacity', async () => {
      // ARRANGE
      const leagueId = 'league123';
      const organizationId = 'org123';
      const settings = {
        membership: { maxTeamsPerOrganization: 5 },
      };

      vi.mocked(mockLeagueSettingsService.getSettings).mockResolvedValue(
        settings as any,
      );
      vi.mocked(
        mockOrganizationRepository.countTeamsByOrganization,
      ).mockResolvedValue(3);

      // ACT
      await service.validateOrganizationCapacity(leagueId, organizationId);

      // ASSERT
      expect(
        mockOrganizationRepository.countTeamsByOrganization,
      ).toHaveBeenCalledWith(organizationId);
    });

    it('should_throw_OrganizationCapacityExceededException_when_team_count_exceeds_capacity', async () => {
      // ARRANGE
      const leagueId = 'league123';
      const organizationId = 'org123';
      const settings = {
        membership: { maxTeamsPerOrganization: 5 },
      };

      vi.mocked(mockLeagueSettingsService.getSettings).mockResolvedValue(
        settings as any,
      );
      vi.mocked(
        mockOrganizationRepository.countTeamsByOrganization,
      ).mockResolvedValue(6);

      // ACT & ASSERT
      await expect(
        service.validateOrganizationCapacity(leagueId, organizationId),
      ).rejects.toThrow(OrganizationCapacityExceededException);
    });
  });

  describe('validateLeagueOrganizationCapacity', () => {
    it('should_pass_when_organization_count_is_within_capacity', async () => {
      // ARRANGE
      const leagueId = 'league123';
      const settings = {
        membership: { maxOrganizations: 10 },
      };
      const organizations = Array.from({ length: 5 }, (_, i) => ({
        id: `org${i}`,
      }));

      vi.mocked(mockLeagueSettingsService.getSettings).mockResolvedValue(
        settings as any,
      );
      vi.mocked(mockOrganizationRepository.findByLeagueId).mockResolvedValue(
        organizations as any,
      );

      // ACT
      await service.validateLeagueOrganizationCapacity(leagueId);

      // ASSERT
      expect(mockOrganizationRepository.findByLeagueId).toHaveBeenCalledWith(
        leagueId,
      );
    });

    it('should_throw_LeagueOrganizationCapacityExceededException_when_organization_count_exceeds_capacity', async () => {
      // ARRANGE
      const leagueId = 'league123';
      const settings = {
        membership: { maxOrganizations: 10 },
      };
      const organizations = Array.from({ length: 10 }, (_, i) => ({
        id: `org${i}`,
      }));

      vi.mocked(mockLeagueSettingsService.getSettings).mockResolvedValue(
        settings as any,
      );
      vi.mocked(mockOrganizationRepository.findByLeagueId).mockResolvedValue(
        organizations as any,
      );

      // ACT & ASSERT
      await expect(
        service.validateLeagueOrganizationCapacity(leagueId),
      ).rejects.toThrow(LeagueOrganizationCapacityExceededException);
    });
  });

  describe('validateCanDeleteOrganization', () => {
    it('should_pass_when_organization_has_no_teams', async () => {
      // ARRANGE
      const organizationId = 'org123';
      vi.mocked(
        mockOrganizationRepository.countTeamsByOrganization,
      ).mockResolvedValue(0);

      // ACT
      await service.validateCanDeleteOrganization(organizationId);

      // ASSERT
      expect(
        mockOrganizationRepository.countTeamsByOrganization,
      ).toHaveBeenCalledWith(organizationId);
    });

    it('should_throw_OrganizationHasTeamsException_when_organization_has_teams', async () => {
      // ARRANGE
      const organizationId = 'org123';
      vi.mocked(
        mockOrganizationRepository.countTeamsByOrganization,
      ).mockResolvedValue(3);

      // ACT & ASSERT
      await expect(
        service.validateCanDeleteOrganization(organizationId),
      ).rejects.toThrow(OrganizationHasTeamsException);
    });
  });

  describe('validatePlayerNotInAnotherOrg', () => {
    it('should_pass_when_player_not_in_any_organization', async () => {
      // ARRANGE
      const playerId = 'player123';
      const leagueId = 'league123';
      vi.mocked(
        mockOrganizationRepository.findMembersByPlayer,
      ).mockResolvedValue(null);

      // ACT
      await service.validatePlayerNotInAnotherOrg(playerId, leagueId);

      // ASSERT
      expect(
        mockOrganizationRepository.findMembersByPlayer,
      ).toHaveBeenCalledWith(playerId, leagueId);
    });

    it('should_pass_when_player_in_same_organization', async () => {
      // ARRANGE
      const playerId = 'player123';
      const leagueId = 'league123';
      const organizationId = 'org123';
      const existingMembership = {
        organizationId,
        playerId,
      };

      vi.mocked(
        mockOrganizationRepository.findMembersByPlayer,
      ).mockResolvedValue(existingMembership as any);

      // ACT
      await service.validatePlayerNotInAnotherOrg(
        playerId,
        leagueId,
        organizationId,
      );

      // ASSERT
      expect(
        mockOrganizationRepository.findMembersByPlayer,
      ).toHaveBeenCalledWith(playerId, leagueId);
    });

    it('should_throw_PlayerAlreadyInOrganizationException_when_player_in_different_organization', async () => {
      // ARRANGE
      const playerId = 'player123';
      const leagueId = 'league123';
      const excludeOrgId = 'org123';
      const existingMembership = {
        organizationId: 'org456',
        playerId,
      };

      vi.mocked(
        mockOrganizationRepository.findMembersByPlayer,
      ).mockResolvedValue(existingMembership as any);

      // ACT & ASSERT
      await expect(
        service.validatePlayerNotInAnotherOrg(playerId, leagueId, excludeOrgId),
      ).rejects.toThrow(PlayerAlreadyInOrganizationException);
    });
  });
});
