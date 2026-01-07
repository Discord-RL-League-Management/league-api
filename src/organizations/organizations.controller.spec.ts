/**
 * OrganizationsController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { OrganizationsController } from './organizations.controller';
import { OrganizationService } from './organization.service';
import { OrganizationMemberService } from './services/organization-member.service';
import { OrganizationGmGuard } from './guards/organization-gm.guard';
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

  beforeEach(async () => {
    mockOrganizationService = {
      findByLeagueId: vi.fn(),
      findOne: vi.fn(),
      findTeams: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    } as unknown as OrganizationService;

    mockOrganizationMemberService = {
      addMember: vi.fn(),
      updateMember: vi.fn(),
      removeMember: vi.fn(),
    } as unknown as OrganizationMemberService;

    const module = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [
        { provide: OrganizationService, useValue: mockOrganizationService },
        {
          provide: OrganizationMemberService,
          useValue: mockOrganizationMemberService,
        },
      ],
    })
      .overrideGuard(OrganizationGmGuard)
      .useValue({
        canActivate: vi.fn().mockReturnValue(true),
      } as unknown as OrganizationGmGuard)
      .compile();

    controller = module.get<OrganizationsController>(OrganizationsController);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getOrganizations', () => {
    it('should_return_organizations_when_league_id_provided', async () => {
      const mockOrgs = [{ id: 'org-1', name: 'Test Org' }];
      vi.mocked(mockOrganizationService.findByLeagueId).mockResolvedValue(
        mockOrgs as never,
      );

      const result = await controller.getOrganizations('league-1');

      expect(result).toEqual(mockOrgs);
      expect(mockOrganizationService.findByLeagueId).toHaveBeenCalledWith(
        'league-1',
      );
    });
  });

  describe('getOrganization', () => {
    it('should_return_organization_when_id_provided', async () => {
      const mockOrg = { id: 'org-1', name: 'Test Org' };
      vi.mocked(mockOrganizationService.findOne).mockResolvedValue(
        mockOrg as never,
      );

      const result = await controller.getOrganization('org-1');

      expect(result).toEqual(mockOrg);
      expect(mockOrganizationService.findOne).toHaveBeenCalledWith('org-1');
    });
  });

  describe('getOrganizationTeams', () => {
    it('should_return_teams_when_organization_id_provided', async () => {
      const mockTeams = [{ id: 'team-1', name: 'Test Team' }];
      vi.mocked(mockOrganizationService.findTeams).mockResolvedValue(
        mockTeams as never,
      );

      const result = await controller.getOrganizationTeams('org-1');

      expect(result).toEqual(mockTeams);
      expect(mockOrganizationService.findTeams).toHaveBeenCalledWith('org-1');
    });
  });
});
