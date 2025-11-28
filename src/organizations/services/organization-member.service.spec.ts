import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationMemberService } from './organization-member.service';
import { OrganizationRepository } from '../repositories/organization.repository';
import { OrganizationValidationService } from './organization-validation.service';
import {
  OrganizationMemberNotFoundException,
  CannotRemoveLastGeneralManagerException,
  OrganizationNotFoundException,
} from '../exceptions/organization.exceptions';
import {
  OrganizationMemberRole,
  OrganizationMemberStatus,
} from '@prisma/client';

describe('OrganizationMemberService', () => {
  let service: OrganizationMemberService;
  let organizationRepository: OrganizationRepository;
  let validationService: OrganizationValidationService;

  const mockOrganizationRepository = {
    findById: jest.fn(),
    findMembersByOrganization: jest.fn(),
    findMemberById: jest.fn(),
    findMembersByPlayer: jest.fn(),
    addMember: jest.fn(),
    updateMember: jest.fn(),
    removeMember: jest.fn(),
    findGeneralManagers: jest.fn(),
  };

  const mockValidationService = {
    validateMemberAdd: jest.fn(),
    validateCanRemoveGeneralManager: jest.fn(),
    validateGeneralManagerRequirement: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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
    organizationRepository = module.get<OrganizationRepository>(
      OrganizationRepository,
    );
    validationService = module.get<OrganizationValidationService>(
      OrganizationValidationService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findMembers', () => {
    it('should return all members in organization', async () => {
      const mockMembers = [
        { id: 'm1', role: OrganizationMemberRole.GENERAL_MANAGER },
        { id: 'm2', role: OrganizationMemberRole.MEMBER },
      ];
      mockOrganizationRepository.findMembersByOrganization.mockResolvedValue(
        mockMembers,
      );

      const result = await service.findMembers('org1');

      expect(result).toEqual(mockMembers);
      expect(
        mockOrganizationRepository.findMembersByOrganization,
      ).toHaveBeenCalledWith('org1');
    });
  });

  describe('findMemberById', () => {
    it('should return member when found', async () => {
      const mockMember = {
        id: 'm1',
        organizationId: 'org1',
        playerId: 'player1',
      };
      mockOrganizationRepository.findMemberById.mockResolvedValue(mockMember);

      const result = await service.findMemberById('m1');

      expect(result).toEqual(mockMember);
    });

    it('should throw OrganizationMemberNotFoundException when not found', async () => {
      mockOrganizationRepository.findMemberById.mockResolvedValue(null);

      await expect(service.findMemberById('m1')).rejects.toThrow(
        OrganizationMemberNotFoundException,
      );
    });
  });

  describe('addMember', () => {
    it('should add member to organization', async () => {
      const mockOrganization = { id: 'org1', leagueId: 'league1' };
      const mockMember = {
        id: 'm1',
        organizationId: 'org1',
        playerId: 'player1',
        role: OrganizationMemberRole.MEMBER,
      };

      mockOrganizationRepository.findById.mockResolvedValue(mockOrganization);
      mockValidationService.validateMemberAdd.mockResolvedValue(undefined);
      mockOrganizationRepository.addMember.mockResolvedValue(mockMember);

      const result = await service.addMember(
        'org1',
        'player1',
        OrganizationMemberRole.MEMBER,
        'user1',
      );

      expect(mockValidationService.validateMemberAdd).toHaveBeenCalledWith(
        'org1',
        'player1',
        'league1',
      );
      expect(mockOrganizationRepository.addMember).toHaveBeenCalledWith({
        organizationId: 'org1',
        playerId: 'player1',
        leagueId: 'league1',
        role: OrganizationMemberRole.MEMBER,
        approvedBy: 'user1',
      });
      expect(result).toEqual(mockMember);
    });

    it('should throw OrganizationNotFoundException when organization not found', async () => {
      mockOrganizationRepository.findById.mockResolvedValue(null);

      await expect(
        service.addMember(
          'org1',
          'player1',
          OrganizationMemberRole.MEMBER,
          'user1',
        ),
      ).rejects.toThrow(OrganizationNotFoundException);
    });
  });

  describe('updateMemberRole', () => {
    it('should update member role', async () => {
      const mockMember = {
        id: 'm1',
        organizationId: 'org1',
        role: OrganizationMemberRole.MEMBER,
      };
      const updatedMember = {
        ...mockMember,
        role: OrganizationMemberRole.GENERAL_MANAGER,
      };

      mockOrganizationRepository.findMemberById.mockResolvedValue(mockMember);
      mockValidationService.validateCanRemoveGeneralManager.mockResolvedValue(
        undefined,
      );
      mockOrganizationRepository.updateMember.mockResolvedValue(updatedMember);

      const result = await service.updateMemberRole(
        'm1',
        OrganizationMemberRole.GENERAL_MANAGER,
        'user1',
      );

      expect(mockOrganizationRepository.updateMember).toHaveBeenCalledWith(
        'm1',
        {
          role: OrganizationMemberRole.GENERAL_MANAGER,
        },
      );
      expect(result.role).toBe(OrganizationMemberRole.GENERAL_MANAGER);
    });

    it('should validate before removing GM role', async () => {
      const mockMember = {
        id: 'm1',
        organizationId: 'org1',
        role: OrganizationMemberRole.GENERAL_MANAGER,
      };

      mockOrganizationRepository.findMemberById.mockResolvedValue(mockMember);
      mockValidationService.validateCanRemoveGeneralManager.mockResolvedValue(
        undefined,
      );
      mockOrganizationRepository.updateMember.mockResolvedValue({
        ...mockMember,
        role: OrganizationMemberRole.MEMBER,
      });

      await service.updateMemberRole(
        'm1',
        OrganizationMemberRole.MEMBER,
        'user1',
      );

      expect(
        mockValidationService.validateCanRemoveGeneralManager,
      ).toHaveBeenCalledWith('org1', 'm1');
    });
  });

  describe('removeMember', () => {
    it('should remove member from organization', async () => {
      const mockMember = {
        id: 'm1',
        organizationId: 'org1',
        role: OrganizationMemberRole.MEMBER,
      };

      mockOrganizationRepository.findMemberById.mockResolvedValue(mockMember);
      mockValidationService.validateCanRemoveGeneralManager.mockResolvedValue(
        undefined,
      );
      mockOrganizationRepository.removeMember.mockResolvedValue({
        ...mockMember,
        status: OrganizationMemberStatus.REMOVED,
      });

      const result = await service.removeMember('m1', 'user1');

      expect(mockOrganizationRepository.removeMember).toHaveBeenCalledWith(
        'm1',
      );
      expect(result.status).toBe(OrganizationMemberStatus.REMOVED);
    });

    it('should validate before removing General Manager', async () => {
      const mockMember = {
        id: 'm1',
        organizationId: 'org1',
        role: OrganizationMemberRole.GENERAL_MANAGER,
      };

      mockOrganizationRepository.findMemberById.mockResolvedValue(mockMember);
      mockValidationService.validateCanRemoveGeneralManager.mockResolvedValue(
        undefined,
      );
      mockOrganizationRepository.removeMember.mockResolvedValue({
        ...mockMember,
        status: OrganizationMemberStatus.REMOVED,
      });

      await service.removeMember('m1', 'user1');

      expect(
        mockValidationService.validateCanRemoveGeneralManager,
      ).toHaveBeenCalledWith('org1', 'm1');
    });

    it('should throw CannotRemoveLastGeneralManagerException when removing last GM', async () => {
      const mockMember = {
        id: 'm1',
        organizationId: 'org1',
        role: OrganizationMemberRole.GENERAL_MANAGER,
      };

      mockOrganizationRepository.findMemberById.mockResolvedValue(mockMember);
      mockValidationService.validateCanRemoveGeneralManager.mockRejectedValue(
        new CannotRemoveLastGeneralManagerException('org1'),
      );

      await expect(service.removeMember('m1', 'user1')).rejects.toThrow(
        CannotRemoveLastGeneralManagerException,
      );
    });
  });

  describe('isGeneralManager', () => {
    it('should return true when user is General Manager', async () => {
      const mockOrganization = { id: 'org1', leagueId: 'league1' };
      const mockGMs = [
        {
          id: 'm1',
          role: OrganizationMemberRole.GENERAL_MANAGER,
          status: OrganizationMemberStatus.ACTIVE,
          player: { user: { id: 'user1' } },
        },
      ];

      mockOrganizationRepository.findById.mockResolvedValue(mockOrganization);
      mockOrganizationRepository.findGeneralManagers.mockResolvedValue(mockGMs);

      const result = await service.isGeneralManager('user1', 'org1');

      expect(result).toBe(true);
    });

    it('should return false when user is not General Manager', async () => {
      const mockOrganization = { id: 'org1', leagueId: 'league1' };
      const mockGMs = [
        {
          id: 'm1',
          role: OrganizationMemberRole.GENERAL_MANAGER,
          status: OrganizationMemberStatus.ACTIVE,
          player: { user: { id: 'user2' } },
        },
      ];

      mockOrganizationRepository.findById.mockResolvedValue(mockOrganization);
      mockOrganizationRepository.findGeneralManagers.mockResolvedValue(mockGMs);

      const result = await service.isGeneralManager('user1', 'org1');

      expect(result).toBe(false);
    });

    it('should return false when organization not found', async () => {
      mockOrganizationRepository.findById.mockResolvedValue(null);

      const result = await service.isGeneralManager('user1', 'org1');

      expect(result).toBe(false);
    });
  });

  describe('updateMember', () => {
    it('should update member status without changing role', async () => {
      const mockMember = {
        id: 'm1',
        organizationId: 'org1',
        role: OrganizationMemberRole.MEMBER,
        status: OrganizationMemberStatus.ACTIVE,
      };
      const updatedMember = {
        ...mockMember,
        status: OrganizationMemberStatus.SUSPENDED,
      };

      mockOrganizationRepository.findMemberById.mockResolvedValue(mockMember);
      mockOrganizationRepository.updateMember.mockResolvedValue(updatedMember);

      const result = await service.updateMember(
        'm1',
        { status: OrganizationMemberStatus.SUSPENDED },
        'user1',
      );

      expect(mockOrganizationRepository.updateMember).toHaveBeenCalledWith(
        'm1',
        {
          status: OrganizationMemberStatus.SUSPENDED,
        },
      );
      expect(result.status).toBe(OrganizationMemberStatus.SUSPENDED);
      // Should not validate GM removal for non-role updates
      expect(
        mockValidationService.validateCanRemoveGeneralManager,
      ).not.toHaveBeenCalled();
    });

    it('should update member notes', async () => {
      const mockMember = {
        id: 'm1',
        organizationId: 'org1',
        role: OrganizationMemberRole.MEMBER,
        notes: 'Old notes',
      };
      const updatedMember = { ...mockMember, notes: 'New notes' };

      mockOrganizationRepository.findMemberById.mockResolvedValue(mockMember);
      mockOrganizationRepository.updateMember.mockResolvedValue(updatedMember);

      const result = await service.updateMember(
        'm1',
        { notes: 'New notes' },
        'user1',
      );

      expect(mockOrganizationRepository.updateMember).toHaveBeenCalledWith(
        'm1',
        { notes: 'New notes' },
      );
      expect(result.notes).toBe('New notes');
    });

    it('should update multiple fields at once', async () => {
      const mockMember = {
        id: 'm1',
        organizationId: 'org1',
        role: OrganizationMemberRole.MEMBER,
        status: OrganizationMemberStatus.ACTIVE,
        notes: 'Old notes',
      };
      const updatedMember = {
        ...mockMember,
        status: OrganizationMemberStatus.INACTIVE,
        notes: 'Updated notes',
      };

      mockOrganizationRepository.findMemberById.mockResolvedValue(mockMember);
      mockOrganizationRepository.updateMember.mockResolvedValue(updatedMember);

      const result = await service.updateMember(
        'm1',
        { status: OrganizationMemberStatus.INACTIVE, notes: 'Updated notes' },
        'user1',
      );

      expect(mockOrganizationRepository.updateMember).toHaveBeenCalledWith(
        'm1',
        {
          status: OrganizationMemberStatus.INACTIVE,
          notes: 'Updated notes',
        },
      );
      expect(result.status).toBe(OrganizationMemberStatus.INACTIVE);
      expect(result.notes).toBe('Updated notes');
    });

    it('should validate GM removal when role is changed from GM to MEMBER', async () => {
      const mockMember = {
        id: 'm1',
        organizationId: 'org1',
        role: OrganizationMemberRole.GENERAL_MANAGER,
      };
      const updatedMember = {
        ...mockMember,
        role: OrganizationMemberRole.MEMBER,
      };

      mockOrganizationRepository.findMemberById.mockResolvedValue(mockMember);
      mockValidationService.validateCanRemoveGeneralManager.mockResolvedValue(
        undefined,
      );
      mockOrganizationRepository.updateMember.mockResolvedValue(updatedMember);

      const result = await service.updateMember(
        'm1',
        { role: OrganizationMemberRole.MEMBER },
        'user1',
      );

      expect(
        mockValidationService.validateCanRemoveGeneralManager,
      ).toHaveBeenCalledWith('org1', 'm1');
      expect(result.role).toBe(OrganizationMemberRole.MEMBER);
    });

    it('should not validate GM removal when role is changed from MEMBER to GM', async () => {
      const mockMember = {
        id: 'm1',
        organizationId: 'org1',
        role: OrganizationMemberRole.MEMBER,
      };
      const updatedMember = {
        ...mockMember,
        role: OrganizationMemberRole.GENERAL_MANAGER,
      };

      mockOrganizationRepository.findMemberById.mockResolvedValue(mockMember);
      mockOrganizationRepository.updateMember.mockResolvedValue(updatedMember);

      const result = await service.updateMember(
        'm1',
        { role: OrganizationMemberRole.GENERAL_MANAGER },
        'user1',
      );

      expect(
        mockValidationService.validateCanRemoveGeneralManager,
      ).not.toHaveBeenCalled();
      expect(result.role).toBe(OrganizationMemberRole.GENERAL_MANAGER);
    });
  });
});
