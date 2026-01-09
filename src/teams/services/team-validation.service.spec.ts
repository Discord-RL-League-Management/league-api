/**
 * TeamValidationService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { TeamValidationService } from './team-validation.service';
import type { ILeagueSettingsProvider } from '@/common/interfaces/league-domain/league-settings-provider.interface';
import type { IOrganizationValidationProvider } from '@/common/interfaces/league-domain/organization-validation-provider.interface';
import {
  ILEAGUE_SETTINGS_PROVIDER,
  IORGANIZATION_VALIDATION_PROVIDER,
} from '@/common/tokens/injection.tokens';

describe('TeamValidationService', () => {
  let service: TeamValidationService;
  let mockLeagueSettingsProvider: ILeagueSettingsProvider;
  let mockOrganizationValidationProvider: IOrganizationValidationProvider;
  let mockModuleRef: ModuleRef;

  beforeEach(() => {
    mockLeagueSettingsProvider = {
      getSettings: vi.fn(),
    } as unknown as ILeagueSettingsProvider;

    mockOrganizationValidationProvider = {
      findByIdAndLeague: vi.fn(),
      validateOrganizationCapacity: vi.fn(),
    } as unknown as IOrganizationValidationProvider;

    mockModuleRef = {
      get: vi.fn().mockImplementation((token) => {
        if (token === ILEAGUE_SETTINGS_PROVIDER) {
          return mockLeagueSettingsProvider;
        }
        return null;
      }),
    } as unknown as ModuleRef;

    service = new TeamValidationService(
      mockOrganizationValidationProvider,
      mockModuleRef,
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

      vi.mocked(mockLeagueSettingsProvider.getSettings).mockResolvedValue(
        settings as any,
      );

      await service.validateOrganizationRequirement(leagueId);

      expect(mockLeagueSettingsProvider.getSettings).toHaveBeenCalledWith(
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

      vi.mocked(mockLeagueSettingsProvider.getSettings).mockResolvedValue(
        settings as any,
      );

      await service.validateOrganizationRequirement(leagueId, organizationId);

      expect(mockLeagueSettingsProvider.getSettings).toHaveBeenCalledWith(
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

      vi.mocked(mockLeagueSettingsProvider.getSettings).mockResolvedValue(
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

      vi.mocked(
        mockOrganizationValidationProvider.findByIdAndLeague,
      ).mockResolvedValue(organization as any);

      await service.validateOrganizationExists(organizationId, leagueId);

      expect(
        mockOrganizationValidationProvider.findByIdAndLeague,
      ).toHaveBeenCalledWith(organizationId, leagueId);
    });

    it('should_throw_NotFoundException_when_organization_not_found', async () => {
      const organizationId = 'org123';
      const leagueId = 'league123';

      vi.mocked(
        mockOrganizationValidationProvider.findByIdAndLeague,
      ).mockResolvedValue(null);

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
        mockOrganizationValidationProvider.validateOrganizationCapacity,
      ).mockResolvedValue(undefined);

      await service.validateOrganizationCapacity(organizationId, leagueId);

      expect(
        mockOrganizationValidationProvider.validateOrganizationCapacity,
      ).toHaveBeenCalledWith(leagueId, organizationId);
    });
  });
});
