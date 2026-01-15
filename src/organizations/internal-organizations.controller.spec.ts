/**
 * InternalOrganizationsController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { InternalOrganizationsController } from './internal-organizations.controller';
import { OrganizationService } from './organization.service';
import { OrganizationMemberService } from './services/organization-member.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { AddOrganizationMemberDto } from './dto/add-organization-member.dto';
import { UpdateOrganizationMemberDto } from './dto/update-organization-member.dto';
import { OrganizationMemberRole } from '@prisma/client';

describe('InternalOrganizationsController', () => {
  let controller: InternalOrganizationsController;
  let mockOrganizationService: OrganizationService;
  let mockOrganizationMemberService: OrganizationMemberService;

  const mockOrganization = {
    id: 'org_123',
    name: 'Test Organization',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockOrganizationService = {
      findOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as unknown as OrganizationService;

    mockOrganizationMemberService = {
      findMembers: vi.fn(),
      addMember: vi.fn(),
      updateMember: vi.fn(),
      removeMember: vi.fn(),
    } as unknown as OrganizationMemberService;

    const module = await Test.createTestingModule({
      controllers: [InternalOrganizationsController],
      providers: [
        { provide: OrganizationService, useValue: mockOrganizationService },
        {
          provide: OrganizationMemberService,
          useValue: mockOrganizationMemberService,
        },
      ],
    }).compile();

    controller = module.get<InternalOrganizationsController>(
      InternalOrganizationsController,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getOrganization', () => {
    it('should_return_organization_when_exists', async () => {
      vi.spyOn(mockOrganizationService, 'findOne').mockResolvedValue(
        mockOrganization as never,
      );

      const result = await controller.getOrganization('org_123');

      expect(result).toEqual(mockOrganization);
      expect(mockOrganizationService.findOne).toHaveBeenCalledWith('org_123');
    });
  });

  describe('createOrganization', () => {
    it('should_create_organization_when_valid_data_provided', async () => {
      const createDto: CreateOrganizationDto & { userId: string } = {
        name: 'Test Organization',
        userId: 'user_123',
      };
      vi.spyOn(mockOrganizationService, 'create').mockResolvedValue(
        mockOrganization as never,
      );

      const result = await controller.createOrganization(createDto);

      expect(result).toEqual(mockOrganization);
      expect(mockOrganizationService.create).toHaveBeenCalledWith(
        createDto,
        'user_123',
      );
    });
  });

  describe('updateOrganization', () => {
    it('should_update_organization_when_exists', async () => {
      const updateDto: UpdateOrganizationDto = { name: 'Updated Org' };
      vi.spyOn(mockOrganizationService, 'update').mockResolvedValue({
        ...mockOrganization,
        ...updateDto,
      } as never);

      const result = await controller.updateOrganization('org_123', updateDto);

      expect(result.name).toBe('Updated Org');
      expect(mockOrganizationService.update).toHaveBeenCalledWith(
        'org_123',
        updateDto,
        'bot',
      );
    });
  });

  describe('deleteOrganization', () => {
    it('should_delete_organization_when_exists', async () => {
      vi.spyOn(mockOrganizationService, 'delete').mockResolvedValue(
        undefined as never,
      );

      await controller.deleteOrganization('org_123');

      expect(mockOrganizationService.delete).toHaveBeenCalledWith(
        'org_123',
        'bot',
      );
    });
  });

  describe('getOrganizationMembers', () => {
    it('should_return_members_when_organization_exists', async () => {
      const mockMembers = [{ id: 'member_123' }];
      vi.spyOn(mockOrganizationMemberService, 'findMembers').mockResolvedValue(
        mockMembers as never,
      );

      const result = await controller.getOrganizationMembers('org_123');

      expect(result).toEqual(mockMembers);
      expect(mockOrganizationMemberService.findMembers).toHaveBeenCalledWith(
        'org_123',
      );
    });
  });

  describe('addOrganizationMember', () => {
    it('should_add_member_when_valid_data_provided', async () => {
      const addDto: AddOrganizationMemberDto & { userId: string } = {
        playerId: 'player_123',
        role: OrganizationMemberRole.MEMBER,
        userId: 'user_123',
      };
      vi.spyOn(mockOrganizationMemberService, 'addMember').mockResolvedValue({
        id: 'member_123',
      } as never);

      const result = await controller.addOrganizationMember('org_123', addDto);

      expect(result.id).toBe('member_123');
      expect(mockOrganizationMemberService.addMember).toHaveBeenCalledWith(
        'org_123',
        'player_123',
        OrganizationMemberRole.MEMBER,
        'user_123',
      );
    });
  });

  describe('updateOrganizationMember', () => {
    it('should_update_member_when_exists', async () => {
      const updateDto: UpdateOrganizationMemberDto = {
        role: OrganizationMemberRole.ADMIN,
      };
      vi.spyOn(mockOrganizationMemberService, 'updateMember').mockResolvedValue(
        {
          id: 'member_123',
          role: OrganizationMemberRole.ADMIN,
        } as never,
      );

      const result = await controller.updateOrganizationMember(
        'org_123',
        'member_123',
        updateDto,
      );

      expect(result.role).toBe(OrganizationMemberRole.ADMIN);
      expect(mockOrganizationMemberService.updateMember).toHaveBeenCalledWith(
        'member_123',
        updateDto,
        'bot',
      );
    });
  });

  describe('removeOrganizationMember', () => {
    it('should_remove_member_when_exists', async () => {
      vi.spyOn(mockOrganizationMemberService, 'removeMember').mockResolvedValue(
        undefined as never,
      );

      await controller.removeOrganizationMember('org_123', 'member_123');

      expect(mockOrganizationMemberService.removeMember).toHaveBeenCalledWith(
        'member_123',
        'bot',
      );
    });
  });
});
