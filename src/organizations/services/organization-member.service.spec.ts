/**
 * OrganizationMemberService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { OrganizationMemberService } from './organization-member.service';
import { OrganizationRepository } from '../repositories/organization.repository';
import { OrganizationValidationService } from './organization-validation.service';
import { UpdateOrganizationMemberDto } from '../dto/update-organization-member.dto';
import { OrganizationMemberRole } from '@prisma/client';
import {
  OrganizationMemberNotFoundException,
  OrganizationNotFoundException,
} from '../exceptions/organization.exceptions';
import { Organization } from '@prisma/client';

describe('OrganizationMemberService', () => {
  let service: OrganizationMemberService;
  let mockOrganizationRepository: OrganizationRepository;
  let mockValidationService: OrganizationValidationService;

  const organizationId = 'org-123';
  const memberId = 'member-123';
  const playerId = 'player-123';
  const userId = 'user-123';
  const leagueId = 'league-123';

  const mockOrganization: Organization = {
    id: organizationId,
    leagueId,
    name: 'Test Organization',
    tag: 'TEST',
    description: 'Test description',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMember = {
    id: memberId,
    organizationId,
    playerId,
    leagueId,
    role: OrganizationMemberRole.MEMBER,
    approvedBy: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    vi.restoreAllMocks();

    mockOrganizationRepository = {
      findById: vi.fn(),
      findMembersByOrganization: vi.fn(),
      findMemberById: vi.fn(),
      findMembersByPlayer: vi.fn(),
      addMember: vi.fn(),
      updateMember: vi.fn(),
      removeMember: vi.fn(),
      findGeneralManagers: vi.fn(),
      countGeneralManagers: vi.fn(),
    } as unknown as OrganizationRepository;

    mockValidationService = {
      validateMemberAdd: vi.fn().mockResolvedValue(undefined),
      validateCanRemoveGeneralManager: vi.fn().mockResolvedValue(undefined),
      validateGeneralManagerRequirement: vi.fn().mockResolvedValue(undefined),
    } as unknown as OrganizationValidationService;

    const module = await Test.createTestingModule({
      providers: [
        OrganizationMemberService,
        {
          provide: OrganizationRepository,
          useValue: mockOrganizationRepository,
        },
        {
          provide: OrganizationValidationService,
          useValue: mockValidationService,
        },
      ],
    }).compile();

    service = module.get<OrganizationMemberService>(OrganizationMemberService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findMembers', () => {
    it('should_return_members_when_organization_has_members', async () => {
      const mockMembers = [mockMember];

      vi.mocked(
        mockOrganizationRepository.findMembersByOrganization,
      ).mockResolvedValue(mockMembers as never);

      const result = await service.findMembers(organizationId);

      expect(result).toEqual(mockMembers);
      expect(
        mockOrganizationRepository.findMembersByOrganization,
      ).toHaveBeenCalledWith(organizationId);
    });
  });

  describe('findMemberById', () => {
    it('should_return_member_when_member_exists', async () => {
      vi.mocked(mockOrganizationRepository.findMemberById).mockResolvedValue(
        mockMember as never,
      );

      const result = await service.findMemberById(memberId);

      expect(result).toEqual(mockMember);
      expect(mockOrganizationRepository.findMemberById).toHaveBeenCalledWith(
        memberId,
      );
    });

    it('should_throw_OrganizationMemberNotFoundException_when_member_does_not_exist', async () => {
      vi.mocked(mockOrganizationRepository.findMemberById).mockResolvedValue(
        null,
      );

      await expect(service.findMemberById(memberId)).rejects.toThrow(
        OrganizationMemberNotFoundException,
      );
    });
  });

  describe('findMemberByPlayer', () => {
    it('should_return_member_when_member_exists', async () => {
      const mockMembers = [mockMember];

      vi.mocked(mockOrganizationRepository.findById).mockResolvedValue(
        mockOrganization,
      );
      vi.mocked(
        mockOrganizationRepository.findMembersByPlayer,
      ).mockResolvedValue(mockMembers as never);

      const result = await service.findMemberByPlayer(organizationId, playerId);

      expect(result).toEqual(mockMembers);
      expect(mockOrganizationRepository.findById).toHaveBeenCalledWith(
        organizationId,
      );
      expect(
        mockOrganizationRepository.findMembersByPlayer,
      ).toHaveBeenCalledWith(playerId, leagueId);
    });

    it('should_return_null_when_organization_does_not_exist', async () => {
      vi.mocked(mockOrganizationRepository.findById).mockResolvedValue(null);

      const result = await service.findMemberByPlayer(organizationId, playerId);

      expect(result).toBe(null);
      expect(
        mockOrganizationRepository.findMembersByPlayer,
      ).not.toHaveBeenCalled();
    });
  });

  describe('addMember', () => {
    it('should_add_member_when_organization_exists', async () => {
      vi.mocked(mockOrganizationRepository.findById).mockResolvedValue(
        mockOrganization,
      );
      vi.mocked(mockOrganizationRepository.addMember).mockResolvedValue(
        mockMember as never,
      );

      const result = await service.addMember(
        organizationId,
        playerId,
        OrganizationMemberRole.MEMBER,
        userId,
      );

      expect(result).toEqual(mockMember);
      expect(mockValidationService.validateMemberAdd).toHaveBeenCalledWith(
        organizationId,
        playerId,
        leagueId,
      );
      expect(mockOrganizationRepository.addMember).toHaveBeenCalledWith({
        organizationId,
        playerId,
        leagueId,
        role: OrganizationMemberRole.MEMBER,
        approvedBy: userId,
      });
    });

    it('should_throw_OrganizationNotFoundException_when_organization_does_not_exist', async () => {
      vi.mocked(mockOrganizationRepository.findById).mockResolvedValue(null);

      await expect(
        service.addMember(
          organizationId,
          playerId,
          OrganizationMemberRole.MEMBER,
          userId,
        ),
      ).rejects.toThrow(OrganizationNotFoundException);
    });
  });

  describe('updateMemberRole', () => {
    it('should_update_role_when_member_exists', async () => {
      const updatedMember = {
        ...mockMember,
        role: OrganizationMemberRole.GENERAL_MANAGER,
      };

      vi.mocked(mockOrganizationRepository.findMemberById).mockResolvedValue(
        mockMember as never,
      );
      vi.mocked(mockOrganizationRepository.updateMember).mockResolvedValue(
        updatedMember as never,
      );

      const result = await service.updateMemberRole(
        memberId,
        OrganizationMemberRole.GENERAL_MANAGER,
        userId,
      );

      expect(result).toEqual(updatedMember);
      expect(mockOrganizationRepository.updateMember).toHaveBeenCalledWith(
        memberId,
        { role: OrganizationMemberRole.GENERAL_MANAGER },
      );
    });

    it('should_validate_when_removing_general_manager', async () => {
      const gmMember = {
        ...mockMember,
        role: OrganizationMemberRole.GENERAL_MANAGER,
      };
      const updatedMember = {
        ...mockMember,
        role: OrganizationMemberRole.MEMBER,
      };

      vi.mocked(mockOrganizationRepository.findMemberById).mockResolvedValue(
        gmMember as never,
      );
      vi.mocked(mockOrganizationRepository.updateMember).mockResolvedValue(
        updatedMember as never,
      );

      const result = await service.updateMemberRole(
        memberId,
        OrganizationMemberRole.MEMBER,
        userId,
      );

      expect(result).toEqual(updatedMember);
      expect(
        mockValidationService.validateCanRemoveGeneralManager,
      ).toHaveBeenCalledWith(organizationId, memberId);
    });
  });

  describe('updateMember', () => {
    it('should_update_member_when_member_exists', async () => {
      const updateDto: UpdateOrganizationMemberDto = {
        role: OrganizationMemberRole.MEMBER,
      };
      const updatedMember = { ...mockMember, ...updateDto };

      vi.mocked(mockOrganizationRepository.findMemberById).mockResolvedValue(
        mockMember as never,
      );
      vi.mocked(mockOrganizationRepository.updateMember).mockResolvedValue(
        updatedMember as never,
      );

      const result = await service.updateMember(memberId, updateDto, userId);

      expect(result).toEqual(updatedMember);
      expect(mockOrganizationRepository.updateMember).toHaveBeenCalledWith(
        memberId,
        updateDto,
      );
    });

    it('should_validate_when_removing_general_manager_role', async () => {
      const gmMember = {
        ...mockMember,
        role: OrganizationMemberRole.GENERAL_MANAGER,
      };
      const updateDto: UpdateOrganizationMemberDto = {
        role: OrganizationMemberRole.MEMBER,
      };
      const updatedMember = { ...gmMember, ...updateDto };

      vi.mocked(mockOrganizationRepository.findMemberById).mockResolvedValue(
        gmMember as never,
      );
      vi.mocked(mockOrganizationRepository.updateMember).mockResolvedValue(
        updatedMember as never,
      );

      const result = await service.updateMember(memberId, updateDto, userId);

      expect(result).toEqual(updatedMember);
      expect(
        mockValidationService.validateCanRemoveGeneralManager,
      ).toHaveBeenCalledWith(organizationId, memberId);
    });
  });

  describe('removeMember', () => {
    it('should_remove_member_when_member_exists', async () => {
      vi.mocked(mockOrganizationRepository.findMemberById).mockResolvedValue(
        mockMember as never,
      );
      vi.mocked(mockOrganizationRepository.removeMember).mockResolvedValue(
        mockMember as never,
      );

      const result = await service.removeMember(memberId, userId);

      expect(result).toEqual(mockMember);
      expect(mockOrganizationRepository.removeMember).toHaveBeenCalledWith(
        memberId,
      );
    });

    it('should_validate_when_removing_general_manager', async () => {
      const gmMember = {
        ...mockMember,
        role: OrganizationMemberRole.GENERAL_MANAGER,
      };

      vi.mocked(mockOrganizationRepository.findMemberById).mockResolvedValue(
        gmMember as never,
      );
      vi.mocked(mockOrganizationRepository.removeMember).mockResolvedValue(
        gmMember as never,
      );

      const result = await service.removeMember(memberId, userId);

      expect(result).toEqual(gmMember);
      expect(
        mockValidationService.validateCanRemoveGeneralManager,
      ).toHaveBeenCalledWith(organizationId, memberId);
    });
  });

  describe('promoteToGeneralManager', () => {
    it('should_promote_member_to_general_manager', async () => {
      const updatedMember = {
        ...mockMember,
        role: OrganizationMemberRole.GENERAL_MANAGER,
      };

      vi.mocked(mockOrganizationRepository.findMemberById).mockResolvedValue(
        mockMember as never,
      );
      vi.mocked(mockOrganizationRepository.updateMember).mockResolvedValue(
        updatedMember as never,
      );

      const result = await service.promoteToGeneralManager(memberId, userId);

      expect(result).toEqual(updatedMember);
      expect(mockOrganizationRepository.updateMember).toHaveBeenCalledWith(
        memberId,
        { role: OrganizationMemberRole.GENERAL_MANAGER },
      );
    });
  });

  describe('ensureGeneralManagerExists', () => {
    it('should_validate_general_manager_requirement', async () => {
      await service.ensureGeneralManagerExists(organizationId);

      expect(
        mockValidationService.validateGeneralManagerRequirement,
      ).toHaveBeenCalledWith(organizationId);
    });
  });

  describe('getGeneralManagers', () => {
    it('should_return_general_managers', async () => {
      const mockGms = [
        {
          ...mockMember,
          role: OrganizationMemberRole.GENERAL_MANAGER,
        },
      ];

      vi.mocked(
        mockOrganizationRepository.findGeneralManagers,
      ).mockResolvedValue(mockGms as never);

      const result = await service.getGeneralManagers(organizationId);

      expect(result).toEqual(mockGms);
      expect(
        mockOrganizationRepository.findGeneralManagers,
      ).toHaveBeenCalledWith(organizationId);
    });
  });

  describe('isGeneralManager', () => {
    it('should_return_true_when_user_is_general_manager', async () => {
      const mockGms = [
        {
          ...mockMember,
          role: OrganizationMemberRole.GENERAL_MANAGER,
          player: {
            id: playerId,
            guildMember: {
              user: {
                id: userId,
              },
            },
          },
        },
      ];

      vi.mocked(mockOrganizationRepository.findById).mockResolvedValue(
        mockOrganization,
      );
      vi.mocked(
        mockOrganizationRepository.findGeneralManagers,
      ).mockResolvedValue(mockGms as never);

      const result = await service.isGeneralManager(userId, organizationId);

      expect(result).toBe(true);
    });

    it('should_return_false_when_user_is_not_general_manager', async () => {
      const mockGms = [
        {
          ...mockMember,
          role: OrganizationMemberRole.GENERAL_MANAGER,
          player: {
            id: playerId,
            guildMember: {
              user: {
                id: 'other-user-id',
              },
            },
          },
        },
      ];

      vi.mocked(mockOrganizationRepository.findById).mockResolvedValue(
        mockOrganization,
      );
      vi.mocked(
        mockOrganizationRepository.findGeneralManagers,
      ).mockResolvedValue(mockGms as never);

      const result = await service.isGeneralManager(userId, organizationId);

      expect(result).toBe(false);
    });

    it('should_return_false_when_organization_does_not_exist', async () => {
      vi.mocked(mockOrganizationRepository.findById).mockResolvedValue(null);

      const result = await service.isGeneralManager(userId, organizationId);

      expect(result).toBe(false);
    });
  });

  describe('hasGeneralManagers', () => {
    it('should_return_true_when_organization_has_general_managers', async () => {
      vi.mocked(
        mockOrganizationRepository.countGeneralManagers,
      ).mockResolvedValue(2);

      const result = await service.hasGeneralManagers(organizationId);

      expect(result).toBe(true);
      expect(
        mockOrganizationRepository.countGeneralManagers,
      ).toHaveBeenCalledWith(organizationId);
    });

    it('should_return_false_when_organization_has_no_general_managers', async () => {
      vi.mocked(
        mockOrganizationRepository.countGeneralManagers,
      ).mockResolvedValue(0);

      const result = await service.hasGeneralManagers(organizationId);

      expect(result).toBe(false);
    });
  });
});
