/**
 * OrganizationsController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { OrganizationsController } from './organizations.controller';
import { OrganizationService } from './organization.service';
import { OrganizationMemberService } from './services/organization-member.service';
import { OrganizationAuthorizationService } from './services/organization-authorization.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { AddOrganizationMemberDto } from './dto/add-organization-member.dto';
import { UpdateOrganizationMemberDto } from './dto/update-organization-member.dto';
import { TransferTeamDto } from './dto/transfer-team.dto';
import { OrganizationMemberRole } from '@prisma/client';
import type { AuthenticatedUser } from '../common/interfaces/user.interface';

describe('OrganizationsController', () => {
  let controller: OrganizationsController;
  let mockOrganizationService: OrganizationService;
  let mockOrganizationMemberService: OrganizationMemberService;

  const mockUser: AuthenticatedUser = {
    id: 'user-123',
    username: 'testuser',
    globalName: 'Test User',
    avatar: 'avatar_hash',
    email: 'test@example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  };

  const mockOrganization = {
    id: 'org-123',
    name: 'Test Organization',
    leagueId: 'league-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockOrganizationService = {
      findByLeagueId: vi.fn(),
      findOne: vi.fn(),
      findTeams: vi.fn(),
      getOrganizationStats: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      transferTeam: vi.fn(),
    } as unknown as OrganizationService;

    mockOrganizationMemberService = {
      findMembers: vi.fn(),
      addMember: vi.fn(),
      updateMember: vi.fn(),
      removeMember: vi.fn(),
    } as unknown as OrganizationMemberService;

    const mockOrganizationAuthorizationService = {
      isGeneralManager: vi.fn().mockResolvedValue(true),
    } as unknown as OrganizationAuthorizationService;

    const module = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [
        { provide: OrganizationService, useValue: mockOrganizationService },
        {
          provide: OrganizationMemberService,
          useValue: mockOrganizationMemberService,
        },
        {
          provide: OrganizationAuthorizationService,
          useValue: mockOrganizationAuthorizationService,
        },
      ],
    }).compile();

    controller = module.get<OrganizationsController>(OrganizationsController);
  });

  describe('getOrganizations', () => {
    it('should_return_organizations_when_league_id_is_provided', async () => {
      const mockOrganizations = [mockOrganization];
      vi.spyOn(mockOrganizationService, 'findByLeagueId').mockResolvedValue(
        mockOrganizations as never,
      );

      const result = await controller.getOrganizations('league-123');

      expect(result).toEqual(mockOrganizations);
      expect(mockOrganizationService.findByLeagueId).toHaveBeenCalledWith(
        'league-123',
      );
    });
  });

  describe('getOrganization', () => {
    it('should_return_organization_when_id_is_provided', async () => {
      vi.spyOn(mockOrganizationService, 'findOne').mockResolvedValue(
        mockOrganization as never,
      );

      const result = await controller.getOrganization('org-123');

      expect(result).toEqual(mockOrganization);
      expect(mockOrganizationService.findOne).toHaveBeenCalledWith('org-123');
    });
  });

  describe('getOrganizationTeams', () => {
    it('should_return_teams_when_organization_id_is_provided', async () => {
      const mockTeams = [{ id: 'team-123', name: 'Test Team' }];
      vi.spyOn(mockOrganizationService, 'findTeams').mockResolvedValue(
        mockTeams as never,
      );

      const result = await controller.getOrganizationTeams('org-123');

      expect(result).toEqual(mockTeams);
      expect(mockOrganizationService.findTeams).toHaveBeenCalledWith('org-123');
    });
  });

  describe('getOrganizationStats', () => {
    it('should_return_stats_when_organization_id_is_provided', async () => {
      const mockStats = { totalTeams: 5, totalMembers: 10 };
      vi.spyOn(
        mockOrganizationService,
        'getOrganizationStats',
      ).mockResolvedValue(mockStats as never);

      const result = await controller.getOrganizationStats('org-123');

      expect(result).toEqual(mockStats);
      expect(mockOrganizationService.getOrganizationStats).toHaveBeenCalledWith(
        'org-123',
      );
    });
  });

  describe('createOrganization', () => {
    it('should_create_organization_when_valid_data_is_provided', async () => {
      const createDto: CreateOrganizationDto = {
        name: 'New Organization',
      };

      vi.spyOn(mockOrganizationService, 'create').mockResolvedValue(
        mockOrganization as never,
      );

      const result = await controller.createOrganization(
        'league-123',
        createDto,
        mockUser,
      );

      expect(result).toEqual(mockOrganization);
      expect(mockOrganizationService.create).toHaveBeenCalledWith(
        { ...createDto, leagueId: 'league-123' },
        'user-123',
      );
    });
  });

  describe('updateOrganization', () => {
    it('should_update_organization_when_valid_data_is_provided', async () => {
      const updateDto: UpdateOrganizationDto = {
        name: 'Updated Organization',
      };

      const updatedOrg = {
        ...mockOrganization,
        name: 'Updated Organization',
      };

      vi.spyOn(mockOrganizationService, 'update').mockResolvedValue(
        updatedOrg as never,
      );

      const result = await controller.updateOrganization(
        'org-123',
        updateDto,
        mockUser,
      );

      expect(result).toEqual(updatedOrg);
      expect(mockOrganizationService.update).toHaveBeenCalledWith(
        'org-123',
        updateDto,
        'user-123',
      );
    });
  });

  describe('deleteOrganization', () => {
    it('should_delete_organization_when_id_is_provided', async () => {
      vi.spyOn(mockOrganizationService, 'delete').mockResolvedValue(
        mockOrganization as never,
      );

      const result = await controller.deleteOrganization('org-123', mockUser);

      expect(result).toEqual(mockOrganization);
      expect(mockOrganizationService.delete).toHaveBeenCalledWith(
        'org-123',
        'user-123',
      );
    });
  });

  describe('transferTeam', () => {
    it('should_transfer_team_when_valid_data_is_provided', async () => {
      const transferDto: TransferTeamDto = {
        targetOrganizationId: 'org-456',
      };

      const mockResult = { success: true };

      vi.spyOn(mockOrganizationService, 'transferTeam').mockResolvedValue(
        mockResult as never,
      );

      const result = await controller.transferTeam(
        'org-123',
        'team-123',
        transferDto,
        mockUser,
      );

      expect(result).toEqual(mockResult);
      expect(mockOrganizationService.transferTeam).toHaveBeenCalledWith(
        'team-123',
        'org-456',
        'user-123',
      );
    });
  });

  describe('getOrganizationMembers', () => {
    it('should_return_members_when_organization_id_is_provided', async () => {
      const mockMembers = [
        {
          id: 'member-123',
          organizationId: 'org-123',
          playerId: 'player-123',
          role: OrganizationMemberRole.MEMBER,
        },
      ];

      vi.spyOn(mockOrganizationMemberService, 'findMembers').mockResolvedValue(
        mockMembers as never,
      );

      const result = await controller.getOrganizationMembers('org-123');

      expect(result).toEqual(mockMembers);
      expect(mockOrganizationMemberService.findMembers).toHaveBeenCalledWith(
        'org-123',
      );
    });
  });

  describe('addOrganizationMember', () => {
    it('should_add_member_when_valid_data_is_provided', async () => {
      const addMemberDto: AddOrganizationMemberDto = {
        playerId: 'player-123',
        role: OrganizationMemberRole.MEMBER,
      };

      const mockMember = {
        id: 'member-123',
        organizationId: 'org-123',
        playerId: 'player-123',
        role: OrganizationMemberRole.MEMBER,
      };

      vi.spyOn(mockOrganizationMemberService, 'addMember').mockResolvedValue(
        mockMember as never,
      );

      const result = await controller.addOrganizationMember(
        'org-123',
        addMemberDto,
        mockUser,
      );

      expect(result).toEqual(mockMember);
      expect(mockOrganizationMemberService.addMember).toHaveBeenCalledWith(
        'org-123',
        'player-123',
        OrganizationMemberRole.MEMBER,
        'user-123',
      );
    });

    it('should_use_default_role_when_role_not_provided', async () => {
      const addMemberDto: AddOrganizationMemberDto = {
        playerId: 'player-123',
      };

      const mockMember = {
        id: 'member-123',
        organizationId: 'org-123',
        playerId: 'player-123',
        role: OrganizationMemberRole.MEMBER,
      };

      vi.spyOn(mockOrganizationMemberService, 'addMember').mockResolvedValue(
        mockMember as never,
      );

      await controller.addOrganizationMember('org-123', addMemberDto, mockUser);

      expect(mockOrganizationMemberService.addMember).toHaveBeenCalledWith(
        'org-123',
        'player-123',
        OrganizationMemberRole.MEMBER,
        'user-123',
      );
    });
  });

  describe('updateOrganizationMember', () => {
    it('should_update_member_when_valid_data_is_provided', async () => {
      const updateDto: UpdateOrganizationMemberDto = {
        role: OrganizationMemberRole.GENERAL_MANAGER,
      };

      const updatedMember = {
        id: 'member-123',
        role: OrganizationMemberRole.GENERAL_MANAGER,
      };

      vi.spyOn(mockOrganizationMemberService, 'updateMember').mockResolvedValue(
        updatedMember as never,
      );

      const result = await controller.updateOrganizationMember(
        'org-123',
        'member-123',
        updateDto,
        mockUser,
      );

      expect(result).toEqual(updatedMember);
      expect(mockOrganizationMemberService.updateMember).toHaveBeenCalledWith(
        'member-123',
        updateDto,
        'user-123',
      );
    });
  });

  describe('removeOrganizationMember', () => {
    it('should_remove_member_when_id_is_provided', async () => {
      const mockResult = { success: true };

      vi.spyOn(mockOrganizationMemberService, 'removeMember').mockResolvedValue(
        mockResult as never,
      );

      const result = await controller.removeOrganizationMember(
        'org-123',
        'member-123',
        mockUser,
      );

      expect(result).toEqual(mockResult);
      expect(mockOrganizationMemberService.removeMember).toHaveBeenCalledWith(
        'member-123',
        'user-123',
      );
    });
  });
});
