/**
 * OrganizationProviderAdapter Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { OrganizationProviderAdapter } from './organization-provider.adapter';
import { OrganizationService } from '../organization.service';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { Organization } from '@prisma/client';
import type { LeagueConfiguration } from '../../leagues/interfaces/league-settings.interface';

describe('OrganizationProviderAdapter', () => {
  let adapter: OrganizationProviderAdapter;
  let mockOrganizationService: OrganizationService;

  const mockLeagueId = 'league-123';
  const mockUserId = 'user-123';
  const mockOrganizationId = 'org-123';
  const mockTeamIds = ['team-1', 'team-2'];

  const mockOrganizations: Organization[] = [
    {
      id: mockOrganizationId,
      name: 'Test Organization',
      leagueId: mockLeagueId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockOrganization: Organization = {
    id: mockOrganizationId,
    name: 'Test Organization',
    leagueId: mockLeagueId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCreateDto: CreateOrganizationDto = {
    name: 'Test Organization',
  };

  const mockSettings: LeagueConfiguration = {
    mmrCalculation: {
      formula: 'ones * 0.6 + twos * 0.4',
      enabled: true,
    },
  };

  beforeEach(async () => {
    mockOrganizationService = {
      findByLeagueId: vi.fn(),
      create: vi.fn(),
      assignTeamsToOrganization: vi.fn(),
      delete: vi.fn(),
    } as unknown as OrganizationService;

    const module = await Test.createTestingModule({
      providers: [
        OrganizationProviderAdapter,
        {
          provide: OrganizationService,
          useValue: mockOrganizationService,
        },
      ],
    }).compile();

    adapter = module.get<OrganizationProviderAdapter>(
      OrganizationProviderAdapter,
    );
  });

  describe('findByLeagueId', () => {
    it('should_return_organizations_when_organization_service_returns_organizations', async () => {
      vi.spyOn(mockOrganizationService, 'findByLeagueId').mockResolvedValue(
        mockOrganizations,
      );

      const result = await adapter.findByLeagueId(mockLeagueId);

      expect(result).toEqual(mockOrganizations);
      expect(result.length).toBe(1);
    });

    it('should_return_empty_array_when_no_organizations_found', async () => {
      vi.spyOn(mockOrganizationService, 'findByLeagueId').mockResolvedValue([]);

      const result = await adapter.findByLeagueId(mockLeagueId);

      expect(result).toEqual([]);
    });

    it('should_delegate_to_organization_service', async () => {
      vi.spyOn(mockOrganizationService, 'findByLeagueId').mockResolvedValue(
        mockOrganizations,
      );

      await adapter.findByLeagueId(mockLeagueId);

      expect(mockOrganizationService.findByLeagueId).toHaveBeenCalledWith(
        mockLeagueId,
      );
      expect(mockOrganizationService.findByLeagueId).toHaveBeenCalledTimes(1);
    });
  });

  describe('create', () => {
    it('should_return_organization_when_created', async () => {
      vi.spyOn(mockOrganizationService, 'create').mockResolvedValue(
        mockOrganization,
      );

      const result = await adapter.create(mockCreateDto, mockUserId);

      expect(result).toEqual(mockOrganization);
      expect(result.id).toBe(mockOrganizationId);
    });

    it('should_create_organization_with_settings_when_provided', async () => {
      vi.spyOn(mockOrganizationService, 'create').mockResolvedValue(
        mockOrganization,
      );

      await adapter.create(mockCreateDto, mockUserId, mockSettings);

      expect(mockOrganizationService.create).toHaveBeenCalledWith(
        mockCreateDto,
        mockUserId,
        mockSettings,
      );
    });

    it('should_create_organization_without_settings_when_not_provided', async () => {
      vi.spyOn(mockOrganizationService, 'create').mockResolvedValue(
        mockOrganization,
      );

      await adapter.create(mockCreateDto, mockUserId);

      expect(mockOrganizationService.create).toHaveBeenCalledWith(
        mockCreateDto,
        mockUserId,
        undefined,
      );
    });

    it('should_delegate_to_organization_service', async () => {
      vi.spyOn(mockOrganizationService, 'create').mockResolvedValue(
        mockOrganization,
      );

      await adapter.create(mockCreateDto, mockUserId, mockSettings);

      expect(mockOrganizationService.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('assignTeamsToOrganization', () => {
    it('should_assign_teams_when_called', async () => {
      vi.spyOn(
        mockOrganizationService,
        'assignTeamsToOrganization',
      ).mockResolvedValue(undefined);

      await adapter.assignTeamsToOrganization(
        mockLeagueId,
        mockOrganizationId,
        mockTeamIds,
      );

      expect(
        mockOrganizationService.assignTeamsToOrganization,
      ).toHaveBeenCalledWith(
        mockLeagueId,
        mockOrganizationId,
        mockTeamIds,
        undefined,
      );
    });

    it('should_assign_teams_with_settings_when_provided', async () => {
      vi.spyOn(
        mockOrganizationService,
        'assignTeamsToOrganization',
      ).mockResolvedValue(undefined);

      await adapter.assignTeamsToOrganization(
        mockLeagueId,
        mockOrganizationId,
        mockTeamIds,
        mockSettings,
      );

      expect(
        mockOrganizationService.assignTeamsToOrganization,
      ).toHaveBeenCalledWith(
        mockLeagueId,
        mockOrganizationId,
        mockTeamIds,
        mockSettings,
      );
    });

    it('should_delegate_to_organization_service', async () => {
      vi.spyOn(
        mockOrganizationService,
        'assignTeamsToOrganization',
      ).mockResolvedValue(undefined);

      await adapter.assignTeamsToOrganization(
        mockLeagueId,
        mockOrganizationId,
        mockTeamIds,
        mockSettings,
      );

      expect(
        mockOrganizationService.assignTeamsToOrganization,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('delete', () => {
    it('should_delete_organization_when_called', async () => {
      vi.spyOn(mockOrganizationService, 'delete').mockResolvedValue(undefined);

      await adapter.delete(mockOrganizationId, mockUserId);

      expect(mockOrganizationService.delete).toHaveBeenCalledWith(
        mockOrganizationId,
        mockUserId,
      );
    });

    it('should_delegate_to_organization_service', async () => {
      vi.spyOn(mockOrganizationService, 'delete').mockResolvedValue(undefined);

      await adapter.delete(mockOrganizationId, mockUserId);

      expect(mockOrganizationService.delete).toHaveBeenCalledTimes(1);
    });
  });
});
