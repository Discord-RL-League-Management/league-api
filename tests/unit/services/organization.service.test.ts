/**
 * OrganizationService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { OrganizationService } from '@/organizations/services/organization.service';
import { OrganizationRepository } from '@/organizations/repositories/organization.repository';
import { OrganizationMemberService } from '@/organizations/services/organization-member.service';
import { OrganizationValidationService } from '@/organizations/services/organization-validation.service';
import { PlayerService } from '@/players/services/player.service';
import { LeagueRepository } from '@/leagues/repositories/league.repository';
import { LeagueSettingsService } from '@/leagues/league-settings.service';
import { TeamRepository } from '@/teams/repositories/team.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateOrganizationDto } from '@/organizations/dto/create-organization.dto';
import { UpdateOrganizationDto } from '@/organizations/dto/update-organization.dto';
import {
  OrganizationNotFoundException,
  NotGeneralManagerException,
  OrganizationCapacityExceededException,
} from '@/organizations/exceptions/organization.exceptions';
import { Organization, LeagueStatus } from '@prisma/client';

describe('OrganizationService', () => {
  let service: OrganizationService;
  let mockOrganizationRepository: OrganizationRepository;
  let mockOrganizationMemberService: OrganizationMemberService;
  let mockValidationService: OrganizationValidationService;
  let mockPlayerService: PlayerService;
  let mockLeagueRepository: LeagueRepository;
  let mockLeagueSettingsService: LeagueSettingsService;
  let mockTeamRepository: TeamRepository;
  let mockPrisma: PrismaService;

  const organizationId = 'org-123';
  const leagueId = 'league-123';
  const userId = 'user-123';
  const guildId = 'guild-123';
  const playerId = 'player-123';

  const mockOrganization: Organization = {
    id: organizationId,
    leagueId,
    name: 'Test Organization',
    tag: 'TEST',
    description: 'Test description',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLeague = {
    id: leagueId,
    guildId,
    name: 'Test League',
    description: null,
    game: null,
    status: LeagueStatus.ACTIVE,
    createdBy: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPlayer = {
    id: playerId,
    userId,
    guildId,
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // ARRANGE: Setup test dependencies with mocks
    mockOrganizationRepository = {
      findById: vi.fn(),
      findByLeagueId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findTeamsByOrganization: vi.fn(),
      findMembersByOrganization: vi.fn(),
      countTeamsByOrganization: vi.fn(),
      countGeneralManagers: vi.fn(),
      findByIdAndLeague: vi.fn(),
    } as unknown as OrganizationRepository;

    mockOrganizationMemberService = {
      addMember: vi.fn(),
      isGeneralManager: vi.fn(),
      hasGeneralManagers: vi.fn(),
    } as unknown as OrganizationMemberService;

    mockValidationService = {
      validateCreate: vi.fn().mockResolvedValue(undefined),
      validateLeagueOrganizationCapacity: vi.fn().mockResolvedValue(undefined),
      validateCanDeleteOrganization: vi.fn().mockResolvedValue(undefined),
      validateTeamTransfer: vi.fn().mockResolvedValue(undefined),
    } as unknown as OrganizationValidationService;

    mockPlayerService = {
      ensurePlayerExists: vi.fn(),
    } as unknown as PlayerService;

    mockLeagueRepository = {
      findById: vi.fn(),
    } as unknown as LeagueRepository;

    mockLeagueSettingsService = {
      getSettings: vi.fn(),
    } as unknown as LeagueSettingsService;

    mockTeamRepository = {
      findById: vi.fn(),
      update: vi.fn(),
    } as unknown as TeamRepository;

    mockPrisma = {
      $transaction: vi.fn().mockImplementation((callback) => {
        const mockTx = {
          team: {
            count: vi.fn().mockResolvedValue(0),
            update: vi.fn(),
          },
        } as any;
        return callback(mockTx);
      }),
    } as unknown as PrismaService;

    service = new OrganizationService(
      mockOrganizationRepository,
      mockOrganizationMemberService,
      mockValidationService,
      mockPlayerService,
      mockLeagueRepository,
      mockLeagueSettingsService,
      mockTeamRepository,
      mockPrisma,
    );
  });

  describe('findOne', () => {
    it('should_return_organization_when_organization_exists', async () => {
      // ARRANGE
      vi.mocked(mockOrganizationRepository.findById).mockResolvedValue(
        mockOrganization,
      );

      // ACT
      const result = await service.findOne(organizationId);

      // ASSERT
      expect(result).toEqual(mockOrganization);
      expect(result.id).toBe(organizationId);
    });

    it('should_throw_OrganizationNotFoundException_when_organization_does_not_exist', async () => {
      // ARRANGE
      vi.mocked(mockOrganizationRepository.findById).mockResolvedValue(null);

      // ACT & ASSERT
      await expect(service.findOne(organizationId)).rejects.toThrow(
        OrganizationNotFoundException,
      );
    });
  });

  describe('findByLeagueId', () => {
    it('should_return_organizations_for_league', async () => {
      // ARRANGE
      const organizations = [mockOrganization];
      vi.mocked(mockOrganizationRepository.findByLeagueId).mockResolvedValue(
        organizations,
      );

      // ACT
      const result = await service.findByLeagueId(leagueId);

      // ASSERT
      expect(result).toEqual(organizations);
      expect(result).toHaveLength(1);
    });

    it('should_return_empty_array_when_no_organizations_exist', async () => {
      // ARRANGE
      vi.mocked(mockOrganizationRepository.findByLeagueId).mockResolvedValue(
        [],
      );

      // ACT
      const result = await service.findByLeagueId(leagueId);

      // ASSERT
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('create', () => {
    it('should_create_organization_with_gm_when_user_is_not_system', async () => {
      // ARRANGE
      const createDto: CreateOrganizationDto = {
        leagueId,
        name: 'New Organization',
        tag: 'NEW',
      };
      const createdOrg = { ...mockOrganization, ...createDto };

      vi.mocked(mockLeagueRepository.findById).mockResolvedValue(mockLeague);
      vi.mocked(mockPlayerService.ensurePlayerExists).mockResolvedValue(
        mockPlayer as any,
      );
      vi.mocked(mockOrganizationRepository.create).mockResolvedValue(
        createdOrg,
      );
      vi.mocked(mockOrganizationRepository.findById).mockResolvedValue(
        createdOrg,
      );

      // ACT
      const result = await service.create(createDto, userId);

      // ASSERT: Verify organization created with GM
      expect(result).toEqual(createdOrg);
      expect(result.name).toBe(createDto.name);
    });

    it('should_create_organization_without_gm_when_user_is_system', async () => {
      // ARRANGE
      const createDto: CreateOrganizationDto = {
        leagueId,
        name: 'System Organization',
      };
      const createdOrg = { ...mockOrganization, ...createDto };

      vi.mocked(mockLeagueRepository.findById).mockResolvedValue(mockLeague);
      vi.mocked(mockOrganizationRepository.create).mockResolvedValue(
        createdOrg,
      );
      vi.mocked(mockOrganizationRepository.findById).mockResolvedValue(
        createdOrg,
      );

      // ACT
      const result = await service.create(createDto, 'system');

      // ASSERT: Verify organization created without GM
      expect(result).toEqual(createdOrg);
      expect(mockPlayerService.ensurePlayerExists).not.toHaveBeenCalled();
    });

    it('should_throw_NotFoundException_when_league_does_not_exist', async () => {
      // ARRANGE
      const createDto: CreateOrganizationDto = {
        leagueId: 'non-existent',
        name: 'Test Org',
      };
      vi.mocked(mockLeagueRepository.findById).mockResolvedValue(null);

      // ACT & ASSERT
      await expect(service.create(createDto, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should_validate_organization_creation_before_creating', async () => {
      // ARRANGE
      const createDto: CreateOrganizationDto = {
        leagueId,
        name: 'Test Org',
      };
      const validationError = new BadRequestException('Validation failed');
      vi.mocked(mockValidationService.validateCreate).mockRejectedValue(
        validationError,
      );
      vi.mocked(mockLeagueRepository.findById).mockResolvedValue(mockLeague);

      // ACT & ASSERT
      await expect(service.create(createDto, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should_validate_league_capacity_before_creating', async () => {
      // ARRANGE
      const createDto: CreateOrganizationDto = {
        leagueId,
        name: 'Test Org',
      };
      const capacityError = new BadRequestException('Capacity exceeded');
      vi.mocked(
        mockValidationService.validateLeagueOrganizationCapacity,
      ).mockRejectedValue(capacityError);
      vi.mocked(mockLeagueRepository.findById).mockResolvedValue(mockLeague);

      // ACT & ASSERT
      await expect(service.create(createDto, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('update', () => {
    it('should_update_organization_when_user_is_gm', async () => {
      // ARRANGE
      const updateDto: UpdateOrganizationDto = {
        name: 'Updated Name',
      };
      const updatedOrg = { ...mockOrganization, ...updateDto };

      vi.mocked(mockOrganizationRepository.findById).mockResolvedValue(
        mockOrganization,
      );
      vi.mocked(
        mockOrganizationMemberService.isGeneralManager,
      ).mockResolvedValue(true);
      vi.mocked(mockOrganizationRepository.update).mockResolvedValue(
        updatedOrg,
      );

      // ACT
      const result = await service.update(organizationId, updateDto, userId);

      // ASSERT
      expect(result).toEqual(updatedOrg);
      expect(result.name).toBe(updateDto.name);
    });

    it('should_throw_NotGeneralManagerException_when_user_is_not_gm', async () => {
      // ARRANGE
      const updateDto: UpdateOrganizationDto = {
        name: 'Updated Name',
      };

      vi.mocked(mockOrganizationRepository.findById).mockResolvedValue(
        mockOrganization,
      );
      vi.mocked(
        mockOrganizationMemberService.isGeneralManager,
      ).mockResolvedValue(false);
      vi.mocked(
        mockOrganizationMemberService.hasGeneralManagers,
      ).mockResolvedValue(true);

      // ACT & ASSERT
      await expect(
        service.update(organizationId, updateDto, userId),
      ).rejects.toThrow(NotGeneralManagerException);
    });

    it('should_allow_bot_user_to_update_organization_with_no_gms', async () => {
      // ARRANGE
      const updateDto: UpdateOrganizationDto = {
        name: 'Updated Name',
      };
      const updatedOrg = { ...mockOrganization, ...updateDto };

      vi.mocked(mockOrganizationRepository.findById).mockResolvedValue(
        mockOrganization,
      );
      vi.mocked(
        mockOrganizationMemberService.isGeneralManager,
      ).mockResolvedValue(false);
      vi.mocked(
        mockOrganizationMemberService.hasGeneralManagers,
      ).mockResolvedValue(false);
      vi.mocked(mockOrganizationRepository.update).mockResolvedValue(
        updatedOrg,
      );

      // ACT
      const result = await service.update(organizationId, updateDto, 'bot');

      // ASSERT
      expect(result).toEqual(updatedOrg);
    });

    it('should_throw_OrganizationNotFoundException_when_organization_does_not_exist', async () => {
      // ARRANGE
      const updateDto: UpdateOrganizationDto = {
        name: 'Updated Name',
      };

      vi.mocked(mockOrganizationRepository.findById).mockResolvedValue(null);

      // ACT & ASSERT
      await expect(
        service.update(organizationId, updateDto, userId),
      ).rejects.toThrow(OrganizationNotFoundException);
    });
  });

  describe('delete', () => {
    it('should_delete_organization_when_user_is_gm', async () => {
      // ARRANGE
      vi.mocked(mockOrganizationRepository.findById).mockResolvedValue(
        mockOrganization,
      );
      vi.mocked(
        mockOrganizationMemberService.isGeneralManager,
      ).mockResolvedValue(true);
      vi.mocked(mockOrganizationRepository.delete).mockResolvedValue(
        mockOrganization,
      );

      // ACT
      const result = await service.delete(organizationId, userId);

      // ASSERT
      expect(result).toEqual(mockOrganization);
    });

    it('should_throw_NotGeneralManagerException_when_user_is_not_gm', async () => {
      // ARRANGE
      vi.mocked(mockOrganizationRepository.findById).mockResolvedValue(
        mockOrganization,
      );
      vi.mocked(
        mockOrganizationMemberService.isGeneralManager,
      ).mockResolvedValue(false);
      vi.mocked(
        mockOrganizationMemberService.hasGeneralManagers,
      ).mockResolvedValue(true);

      // ACT & ASSERT
      await expect(service.delete(organizationId, userId)).rejects.toThrow(
        NotGeneralManagerException,
      );
    });

    it('should_validate_can_delete_before_deleting', async () => {
      // ARRANGE
      const validationError = new BadRequestException('Has teams');
      vi.mocked(mockOrganizationRepository.findById).mockResolvedValue(
        mockOrganization,
      );
      vi.mocked(
        mockOrganizationMemberService.isGeneralManager,
      ).mockResolvedValue(true);
      vi.mocked(
        mockValidationService.validateCanDeleteOrganization,
      ).mockRejectedValue(validationError);

      // ACT & ASSERT
      await expect(service.delete(organizationId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findTeams', () => {
    it('should_return_teams_for_organization', async () => {
      // ARRANGE
      const teams = [
        {
          id: 'team-1',
          organizationId,
          name: 'Team 1',
        },
      ];
      vi.mocked(mockOrganizationRepository.findById).mockResolvedValue(
        mockOrganization,
      );
      vi.mocked(
        mockOrganizationRepository.findTeamsByOrganization,
      ).mockResolvedValue(teams as any);

      // ACT
      const result = await service.findTeams(organizationId);

      // ASSERT
      expect(result).toEqual(teams);
      expect(result).toHaveLength(1);
    });

    it('should_throw_OrganizationNotFoundException_when_organization_does_not_exist', async () => {
      // ARRANGE
      vi.mocked(mockOrganizationRepository.findById).mockResolvedValue(null);

      // ACT & ASSERT
      await expect(service.findTeams(organizationId)).rejects.toThrow(
        OrganizationNotFoundException,
      );
    });
  });

  describe('transferTeam', () => {
    it('should_transfer_team_when_user_is_source_gm', async () => {
      // ARRANGE
      const teamId = 'team-123';
      const targetOrgId = 'org-456';
      const team = {
        id: teamId,
        organizationId,
        leagueId,
      };
      const updatedTeam = {
        ...team,
        organizationId: targetOrgId,
      };

      vi.mocked(mockTeamRepository.findById).mockResolvedValue(team as any);
      vi.mocked(mockOrganizationMemberService.isGeneralManager)
        .mockResolvedValueOnce(true) // Source GM check
        .mockResolvedValueOnce(false); // Target GM check
      vi.mocked(mockTeamRepository.update).mockResolvedValue(
        updatedTeam as any,
      );

      // ACT
      const result = await service.transferTeam(teamId, targetOrgId, userId);

      // ASSERT
      expect(result).toEqual(updatedTeam);
      expect(result.organizationId).toBe(targetOrgId);
    });

    it('should_transfer_team_when_user_is_target_gm', async () => {
      // ARRANGE
      const teamId = 'team-123';
      const targetOrgId = 'org-456';
      const team = {
        id: teamId,
        organizationId,
        leagueId,
      };
      const updatedTeam = {
        ...team,
        organizationId: targetOrgId,
      };

      vi.mocked(mockTeamRepository.findById).mockResolvedValue(team as any);
      vi.mocked(mockOrganizationMemberService.isGeneralManager)
        .mockResolvedValueOnce(false) // Source GM check
        .mockResolvedValueOnce(true); // Target GM check
      vi.mocked(mockTeamRepository.update).mockResolvedValue(
        updatedTeam as any,
      );

      // ACT
      const result = await service.transferTeam(teamId, targetOrgId, userId);

      // ASSERT
      expect(result).toEqual(updatedTeam);
    });

    it('should_throw_ForbiddenException_when_user_is_neither_source_nor_target_gm', async () => {
      // ARRANGE
      const teamId = 'team-123';
      const targetOrgId = 'org-456';
      const team = {
        id: teamId,
        organizationId,
        leagueId,
      };

      vi.mocked(mockTeamRepository.findById).mockResolvedValue(team as any);
      vi.mocked(mockOrganizationMemberService.isGeneralManager)
        .mockResolvedValueOnce(false) // Source GM check
        .mockResolvedValueOnce(false); // Target GM check

      // ACT & ASSERT
      await expect(
        service.transferTeam(teamId, targetOrgId, userId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should_throw_NotFoundException_when_team_does_not_exist', async () => {
      // ARRANGE
      const teamId = 'non-existent';
      const targetOrgId = 'org-456';

      vi.mocked(mockTeamRepository.findById).mockResolvedValue(null);

      // ACT & ASSERT
      await expect(
        service.transferTeam(teamId, targetOrgId, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should_throw_BadRequestException_when_team_has_no_organization', async () => {
      // ARRANGE
      const teamId = 'team-123';
      const targetOrgId = 'org-456';
      const team = {
        id: teamId,
        organizationId: null,
        leagueId,
      };

      vi.mocked(mockTeamRepository.findById).mockResolvedValue(team as any);

      // ACT & ASSERT
      await expect(
        service.transferTeam(teamId, targetOrgId, userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getOrganizationStats', () => {
    it('should_return_organization_statistics', async () => {
      // ARRANGE
      vi.mocked(mockOrganizationRepository.findById).mockResolvedValue(
        mockOrganization,
      );
      vi.mocked(
        mockOrganizationRepository.countTeamsByOrganization,
      ).mockResolvedValue(5);
      vi.mocked(
        mockOrganizationRepository.findMembersByOrganization,
      ).mockResolvedValue([{ id: 'member-1' }, { id: 'member-2' }] as any);
      vi.mocked(
        mockOrganizationRepository.countGeneralManagers,
      ).mockResolvedValue(2);

      // ACT
      const result = await service.getOrganizationStats(organizationId);

      // ASSERT
      expect(result).toEqual({
        organizationId,
        name: mockOrganization.name,
        teamCount: 5,
        memberCount: 2,
        generalManagerCount: 2,
      });
    });

    it('should_throw_OrganizationNotFoundException_when_organization_does_not_exist', async () => {
      // ARRANGE
      vi.mocked(mockOrganizationRepository.findById).mockResolvedValue(null);

      // ACT & ASSERT
      await expect(
        service.getOrganizationStats(organizationId),
      ).rejects.toThrow(OrganizationNotFoundException);
    });
  });

  describe('assignTeamsToOrganization', () => {
    it('should_assign_teams_successfully_when_capacity_allows', async () => {
      // ARRANGE
      const teamIds = ['team-1', 'team-2'];
      const leagueSettings = {
        membership: {
          maxTeamsPerOrganization: 10,
        },
      };

      vi.mocked(mockOrganizationRepository.findByIdAndLeague).mockResolvedValue(
        mockOrganization,
      );
      vi.mocked(mockLeagueSettingsService.getSettings).mockResolvedValue(
        leagueSettings as any,
      );
      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback) => {
          const mockTx = {
            team: {
              count: vi.fn().mockResolvedValue(3), // Current count
              update: vi.fn().mockImplementation((args: any) => ({
                id: args.where.id,
                organizationId,
                ...args.data,
              })),
            },
          } as any;
          return callback(mockTx);
        },
      );

      // ACT
      const result = await service.assignTeamsToOrganization(
        leagueId,
        organizationId,
        teamIds,
      );

      // ASSERT
      expect(result).toHaveLength(2);
      expect(result[0].organizationId).toBe(organizationId);
    });

    it('should_throw_OrganizationCapacityExceededException_when_capacity_exceeded', async () => {
      // ARRANGE
      const teamIds = ['team-1', 'team-2'];
      const leagueSettings = {
        membership: {
          maxTeamsPerOrganization: 5,
        },
      };

      vi.mocked(mockOrganizationRepository.findByIdAndLeague).mockResolvedValue(
        mockOrganization,
      );
      vi.mocked(mockLeagueSettingsService.getSettings).mockResolvedValue(
        leagueSettings as any,
      );
      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback) => {
          const mockTx = {
            team: {
              count: vi.fn().mockResolvedValue(4), // Current count (4 + 2 = 6 > 5)
              update: vi.fn(),
            },
          } as any;
          return callback(mockTx);
        },
      );

      // ACT & ASSERT
      await expect(
        service.assignTeamsToOrganization(leagueId, organizationId, teamIds),
      ).rejects.toThrow(OrganizationCapacityExceededException);
    });

    it('should_throw_OrganizationNotFoundException_when_organization_not_in_league', async () => {
      // ARRANGE
      const teamIds = ['team-1'];

      vi.mocked(mockOrganizationRepository.findByIdAndLeague).mockResolvedValue(
        null,
      );

      // ACT & ASSERT
      await expect(
        service.assignTeamsToOrganization(leagueId, organizationId, teamIds),
      ).rejects.toThrow(OrganizationNotFoundException);
    });

    it('should_allow_unlimited_teams_when_maxTeamsPerOrganization_is_null', async () => {
      // ARRANGE
      const teamIds = ['team-1', 'team-2'];
      const leagueSettings = {
        membership: {
          maxTeamsPerOrganization: null,
        },
      };

      vi.mocked(mockOrganizationRepository.findByIdAndLeague).mockResolvedValue(
        mockOrganization,
      );
      vi.mocked(mockLeagueSettingsService.getSettings).mockResolvedValue(
        leagueSettings as any,
      );
      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback) => {
          const mockTx = {
            team: {
              count: vi.fn().mockResolvedValue(100), // High count, but no limit
              update: vi.fn().mockImplementation((args: any) => ({
                id: args.where.id,
                organizationId,
                ...args.data,
              })),
            },
          } as any;
          return callback(mockTx);
        },
      );

      // ACT
      const result = await service.assignTeamsToOrganization(
        leagueId,
        organizationId,
        teamIds,
      );

      // ASSERT
      expect(result).toHaveLength(2);
    });
  });
});
