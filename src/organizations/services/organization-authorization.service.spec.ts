/**
 * OrganizationAuthorizationService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { OrganizationAuthorizationService } from './organization-authorization.service';
import { OrganizationRepository } from '../repositories/organization.repository';
import { Organization } from '@prisma/client';

describe('OrganizationAuthorizationService', () => {
  let service: OrganizationAuthorizationService;
  let mockOrganizationRepository: OrganizationRepository;

  const userId = 'user-123';
  const organizationId = 'org-123';

  const mockOrganization: Organization = {
    id: organizationId,
    leagueId: 'league-123',
    name: 'Test Organization',
    tag: 'TEST',
    description: 'Test description',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    vi.restoreAllMocks();

    mockOrganizationRepository = {
      findById: vi.fn(),
      findGeneralManagers: vi.fn(),
      countGeneralManagers: vi.fn(),
    } as unknown as OrganizationRepository;

    const module = await Test.createTestingModule({
      providers: [
        OrganizationAuthorizationService,
        {
          provide: OrganizationRepository,
          useValue: mockOrganizationRepository,
        },
      ],
    }).compile();

    service = module.get<OrganizationAuthorizationService>(
      OrganizationAuthorizationService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isGeneralManager', () => {
    it('should_return_true_when_user_is_general_manager', async () => {
      const mockGms = [
        {
          id: 'member-123',
          organizationId: organizationId,
          playerId: 'player-123',
          role: 'GENERAL_MANAGER' as const,
          player: {
            id: 'player-123',
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
      expect(mockOrganizationRepository.findById).toHaveBeenCalledWith(
        organizationId,
      );
      expect(
        mockOrganizationRepository.findGeneralManagers,
      ).toHaveBeenCalledWith(organizationId);
    });

    it('should_return_false_when_user_is_not_general_manager', async () => {
      const mockGms = [
        {
          id: 'member-456',
          organizationId: organizationId,
          playerId: 'player-456',
          role: 'GENERAL_MANAGER' as const,
          player: {
            id: 'player-456',
            guildMember: {
              user: {
                id: 'user-456',
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
      expect(
        mockOrganizationRepository.findGeneralManagers,
      ).not.toHaveBeenCalled();
    });

    it('should_return_false_when_no_general_managers_exist', async () => {
      vi.mocked(mockOrganizationRepository.findById).mockResolvedValue(
        mockOrganization,
      );
      vi.mocked(
        mockOrganizationRepository.findGeneralManagers,
      ).mockResolvedValue([] as never);

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

    it('should_return_false_when_count_is_negative', async () => {
      vi.mocked(
        mockOrganizationRepository.countGeneralManagers,
      ).mockResolvedValue(-1);

      const result = await service.hasGeneralManagers(organizationId);

      expect(result).toBe(false);
    });
  });
});
