/**
 * LeagueSettingsService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest and Suites automatic mocking.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 *
 * Uses Suites (@suites/unit) for automatic dependency mocking.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed, Mocked } from '@suites/unit';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { LeagueNotFoundException } from './exceptions/league.exceptions';
import { LeagueSettingsService } from './league-settings.service';
import { SettingsService } from '../infrastructure/settings/services/settings.service';
import { LeagueRepository } from './repositories/league.repository';
import { LeagueSettingsDefaultsService } from './services/league-settings-defaults.service';
import { SettingsValidationService } from './services/settings-validation.service';
import { ConfigMigrationService } from './services/config-migration.service';
import { PrismaService } from '../prisma/prisma.service';
import type { IOrganizationProvider } from '../common/interfaces/league-domain/organization-provider.interface';
import type { ITeamProvider } from '../common/interfaces/league-domain/team-provider.interface';
import type { Cache } from 'cache-manager';
import { LeagueConfiguration } from './interfaces/league-settings.interface';
import { LeagueSettingsDto } from './dto/league-settings.dto';
import { Settings, Prisma, Organization, Team } from '@prisma/client';

describe('LeagueSettingsService', () => {
  let service: LeagueSettingsService;
  let settingsService: Mocked<SettingsService>;
  let leagueRepository: Mocked<LeagueRepository>;
  let settingsDefaults: Mocked<LeagueSettingsDefaultsService>;
  let settingsValidation: Mocked<SettingsValidationService>;
  let configMigration: Mocked<ConfigMigrationService>;
  let cacheManager: Mocked<Cache>;
  let prisma: Mocked<PrismaService>;
  let organizationProvider: Mocked<IOrganizationProvider>;
  let teamProvider: Mocked<ITeamProvider>;

  const leagueId = 'league-123';
  const mockDefaultSettings: LeagueConfiguration = {
    _metadata: {
      version: '1.0.0',
      schemaVersion: 1,
    },
    membership: {
      joinMethod: 'OPEN',
      requiresApproval: false,
      allowSelfRegistration: true,
      registrationOpen: true,
      autoCloseOnFull: false,
      requireGuildMembership: true,
      requirePlayerStatus: false,
      allowMultipleLeagues: true,
      requireOrganization: false,
      minPlayers: 2,
      maxPlayers: null,
      registrationStartDate: null,
      registrationEndDate: null,
      cooldownAfterLeave: null,
      maxOrganizations: null,
      maxTeamsPerOrganization: null,
    },
    game: {
      gameType: null,
      platform: null,
    },
    skill: {
      isSkillBased: false,
      skillMetric: null,
      minSkillLevel: null,
      maxSkillLevel: null,
      requireTracker: false,
      trackerPlatforms: null,
    },
    visibility: {
      isPublic: true,
      showInDirectory: true,
      allowSpectators: true,
    },
    administration: {
      adminRoles: [],
      allowPlayerReports: true,
      allowSuspensions: true,
      allowBans: true,
    },
  };

  const mockSettingsRecord: Settings = {
    id: 'settings-id-1',
    ownerType: 'league',
    ownerId: leagueId,
    settings: mockDefaultSettings as unknown as Prisma.JsonValue,
    schemaVersion: 1,
    configVersion: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const { unit, unitRef } = await TestBed.solitary(
      LeagueSettingsService,
    ).compile();

    service = unit;
    settingsService = unitRef.get(SettingsService);
    leagueRepository = unitRef.get(LeagueRepository);
    settingsDefaults = unitRef.get(LeagueSettingsDefaultsService);
    settingsValidation = unitRef.get(SettingsValidationService);
    configMigration = unitRef.get(ConfigMigrationService);
    cacheManager = unitRef.get(CACHE_MANAGER);
    prisma = unitRef.get(PrismaService);
    organizationProvider = unitRef.get('IOrganizationProvider' as any);
    teamProvider = unitRef.get('ITeamProvider' as any);

    // Setup default mock implementations
    settingsDefaults.getDefaults = vi.fn().mockReturnValue(mockDefaultSettings);
    settingsDefaults.mergeSettings = vi.fn().mockImplementation(
      (current, newSettings) =>
        ({
          ...current,
          ...newSettings,
        }) as LeagueConfiguration,
    );
    configMigration.needsMigration = vi.fn().mockReturnValue(false);
    configMigration.getSchemaVersion = vi.fn().mockReturnValue(1);
    configMigration.migrate = vi
      .fn()
      .mockImplementation((settings) => settings as LeagueConfiguration);
    settingsValidation.validate = vi.fn().mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getSettings', () => {
    it('should_return_cached_settings_when_cache_hit', async () => {
      const cachedSettings: LeagueConfiguration = {
        ...mockDefaultSettings,
        membership: {
          ...mockDefaultSettings.membership,
          requireOrganization: true,
        },
      };
      cacheManager.get = vi.fn().mockResolvedValue(cachedSettings);

      const result = await service.getSettings(leagueId);

      expect(result).toEqual(cachedSettings);
      expect(cacheManager.get).toHaveBeenCalledWith(
        `league:${leagueId}:settings`,
      );
    });

    it('should_return_settings_from_database_when_cache_miss_and_settings_exist', async () => {
      cacheManager.get = vi.fn().mockResolvedValue(null);
      settingsService.getSettings = vi
        .fn()
        .mockResolvedValue(mockSettingsRecord);
      configMigration.needsMigration = vi.fn().mockReturnValue(false);
      cacheManager.set = vi.fn().mockResolvedValue(undefined);

      const result = await service.getSettings(leagueId);

      expect(result).toBeDefined();
      expect(result.membership).toBeDefined();
      expect(settingsService.getSettings).toHaveBeenCalledWith(
        'league',
        leagueId,
      );
    });

    it('should_auto_create_default_settings_when_settings_do_not_exist', async () => {
      cacheManager.get = vi.fn().mockResolvedValue(null);
      settingsService.getSettings = vi.fn().mockResolvedValue(null);
      leagueRepository.exists = vi.fn().mockResolvedValue(true);
      settingsService.upsertSettings = vi
        .fn()
        .mockResolvedValue(mockSettingsRecord);
      configMigration.needsMigration = vi.fn().mockReturnValue(false);
      cacheManager.set = vi.fn().mockResolvedValue(undefined);

      const result = await service.getSettings(leagueId);

      expect(result).toBeDefined();
      expect(settingsService.upsertSettings).toHaveBeenCalled();
      expect(result.membership.requireOrganization).toBe(false);
    });

    it('should_throw_LeagueNotFoundException_when_league_does_not_exist', async () => {
      cacheManager.get = vi.fn().mockResolvedValue(null);
      settingsService.getSettings = vi.fn().mockResolvedValue(null);
      leagueRepository.exists = vi.fn().mockResolvedValue(false);

      await expect(service.getSettings(leagueId)).rejects.toThrow(
        LeagueNotFoundException,
      );
    });

    it('should_migrate_settings_when_migration_needed', async () => {
      const oldSettings = {
        membership: { requireOrganization: false },
        _metadata: { schemaVersion: 0, version: '0.9.0' },
      };
      const migratedSettings: LeagueConfiguration = {
        ...mockDefaultSettings,
        _metadata: { version: '1.0.0', schemaVersion: 1 },
      };
      const oldSettingsRecord: Settings = {
        ...mockSettingsRecord,
        settings: oldSettings as Prisma.JsonValue,
      };

      cacheManager.get = vi.fn().mockResolvedValue(null);
      settingsService.getSettings = vi
        .fn()
        .mockResolvedValue(oldSettingsRecord);
      configMigration.needsMigration = vi.fn().mockReturnValue(true);
      configMigration.getSchemaVersion = vi.fn().mockReturnValue(0);
      configMigration.migrate = vi.fn().mockReturnValue(migratedSettings);
      settingsService.updateSettings = vi.fn().mockResolvedValue({
        ...mockSettingsRecord,
        settings: migratedSettings as unknown as Prisma.JsonValue,
      });
      cacheManager.set = vi.fn().mockResolvedValue(undefined);

      const result = await service.getSettings(leagueId);

      expect(result).toBeDefined();
      expect(configMigration.migrate).toHaveBeenCalled();
      expect(settingsService.updateSettings).toHaveBeenCalled();
    });

    it('should_throw_LeagueNotFoundException_on_unexpected_error', async () => {
      cacheManager.get = vi.fn().mockRejectedValue(new Error('Cache error'));

      await expect(service.getSettings(leagueId)).rejects.toThrow(
        LeagueNotFoundException,
      );
    });
  });

  describe('updateSettings', () => {
    it('should_update_settings_successfully_when_valid', async () => {
      const updateDto: Partial<LeagueSettingsDto> = {
        membership: {
          maxPlayers: 100,
        },
      };
      const currentSettings: LeagueConfiguration = {
        ...mockDefaultSettings,
        membership: {
          ...mockDefaultSettings.membership,
          maxPlayers: null,
        },
      };
      const mergedSettings: LeagueConfiguration = {
        ...mockDefaultSettings,
        membership: {
          ...mockDefaultSettings.membership,
          maxPlayers: 100,
        },
      };

      leagueRepository.exists = vi.fn().mockResolvedValue(true);
      cacheManager.get = vi
        .fn()
        .mockResolvedValueOnce(null) // First call in updateSettings -> getSettings
        .mockResolvedValueOnce(null); // Second call if needed
      settingsService.getSettings = vi.fn().mockResolvedValue({
        ...mockSettingsRecord,
        settings: currentSettings as unknown as Prisma.JsonValue,
      });
      configMigration.needsMigration = vi.fn().mockReturnValue(false);
      cacheManager.set = vi.fn().mockResolvedValue(undefined);
      settingsDefaults.mergeSettings = vi.fn().mockReturnValue(mergedSettings);
      settingsService.updateSettings = vi.fn().mockResolvedValue({
        ...mockSettingsRecord,
        settings: mergedSettings as unknown as Prisma.JsonValue,
      });
      cacheManager.del = vi.fn().mockResolvedValue(undefined);

      const result = await service.updateSettings(leagueId, updateDto);

      expect(result).toEqual(mergedSettings);
      expect(settingsValidation.validate).toHaveBeenCalledWith(mergedSettings);
      expect(cacheManager.del).toHaveBeenCalledWith(
        `league:${leagueId}:settings`,
      );
    });

    it('should_throw_LeagueNotFoundException_when_league_does_not_exist', async () => {
      const updateDto: Partial<LeagueSettingsDto> = {
        membership: { requireOrganization: true },
      };
      leagueRepository.exists = vi.fn().mockResolvedValue(false);

      await expect(service.updateSettings(leagueId, updateDto)).rejects.toThrow(
        LeagueNotFoundException,
      );
    });

    it('should_validate_settings_before_updating', async () => {
      const updateDto: Partial<LeagueSettingsDto> = {
        membership: { requireOrganization: true },
      };
      const mergedSettings: LeagueConfiguration = {
        ...mockDefaultSettings,
        membership: {
          ...mockDefaultSettings.membership,
          requireOrganization: true,
        },
      };
      const validationError = new Error('Validation failed');

      leagueRepository.exists = vi.fn().mockResolvedValue(true);
      cacheManager.get = vi.fn().mockResolvedValue(null);
      settingsService.getSettings = vi
        .fn()
        .mockResolvedValue(mockSettingsRecord);
      configMigration.needsMigration = vi.fn().mockReturnValue(false);
      cacheManager.set = vi.fn().mockResolvedValue(undefined);
      settingsDefaults.mergeSettings = vi.fn().mockReturnValue(mergedSettings);
      settingsValidation.validate = vi.fn().mockImplementation(() => {
        throw validationError;
      });

      await expect(service.updateSettings(leagueId, updateDto)).rejects.toThrow(
        validationError,
      );
    });

    it('should_invalidate_cache_after_successful_update', async () => {
      const updateDto: Partial<LeagueSettingsDto> = {
        membership: { maxPlayers: 100 },
      };
      const currentSettings: LeagueConfiguration = {
        ...mockDefaultSettings,
        membership: {
          ...mockDefaultSettings.membership,
          maxPlayers: null,
        },
      };
      const mergedSettings: LeagueConfiguration = {
        ...mockDefaultSettings,
        membership: {
          ...mockDefaultSettings.membership,
          maxPlayers: 100,
        },
      };

      leagueRepository.exists = vi.fn().mockResolvedValue(true);
      cacheManager.get = vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      settingsService.getSettings = vi.fn().mockResolvedValue({
        ...mockSettingsRecord,
        settings: currentSettings as unknown as Prisma.JsonValue,
      });
      configMigration.needsMigration = vi.fn().mockReturnValue(false);
      cacheManager.set = vi.fn().mockResolvedValue(undefined);
      settingsDefaults.mergeSettings = vi.fn().mockReturnValue(mergedSettings);
      settingsService.updateSettings = vi.fn().mockResolvedValue({
        ...mockSettingsRecord,
        settings: mergedSettings as unknown as Prisma.JsonValue,
      });
      cacheManager.del = vi.fn().mockResolvedValue(undefined);

      await service.updateSettings(leagueId, updateDto);

      expect(cacheManager.del).toHaveBeenCalledWith(
        `league:${leagueId}:settings`,
      );
    });

    it('should_auto_assign_teams_when_changing_to_require_organization', async () => {
      const updateDto: Partial<LeagueSettingsDto> = {
        membership: { requireOrganization: true },
      };
      const currentSettings: LeagueConfiguration = {
        ...mockDefaultSettings,
        membership: {
          ...mockDefaultSettings.membership,
          requireOrganization: false, // Current state is false
        },
      };
      const mergedSettings: LeagueConfiguration = {
        ...mockDefaultSettings,
        membership: {
          ...mockDefaultSettings.membership,
          requireOrganization: true, // Changing to true
        },
      };
      const mockTeam: Team = {
        id: 'team-1',
        leagueId,
        organizationId: null,
        name: 'Test Team',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockOrg: Organization = {
        id: 'org-1',
        leagueId,
        name: 'Test Org',
        tag: 'TEST',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      leagueRepository.exists = vi.fn().mockResolvedValue(true);
      cacheManager.get = vi
        .fn()
        .mockResolvedValueOnce(null) // First call in updateSettings -> getSettings
        .mockResolvedValueOnce(null); // Second call if needed
      settingsService.getSettings = vi.fn().mockResolvedValue({
        ...mockSettingsRecord,
        settings: currentSettings as unknown as Prisma.JsonValue,
      });
      configMigration.needsMigration = vi.fn().mockReturnValue(false);
      cacheManager.set = vi.fn().mockResolvedValue(undefined);
      // mergeSettings is called twice: once in getSettings normalization, once in updateSettings
      settingsDefaults.mergeSettings = vi
        .fn()
        .mockReturnValueOnce(currentSettings) // First call in getSettings normalization
        .mockReturnValue(mergedSettings); // Second call in updateSettings
      teamProvider.findTeamsWithoutOrganization = vi
        .fn()
        .mockResolvedValue([mockTeam]);
      organizationProvider.findByLeagueId = vi
        .fn()
        .mockResolvedValue([mockOrg]);
      organizationProvider.assignTeamsToOrganization = vi
        .fn()
        .mockResolvedValue(undefined);
      settingsService.updateSettings = vi.fn().mockResolvedValue({
        ...mockSettingsRecord,
        settings: mergedSettings as unknown as Prisma.JsonValue,
      });
      cacheManager.del = vi.fn().mockResolvedValue(undefined);

      const result = await service.updateSettings(leagueId, updateDto);

      expect(result).toEqual(mergedSettings);
      expect(
        organizationProvider.assignTeamsToOrganization,
      ).toHaveBeenCalledWith(
        leagueId,
        mockOrg.id,
        [mockTeam.id],
        mergedSettings,
      );
    });

    it('should_skip_auto_assignment_when_no_teams_need_assignment', async () => {
      const updateDto: Partial<LeagueSettingsDto> = {
        membership: { requireOrganization: true },
      };
      const currentSettings: LeagueConfiguration = {
        ...mockDefaultSettings,
        membership: {
          ...mockDefaultSettings.membership,
          requireOrganization: false,
        },
      };
      const mergedSettings: LeagueConfiguration = {
        ...mockDefaultSettings,
        membership: {
          ...mockDefaultSettings.membership,
          requireOrganization: true,
        },
      };

      leagueRepository.exists = vi.fn().mockResolvedValue(true);
      cacheManager.get = vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      settingsService.getSettings = vi.fn().mockResolvedValue({
        ...mockSettingsRecord,
        settings: currentSettings as unknown as Prisma.JsonValue,
      });
      configMigration.needsMigration = vi.fn().mockReturnValue(false);
      cacheManager.set = vi.fn().mockResolvedValue(undefined);
      settingsDefaults.mergeSettings = vi.fn().mockReturnValue(mergedSettings);
      teamProvider.findTeamsWithoutOrganization = vi.fn().mockResolvedValue([]);
      settingsService.updateSettings = vi.fn().mockResolvedValue({
        ...mockSettingsRecord,
        settings: mergedSettings as unknown as Prisma.JsonValue,
      });
      cacheManager.del = vi.fn().mockResolvedValue(undefined);

      const result = await service.updateSettings(leagueId, updateDto);

      expect(result).toEqual(mergedSettings);
      expect(
        organizationProvider.assignTeamsToOrganization,
      ).not.toHaveBeenCalled();
    });

    it('should_create_default_organization_when_none_exist_and_require_org_enabled', async () => {
      const updateDto: Partial<LeagueSettingsDto> = {
        membership: { requireOrganization: true },
      };
      const currentSettings: LeagueConfiguration = {
        ...mockDefaultSettings,
        membership: {
          ...mockDefaultSettings.membership,
          requireOrganization: false,
        },
      };
      const mergedSettings: LeagueConfiguration = {
        ...mockDefaultSettings,
        membership: {
          ...mockDefaultSettings.membership,
          requireOrganization: true,
        },
      };
      const mockTeam: Team = {
        id: 'team-1',
        leagueId,
        organizationId: null,
        name: 'Test Team',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockOrg: Organization = {
        id: 'org-1',
        leagueId,
        name: 'Unassigned Teams',
        tag: 'UNASSIGNED',
        description: 'Default organization for teams without an organization',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      leagueRepository.exists = vi.fn().mockResolvedValue(true);
      cacheManager.get = vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      settingsService.getSettings = vi.fn().mockResolvedValue({
        ...mockSettingsRecord,
        settings: currentSettings as unknown as Prisma.JsonValue,
      });
      configMigration.needsMigration = vi.fn().mockReturnValue(false);
      cacheManager.set = vi.fn().mockResolvedValue(undefined);
      // mergeSettings is called twice: once in getSettings normalization, once in updateSettings
      settingsDefaults.mergeSettings = vi
        .fn()
        .mockReturnValueOnce(currentSettings) // First call in getSettings normalization
        .mockReturnValue(mergedSettings); // Second call in updateSettings
      teamProvider.findTeamsWithoutOrganization = vi
        .fn()
        .mockResolvedValue([mockTeam]);
      organizationProvider.findByLeagueId = vi.fn().mockResolvedValue([]);
      organizationProvider.create = vi.fn().mockResolvedValue(mockOrg);
      organizationProvider.assignTeamsToOrganization = vi
        .fn()
        .mockResolvedValue(undefined);
      settingsService.updateSettings = vi.fn().mockResolvedValue({
        ...mockSettingsRecord,
        settings: mergedSettings as unknown as Prisma.JsonValue,
      });
      cacheManager.del = vi.fn().mockResolvedValue(undefined);

      const result = await service.updateSettings(leagueId, updateDto);

      expect(result).toEqual(mergedSettings);
      expect(organizationProvider.create).toHaveBeenCalledWith(
        expect.objectContaining({
          leagueId,
          name: 'Unassigned Teams',
          tag: 'UNASSIGNED',
        }),
        'system',
        mergedSettings,
      );
    });

    it('should_use_existing_organization_when_organizations_exist', async () => {
      const updateDto: Partial<LeagueSettingsDto> = {
        membership: { requireOrganization: true },
      };
      const currentSettings: LeagueConfiguration = {
        ...mockDefaultSettings,
        membership: {
          ...mockDefaultSettings.membership,
          requireOrganization: false,
        },
      };
      const mergedSettings: LeagueConfiguration = {
        ...mockDefaultSettings,
        membership: {
          ...mockDefaultSettings.membership,
          requireOrganization: true,
        },
      };
      const mockTeam: Team = {
        id: 'team-1',
        leagueId,
        organizationId: null,
        name: 'Test Team',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockOrg: Organization = {
        id: 'org-1',
        leagueId,
        name: 'Existing Org',
        tag: 'EXIST',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      leagueRepository.exists = vi.fn().mockResolvedValue(true);
      cacheManager.get = vi
        .fn()
        .mockResolvedValueOnce(null) // First call in updateSettings -> getSettings
        .mockResolvedValueOnce(null); // Second call if needed
      settingsService.getSettings = vi.fn().mockResolvedValue({
        ...mockSettingsRecord,
        settings: currentSettings as unknown as Prisma.JsonValue,
      });
      configMigration.needsMigration = vi.fn().mockReturnValue(false);
      cacheManager.set = vi.fn().mockResolvedValue(undefined);
      // mergeSettings is called twice: once in getSettings normalization, once in updateSettings
      settingsDefaults.mergeSettings = vi
        .fn()
        .mockReturnValueOnce(currentSettings) // First call in getSettings normalization
        .mockReturnValue(mergedSettings); // Second call in updateSettings
      teamProvider.findTeamsWithoutOrganization = vi
        .fn()
        .mockResolvedValue([mockTeam]);
      organizationProvider.findByLeagueId = vi
        .fn()
        .mockResolvedValue([mockOrg]);
      organizationProvider.assignTeamsToOrganization = vi
        .fn()
        .mockResolvedValue(undefined);
      settingsService.updateSettings = vi.fn().mockResolvedValue({
        ...mockSettingsRecord,
        settings: mergedSettings as unknown as Prisma.JsonValue,
      });
      cacheManager.del = vi.fn().mockResolvedValue(undefined);

      const result = await service.updateSettings(leagueId, updateDto);

      expect(result).toEqual(mergedSettings);
      expect(organizationProvider.create).not.toHaveBeenCalled();
      expect(
        organizationProvider.assignTeamsToOrganization,
      ).toHaveBeenCalledWith(
        leagueId,
        mockOrg.id,
        [mockTeam.id],
        mergedSettings,
      );
    });

    it('should_rollback_organization_creation_when_team_assignment_fails', async () => {
      const updateDto: Partial<LeagueSettingsDto> = {
        membership: { requireOrganization: true },
      };
      const currentSettings: LeagueConfiguration = {
        ...mockDefaultSettings,
        membership: {
          ...mockDefaultSettings.membership,
          requireOrganization: false,
        },
      };
      const mergedSettings: LeagueConfiguration = {
        ...mockDefaultSettings,
        membership: {
          ...mockDefaultSettings.membership,
          requireOrganization: true,
        },
      };
      const mockTeam: Team = {
        id: 'team-1',
        leagueId,
        organizationId: null,
        name: 'Test Team',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockOrg: Organization = {
        id: 'org-1',
        leagueId,
        name: 'Unassigned Teams',
        tag: 'UNASSIGNED',
        description: 'Default organization for teams without an organization',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const assignmentError = new Error('Capacity exceeded');

      leagueRepository.exists = vi.fn().mockResolvedValue(true);
      cacheManager.get = vi
        .fn()
        .mockResolvedValueOnce(null) // First call in updateSettings -> getSettings
        .mockResolvedValueOnce(null); // Second call if needed
      settingsService.getSettings = vi.fn().mockResolvedValue({
        ...mockSettingsRecord,
        settings: currentSettings as unknown as Prisma.JsonValue,
      });
      configMigration.needsMigration = vi.fn().mockReturnValue(false);
      cacheManager.set = vi.fn().mockResolvedValue(undefined);
      // mergeSettings is called twice: once in getSettings normalization, once in updateSettings
      settingsDefaults.mergeSettings = vi
        .fn()
        .mockReturnValueOnce(currentSettings) // First call in getSettings normalization
        .mockReturnValue(mergedSettings); // Second call in updateSettings
      teamProvider.findTeamsWithoutOrganization = vi
        .fn()
        .mockResolvedValue([mockTeam]);
      organizationProvider.findByLeagueId = vi.fn().mockResolvedValue([]);
      organizationProvider.create = vi.fn().mockResolvedValue(mockOrg);
      organizationProvider.assignTeamsToOrganization = vi
        .fn()
        .mockRejectedValue(assignmentError);
      organizationProvider.delete = vi.fn().mockResolvedValue(undefined);

      await expect(service.updateSettings(leagueId, updateDto)).rejects.toThrow(
        assignmentError,
      );

      expect(organizationProvider.delete).toHaveBeenCalledWith(
        mockOrg.id,
        'system',
      );
    });

    it('should_not_persist_settings_when_auto_assignment_fails', async () => {
      const updateDto: Partial<LeagueSettingsDto> = {
        membership: { requireOrganization: true },
      };
      const currentSettings: LeagueConfiguration = {
        ...mockDefaultSettings,
        membership: {
          ...mockDefaultSettings.membership,
          requireOrganization: false,
        },
      };
      const mergedSettings: LeagueConfiguration = {
        ...mockDefaultSettings,
        membership: {
          ...mockDefaultSettings.membership,
          requireOrganization: true,
        },
      };
      const mockTeam: Team = {
        id: 'team-1',
        leagueId,
        organizationId: null,
        name: 'Test Team',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const assignmentError = new Error('Capacity exceeded');

      leagueRepository.exists = vi.fn().mockResolvedValue(true);
      cacheManager.get = vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      settingsService.getSettings = vi.fn().mockResolvedValue({
        ...mockSettingsRecord,
        settings: currentSettings as unknown as Prisma.JsonValue,
      });
      configMigration.needsMigration = vi.fn().mockReturnValue(false);
      cacheManager.set = vi.fn().mockResolvedValue(undefined);
      // mergeSettings is called twice: once in getSettings normalization, once in updateSettings
      settingsDefaults.mergeSettings = vi
        .fn()
        .mockReturnValueOnce(currentSettings) // First call in getSettings normalization
        .mockReturnValue(mergedSettings); // Second call in updateSettings
      teamProvider.findTeamsWithoutOrganization = vi
        .fn()
        .mockResolvedValue([mockTeam]);
      organizationProvider.findByLeagueId = vi.fn().mockResolvedValue([]);
      organizationProvider.create = vi.fn().mockResolvedValue({
        id: 'org-1',
        leagueId,
        name: 'Unassigned Teams',
        tag: 'UNASSIGNED',
        description: 'Default organization for teams without an organization',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      organizationProvider.assignTeamsToOrganization = vi
        .fn()
        .mockRejectedValue(assignmentError);
      organizationProvider.delete = vi.fn().mockResolvedValue(undefined);

      await expect(service.updateSettings(leagueId, updateDto)).rejects.toThrow(
        assignmentError,
      );

      expect(settingsService.updateSettings).not.toHaveBeenCalled();
    });
  });
});
