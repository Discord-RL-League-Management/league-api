/**
 * TeamValidationService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TeamValidationService } from '@/teams/services/team-validation.service';
import { LeagueSettingsService } from '@/leagues/league-settings.service';
import { OrganizationRepository } from '@/organizations/repositories/organization.repository';
import { OrganizationValidationService } from '@/organizations/services/organization-validation.service';

describe('TeamValidationService', () => {
  let service: TeamValidationService;
  let mockLeagueSettingsService: LeagueSettingsService;
  let mockOrganizationRepository: OrganizationRepository;
  let mockOrganizationValidationService: OrganizationValidationService;

  beforeEach(() => {
    mockLeagueSettingsService = {
      getSettings: vi.fn(),
    } as unknown as LeagueSettingsService;

    mockOrganizationRepository = {
      findByIdAndLeague: vi.fn(),
    } as unknown as OrganizationRepository;

    mockOrganizationValidationService = {
      validateOrganizationCapacity: vi.fn(),
    } as unknown as OrganizationValidationService;

    service = new TeamValidationService(
      mockLeagueSettingsService,
      mockOrganizationRepository,
      mockOrganizationValidationService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateOrganizationRequirement', () => {
    it('should_pass_when_organization_not_required', async () => {
      const leagueId = 'league123';
      const settings = {
        membership: {
          requireOrganization: false,
        },
      };

      vi.mocked(mockLeagueSettingsService.getSettings).mockResolvedValue(
        settings as any,
      );

      await service.validateOrganizationRequirement(leagueId);

      expect(mockLeagueSettingsService.getSettings).toHaveBeenCalledWith(
        leagueId,
      );
    });

    it('should_pass_when_organization_required_and_provided', async () => {
      const leagueId = 'league123';
      const organizationId = 'org123';
      const settings = {
        membership: {
          requireOrganization: true,
        },
      };

      vi.mocked(mockLeagueSettingsService.getSettings).mockResolvedValue(
        settings as any,
      );

      await service.validateOrganizationRequirement(leagueId, organizationId);

      expect(mockLeagueSettingsService.getSettings).toHaveBeenCalledWith(
        leagueId,
      );
    });

    it('should_throw_BadRequestException_when_organization_required_but_not_provided', async () => {
      const leagueId = 'league123';
      const settings = {
        membership: {
          requireOrganization: true,
        },
      };

      vi.mocked(mockLeagueSettingsService.getSettings).mockResolvedValue(
        settings as any,
      );

      await expect(
        service.validateOrganizationRequirement(leagueId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.validateOrganizationRequirement(leagueId),
      ).rejects.toThrow('Organization is required for teams in this league');
    });
  });

  describe('validateOrganizationExists', () => {
    it('should_pass_when_organization_exists_in_league', async () => {
      const organizationId = 'org123';
      const leagueId = 'league123';
      const organization = { id: organizationId, leagueId };

      vi.mocked(mockOrganizationRepository.findByIdAndLeague).mockResolvedValue(
        organization as any,
      );

      await service.validateOrganizationExists(organizationId, leagueId);

      expect(mockOrganizationRepository.findByIdAndLeague).toHaveBeenCalledWith(
        organizationId,
        leagueId,
      );
    });

    it('should_throw_NotFoundException_when_organization_not_found', async () => {
      const organizationId = 'org123';
      const leagueId = 'league123';

      vi.mocked(mockOrganizationRepository.findByIdAndLeague).mockResolvedValue(
        null,
      );

      await expect(
        service.validateOrganizationExists(organizationId, leagueId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.validateOrganizationExists(organizationId, leagueId),
      ).rejects.toThrow(
        `Organization ${organizationId} not found in league ${leagueId}`,
      );
    });
  });

  describe('validateOrganizationCapacity', () => {
    it('should_pass_when_organization_capacity_is_valid', async () => {
      const organizationId = 'org123';
      const leagueId = 'league123';

      vi.mocked(
        mockOrganizationValidationService.validateOrganizationCapacity,
      ).mockResolvedValue(undefined);

      await service.validateOrganizationCapacity(organizationId, leagueId);

      expect(
        mockOrganizationValidationService.validateOrganizationCapacity,
      ).toHaveBeenCalledWith(leagueId, organizationId);
    });
  });
});
