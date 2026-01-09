/**
 * OrganizationValidationService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ModuleRef } from '@nestjs/core';
import { OrganizationValidationService } from './organization-validation.service';
import { OrganizationRepository } from '../repositories/organization.repository';
import type { ILeagueRepositoryAccess } from '@/common/interfaces/league-domain/league-repository-access.interface';
import type { ILeagueSettingsProvider } from '@/common/interfaces/league-domain/league-settings-provider.interface';
import { PlayerService } from '@/players/player.service';
import {
  OrganizationNotFoundException,
  NoGeneralManagerException,
  CannotRemoveLastGeneralManagerException,
  PlayerAlreadyInOrganizationException,
  OrganizationCapacityExceededException,
  LeagueOrganizationCapacityExceededException,
  OrganizationHasTeamsException,
} from '../exceptions/organization.exceptions';
import { LeagueNotFoundException } from '@/leagues/exceptions/league.exceptions';
import { OrganizationMemberRole } from '@prisma/client';
import {
  ILEAGUE_REPOSITORY_ACCESS,
  ILEAGUE_SETTINGS_PROVIDER,
} from '@/common/tokens/injection.tokens';

describe('OrganizationValidationService', () => {
  let service: OrganizationValidationService;
  let mockOrganizationRepository: OrganizationRepository;
  let mockLeagueRepositoryAccess: ILeagueRepositoryAccess;
  let mockPlayerService: PlayerService;
  let mockLeagueSettingsProvider: ILeagueSettingsProvider;
  let mockModuleRef: ModuleRef;

  beforeEach(() => {
    mockOrganizationRepository = {
      exists: vi.fn(),
      findByIdAndLeague: vi.fn(),
      findMembersByPlayer: vi.fn(),
      countGeneralManagers: vi.fn(),
      findMemberById: vi.fn(),
      countTeamsByOrganization: vi.fn(),
      findByLeagueId: vi.fn(),
    } as unknown as OrganizationRepository;

    mockLeagueRepositoryAccess = {
      exists: vi.fn(),
    } as unknown as ILeagueRepositoryAccess;

    mockPlayerService = {
      findOne: vi.fn(),
    } as unknown as PlayerService;

    mockLeagueSettingsProvider = {
      getSettings: vi.fn(),
    } as unknown as ILeagueSettingsProvider;

    mockModuleRef = {
      get: vi.fn().mockImplementation((token) => {
        if (token === ILEAGUE_REPOSITORY_ACCESS) {
          return mockLeagueRepositoryAccess;
        }
        if (token === ILEAGUE_SETTINGS_PROVIDER) {
          return mockLeagueSettingsProvider;
        }
        return null;
      }),
    } as unknown as ModuleRef;

    service = new OrganizationValidationService(
      mockOrganizationRepository,
      mockPlayerService,
      mockModuleRef,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateCreate', () => {
    it('should_pass_when_league_exists', async () => {
      const data = { leagueId: 'league123', name: 'Test Org' };
      vi.mocked(mockLeagueRepositoryAccess.exists).mockResolvedValue(true);

      await service.validateCreate(data);

      expect(mockLeagueRepositoryAccess.exists).toHaveBeenCalledWith(
        data.leagueId,
      );
    });

    it('should_throw_LeagueNotFoundException_when_league_does_not_exist', async () => {
      const data = { leagueId: 'league123', name: 'Test Org' };
      vi.mocked(mockLeagueRepositoryAccess.exists).mockResolvedValue(false);

      await expect(service.validateCreate(data)).rejects.toThrow(
        LeagueNotFoundException,
      );
    });
  });

  describe('validateMemberAdd', () => {
    it('should_pass_when_all_validations_pass', async () => {
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

      await service.validateMemberAdd(organizationId, playerId, leagueId);

      expect(mockOrganizationRepository.findByIdAndLeague).toHaveBeenCalledWith(
        organizationId,
        leagueId,
      );
      expect(mockPlayerService.findOne).toHaveBeenCalledWith(playerId);
    });

    it('should_throw_OrganizationNotFoundException_when_organization_not_found', async () => {
      const organizationId = 'org123';
      const playerId = 'player123';
      const leagueId = 'league123';

      vi.mocked(mockOrganizationRepository.findByIdAndLeague).mockResolvedValue(
        null,
      );

      await expect(
        service.validateMemberAdd(organizationId, playerId, leagueId),
      ).rejects.toThrow(OrganizationNotFoundException);
    });

    it('should_throw_PlayerAlreadyInOrganizationException_when_player_already_in_organization', async () => {
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

      await expect(
        service.validateMemberAdd(organizationId, playerId, leagueId),
      ).rejects.toThrow(PlayerAlreadyInOrganizationException);
    });
  });

  describe('validateGeneralManagerRequirement', () => {
    it('should_pass_when_at_least_one_general_manager_exists', async () => {
      const organizationId = 'org123';
      vi.mocked(
        mockOrganizationRepository.countGeneralManagers,
      ).mockResolvedValue(1);

      await service.validateGeneralManagerRequirement(organizationId);

      expect(
        mockOrganizationRepository.countGeneralManagers,
      ).toHaveBeenCalledWith(organizationId);
    });

    it('should_throw_NoGeneralManagerException_when_no_general_managers_exist', async () => {
      const organizationId = 'org123';
      vi.mocked(
        mockOrganizationRepository.countGeneralManagers,
      ).mockResolvedValue(0);

      await expect(
        service.validateGeneralManagerRequirement(organizationId),
      ).rejects.toThrow(NoGeneralManagerException);
    });
  });

  describe('validateCanRemoveGeneralManager', () => {
    it('should_pass_when_member_is_not_general_manager', async () => {
      const organizationId = 'org123';
      const memberId = 'member123';
      const member = {
        id: memberId,
        role: OrganizationMemberRole.MEMBER,
      };

      vi.mocked(mockOrganizationRepository.findMemberById).mockResolvedValue(
        member as any,
      );

      await service.validateCanRemoveGeneralManager(organizationId, memberId);

      expect(mockOrganizationRepository.findMemberById).toHaveBeenCalledWith(
        memberId,
      );
    });

    it('should_pass_when_multiple_general_managers_exist', async () => {
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

      await service.validateCanRemoveGeneralManager(organizationId, memberId);

      expect(
        mockOrganizationRepository.countGeneralManagers,
      ).toHaveBeenCalledWith(organizationId);
    });

    it('should_throw_CannotRemoveLastGeneralManagerException_when_removing_last_general_manager', async () => {
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

      await expect(
        service.validateCanRemoveGeneralManager(organizationId, memberId),
      ).rejects.toThrow(CannotRemoveLastGeneralManagerException);
    });
  });

  describe('validateOrganizationCapacity', () => {
    it('should_pass_when_no_organization_id_provided', async () => {
      const leagueId = 'league123';

      await service.validateOrganizationCapacity(leagueId);

      expect(
        mockOrganizationRepository.countTeamsByOrganization,
      ).not.toHaveBeenCalled();
    });

    it('should_pass_when_team_count_is_within_capacity', async () => {
      const leagueId = 'league123';
      const organizationId = 'org123';
      const settings = {
        membership: { maxTeamsPerOrganization: 5 },
      };

      vi.mocked(mockLeagueSettingsProvider.getSettings).mockResolvedValue(
        settings as any,
      );
      vi.mocked(
        mockOrganizationRepository.countTeamsByOrganization,
      ).mockResolvedValue(3);

      await service.validateOrganizationCapacity(leagueId, organizationId);

      expect(
        mockOrganizationRepository.countTeamsByOrganization,
      ).toHaveBeenCalledWith(organizationId);
    });

    it('should_throw_OrganizationCapacityExceededException_when_team_count_exceeds_capacity', async () => {
      const leagueId = 'league123';
      const organizationId = 'org123';
      const settings = {
        membership: { maxTeamsPerOrganization: 5 },
      };

      vi.mocked(mockLeagueSettingsProvider.getSettings).mockResolvedValue(
        settings as any,
      );
      vi.mocked(
        mockOrganizationRepository.countTeamsByOrganization,
      ).mockResolvedValue(6);

      await expect(
        service.validateOrganizationCapacity(leagueId, organizationId),
      ).rejects.toThrow(OrganizationCapacityExceededException);
    });
  });

  describe('validateLeagueOrganizationCapacity', () => {
    it('should_pass_when_organization_count_is_within_capacity', async () => {
      const leagueId = 'league123';
      const settings = {
        membership: { maxOrganizations: 10 },
      };
      const organizations = Array.from({ length: 5 }, (_, i) => ({
        id: `org${i}`,
      }));

      vi.mocked(mockLeagueSettingsProvider.getSettings).mockResolvedValue(
        settings as any,
      );
      vi.mocked(mockOrganizationRepository.findByLeagueId).mockResolvedValue(
        organizations as any,
      );

      await service.validateLeagueOrganizationCapacity(leagueId);

      expect(mockOrganizationRepository.findByLeagueId).toHaveBeenCalledWith(
        leagueId,
      );
    });

    it('should_throw_LeagueOrganizationCapacityExceededException_when_organization_count_exceeds_capacity', async () => {
      const leagueId = 'league123';
      const settings = {
        membership: { maxOrganizations: 10 },
      };
      const organizations = Array.from({ length: 10 }, (_, i) => ({
        id: `org${i}`,
      }));

      vi.mocked(mockLeagueSettingsProvider.getSettings).mockResolvedValue(
        settings as any,
      );
      vi.mocked(mockOrganizationRepository.findByLeagueId).mockResolvedValue(
        organizations as any,
      );

      await expect(
        service.validateLeagueOrganizationCapacity(leagueId),
      ).rejects.toThrow(LeagueOrganizationCapacityExceededException);
    });
  });

  describe('validateCanDeleteOrganization', () => {
    it('should_pass_when_organization_has_no_teams', async () => {
      const organizationId = 'org123';
      vi.mocked(
        mockOrganizationRepository.countTeamsByOrganization,
      ).mockResolvedValue(0);

      await service.validateCanDeleteOrganization(organizationId);

      expect(
        mockOrganizationRepository.countTeamsByOrganization,
      ).toHaveBeenCalledWith(organizationId);
    });

    it('should_throw_OrganizationHasTeamsException_when_organization_has_teams', async () => {
      const organizationId = 'org123';
      vi.mocked(
        mockOrganizationRepository.countTeamsByOrganization,
      ).mockResolvedValue(3);

      await expect(
        service.validateCanDeleteOrganization(organizationId),
      ).rejects.toThrow(OrganizationHasTeamsException);
    });
  });

  describe('validatePlayerNotInAnotherOrg', () => {
    it('should_pass_when_player_not_in_any_organization', async () => {
      const playerId = 'player123';
      const leagueId = 'league123';
      vi.mocked(
        mockOrganizationRepository.findMembersByPlayer,
      ).mockResolvedValue(null);

      await service.validatePlayerNotInAnotherOrg(playerId, leagueId);

      expect(
        mockOrganizationRepository.findMembersByPlayer,
      ).toHaveBeenCalledWith(playerId, leagueId);
    });

    it('should_pass_when_player_in_same_organization', async () => {
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

      await service.validatePlayerNotInAnotherOrg(
        playerId,
        leagueId,
        organizationId,
      );

      expect(
        mockOrganizationRepository.findMembersByPlayer,
      ).toHaveBeenCalledWith(playerId, leagueId);
    });

    it('should_throw_PlayerAlreadyInOrganizationException_when_player_in_different_organization', async () => {
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

      await expect(
        service.validatePlayerNotInAnotherOrg(playerId, leagueId, excludeOrgId),
      ).rejects.toThrow(PlayerAlreadyInOrganizationException);
    });
  });
});
