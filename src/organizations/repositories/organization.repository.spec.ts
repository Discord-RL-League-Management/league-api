/**
 * OrganizationRepository Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { OrganizationRepository } from './organization.repository';
import { PrismaService } from '../../prisma/prisma.service';
import {
  OrganizationMemberRole,
  OrganizationMemberStatus,
} from '@prisma/client';

describe('OrganizationRepository', () => {
  let repository: OrganizationRepository;
  let mockPrismaService: PrismaService;

  const mockOrganization = {
    id: 'org-123',
    leagueId: 'league-123',
    name: 'Test Org',
    tag: 'TST',
    description: 'Test description',
    createdAt: new Date(),
    updatedAt: new Date(),
    members: [],
    teams: [],
  };

  const mockMember = {
    id: 'member-123',
    organizationId: 'org-123',
    playerId: 'player-123',
    leagueId: 'league-123',
    role: OrganizationMemberRole.MEMBER,
    status: OrganizationMemberStatus.ACTIVE,
    joinedAt: new Date(),
  };

  beforeEach(async () => {
    mockPrismaService = {
      organization: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      organizationMember: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        deleteMany: vi.fn(),
        count: vi.fn(),
      },
      team: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      $transaction: vi.fn(),
    } as unknown as PrismaService;

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrganizationRepository,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    repository = moduleRef.get<OrganizationRepository>(OrganizationRepository);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findById', () => {
    it('should_return_organization_when_found', async () => {
      vi.mocked(mockPrismaService.organization.findUnique).mockResolvedValue(
        mockOrganization,
      );

      const result = await repository.findById('org-123');

      expect(result).toEqual(mockOrganization);
      expect(mockPrismaService.organization.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'org-123' } }),
      );
    });

    it('should_return_null_when_not_found', async () => {
      vi.mocked(mockPrismaService.organization.findUnique).mockResolvedValue(
        null,
      );

      const result = await repository.findById('org-999');

      expect(result).toBeNull();
    });
  });

  describe('findByLeagueId', () => {
    it('should_return_organizations_for_league', async () => {
      vi.mocked(mockPrismaService.organization.findMany).mockResolvedValue([
        mockOrganization,
      ]);

      const result = await repository.findByLeagueId('league-123');

      expect(result).toHaveLength(1);
      expect(mockPrismaService.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { leagueId: 'league-123' } }),
      );
    });
  });

  describe('create', () => {
    it('should_create_organization_when_valid_data_provided', async () => {
      const createDto = {
        leagueId: 'league-123',
        name: 'New Org',
        tag: 'NEW',
      };
      vi.mocked(mockPrismaService.organization.create).mockResolvedValue(
        mockOrganization,
      );

      const result = await repository.create(createDto);

      expect(result).toEqual(mockOrganization);
      expect(mockPrismaService.organization.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should_update_organization_when_valid_data_provided', async () => {
      const updateDto = { name: 'Updated Org' };
      vi.mocked(mockPrismaService.organization.update).mockResolvedValue({
        ...mockOrganization,
        name: 'Updated Org',
      });

      const result = await repository.update('org-123', updateDto);

      expect(result.name).toBe('Updated Org');
    });
  });

  describe('exists', () => {
    it('should_return_true_when_organization_exists', async () => {
      vi.mocked(mockPrismaService.organization.count).mockResolvedValue(1);

      const result = await repository.exists('org-123');

      expect(result).toBe(true);
    });

    it('should_return_false_when_organization_not_found', async () => {
      vi.mocked(mockPrismaService.organization.count).mockResolvedValue(0);

      const result = await repository.exists('org-999');

      expect(result).toBe(false);
    });
  });

  describe('findGeneralManagers', () => {
    it('should_return_general_managers_for_organization', async () => {
      const gmMember = {
        ...mockMember,
        role: OrganizationMemberRole.GENERAL_MANAGER,
      };
      vi.mocked(
        mockPrismaService.organizationMember.findMany,
      ).mockResolvedValue([gmMember]);

      const result = await repository.findGeneralManagers('org-123');

      expect(result).toHaveLength(1);
      expect(
        mockPrismaService.organizationMember.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: OrganizationMemberRole.GENERAL_MANAGER,
          }),
        }),
      );
    });
  });

  describe('countGeneralManagers', () => {
    it('should_return_count_of_general_managers', async () => {
      vi.mocked(mockPrismaService.organizationMember.count).mockResolvedValue(
        2,
      );

      const result = await repository.countGeneralManagers('org-123');

      expect(result).toBe(2);
    });
  });

  describe('addMember', () => {
    it('should_add_member_using_transaction', async () => {
      const addMemberDto = {
        playerId: 'player-123',
        organizationId: 'org-123',
        leagueId: 'league-123',
      };
      vi.mocked(mockPrismaService.$transaction).mockImplementation(
        async (callback) => {
          const tx = {
            organizationMember: {
              deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
              create: vi.fn().mockResolvedValue(mockMember),
            },
          };
          return callback(tx as unknown as Parameters<typeof callback>[0]);
        },
      );

      const result = await repository.addMember(addMemberDto);

      expect(result).toEqual(mockMember);
    });
  });

  describe('removeMember', () => {
    it('should_soft_delete_member_by_setting_status', async () => {
      vi.mocked(mockPrismaService.organizationMember.update).mockResolvedValue({
        ...mockMember,
        status: OrganizationMemberStatus.REMOVED,
        leftAt: new Date(),
      });

      const result = await repository.removeMember('member-123');

      expect(result.status).toBe(OrganizationMemberStatus.REMOVED);
    });
  });
});
