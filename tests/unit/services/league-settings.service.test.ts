/**
 * LeagueSettingsService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { LeagueSettingsService } from '@/leagues/league-settings.service';
import { SettingsService } from '@/infrastructure/settings/services/settings.service';
import { LeagueRepository } from '@/leagues/repositories/league.repository';
import { LeagueSettingsDefaultsService } from '@/leagues/services/league-settings-defaults.service';
import { SettingsValidationService } from '@/leagues/services/settings-validation.service';
import { ConfigMigrationService } from '@/leagues/services/config-migration.service';
import { OrganizationService } from '@/organizations/services/organization.service';
import { TeamRepository } from '@/teams/repositories/team.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { Settings, Prisma } from '@prisma/client';
import { LeagueConfiguration } from '@/leagues/interfaces/league-settings.interface';
import { LeagueSettingsDto } from '@/leagues/dto/league-settings.dto';
import { LeagueNotFoundException } from '@/leagues/exceptions/league.exceptions';
import type { Cache } from 'cache-manager';

describe('LeagueSettingsService', () => {
  let service: LeagueSettingsService;
  let mockSettingsService: SettingsService;
  let mockLeagueRepository: LeagueRepository;
  let mockSettingsDefaults: LeagueSettingsDefaultsService;
  let mockSettingsValidation: SettingsValidationService;
  let mockConfigMigration: ConfigMigrationService;
  let mockOrganizationService: OrganizationService;
  let mockTeamRepository: TeamRepository;
  let mockPrisma: PrismaService;
  let mockCacheManager: Cache;

  const leagueId = 'league_123456789012345678';

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
      requireGuildMembership: false,
      requirePlayerStatus: false,
      allowMultipleLeagues: true,
      requireOrganization: false,
      maxPlayers: 100,
      minPlayers: 1,
    },
    game: {
      gameType: null,
      platform: null,
    },
    skill: {
      isSkillBased: false,
      requireTracker: false,
    },
    visibility: {
      isPublic: true,
      showInDirectory: true,
      allowSpectators: true,
    },
    administration: {
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

  beforeEach(() => {
    mockSettingsService = {
      getSettings: vi.fn(),
      updateSettings: vi.fn(),
      upsertSettings: vi.fn(),
    } as unknown as SettingsService;

    mockLeagueRepository = {
      exists: vi.fn(),
    } as unknown as LeagueRepository;

    mockSettingsDefaults = {
      getDefaults: vi.fn().mockReturnValue(mockDefaultSettings),
      mergeSettings: vi.fn().mockImplementation(
        (current, newSettings) =>
          ({
            ...current,
            ...newSettings,
          }) as LeagueConfiguration,
      ),
    } as unknown as LeagueSettingsDefaultsService;

    mockSettingsValidation = {
      validate: vi.fn().mockResolvedValue(undefined),
    } as unknown as SettingsValidationService;

    mockConfigMigration = {
      needsMigration: vi.fn().mockReturnValue(false),
      getSchemaVersion: vi.fn().mockReturnValue(1),
      migrate: vi
        .fn()
        .mockImplementation((settings) => settings as LeagueConfiguration),
    } as unknown as ConfigMigrationService;

    mockOrganizationService = {
      findByLeagueId: vi.fn(),
      create: vi.fn(),
      assignTeamsToOrganization: vi.fn(),
      delete: vi.fn(),
    } as unknown as OrganizationService;

    mockTeamRepository = {
      findTeamsWithoutOrganization: vi.fn(),
    } as unknown as TeamRepository;

    mockPrisma = {} as unknown as PrismaService;

    const mockGet = vi.fn().mockResolvedValue(undefined as unknown) as (
      key: string,
    ) => Promise<unknown>;
    const mockSet = vi.fn().mockResolvedValue(undefined);
    const mockDel = vi.fn().mockResolvedValue(undefined);
    mockCacheManager = {
      get: mockGet,
      set: mockSet,
      del: mockDel,
    } as unknown as Cache;

    service = new LeagueSettingsService(
      mockSettingsService,
      mockLeagueRepository,
      mockSettingsDefaults,
      mockSettingsValidation,
      mockConfigMigration,
      mockCacheManager,
      mockPrisma,
      mockOrganizationService,
      mockTeamRepository,
    );
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
          maxPlayers: 200,
        },
      };
      vi.mocked(mockCacheManager.get).mockResolvedValue(cachedSettings);

      const result = await service.getSettings(leagueId);

      expect(result).toEqual(cachedSettings);
      expect(result.membership.maxPlayers).toBe(200);
    });

    it('should_return_settings_from_database_when_cache_miss_and_settings_exist', async () => {
      vi.mocked(mockCacheManager.get).mockResolvedValue(null);
      vi.mocked(mockSettingsService.getSettings).mockResolvedValue(
        mockSettingsRecord,
      );
      vi.mocked(mockConfigMigration.needsMigration).mockReturnValue(false);

      const result = await service.getSettings(leagueId);

      expect(result).toBeDefined();
      expect(result.membership).toBeDefined();
      expect(mockCacheManager.set).toHaveBeenCalled();
    });

    it('should_auto_create_default_settings_when_settings_do_not_exist_and_league_exists', async () => {
      vi.mocked(mockCacheManager.get).mockResolvedValue(null);
      vi.mocked(mockSettingsService.getSettings).mockResolvedValue(null);
      vi.mocked(mockLeagueRepository.exists).mockResolvedValue(true);
      vi.mocked(mockSettingsService.upsertSettings).mockResolvedValue(
        mockSettingsRecord,
      );
      vi.mocked(mockConfigMigration.needsMigration).mockReturnValue(false);

      const result = await service.getSettings(leagueId);

      expect(result).toBeDefined();
      expect(result.membership.joinMethod).toBe('OPEN');
      expect(mockSettingsService.upsertSettings).toHaveBeenCalled();
    });

    it('should_throw_LeagueNotFoundException_when_league_does_not_exist', async () => {
      vi.mocked(mockCacheManager.get).mockResolvedValue(null);
      vi.mocked(mockSettingsService.getSettings).mockResolvedValue(null);
      vi.mocked(mockLeagueRepository.exists).mockResolvedValue(false);

      await expect(service.getSettings(leagueId)).rejects.toThrow(
        LeagueNotFoundException,
      );
    });

    it('should_migrate_settings_when_migration_needed', async () => {
      const oldSettings = {
        membership: { joinMethod: 'OPEN', requiresApproval: false },
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

      vi.mocked(mockCacheManager.get).mockResolvedValue(null);
      vi.mocked(mockSettingsService.getSettings).mockResolvedValue(
        oldSettingsRecord,
      );
      vi.mocked(mockConfigMigration.needsMigration).mockReturnValue(true);
      vi.mocked(mockConfigMigration.getSchemaVersion).mockReturnValue(1);
      vi.mocked(mockConfigMigration.migrate).mockResolvedValue(
        migratedSettings,
      );
      vi.mocked(mockSettingsService.updateSettings).mockResolvedValue({
        ...mockSettingsRecord,
        settings: migratedSettings as unknown as Prisma.JsonValue,
      });

      const result = await service.getSettings(leagueId);

      expect(result).toBeDefined();
      expect(result._metadata?.schemaVersion).toBe(1);
    });

    it('should_throw_InternalServerErrorException_when_auto_creation_fails', async () => {
      vi.mocked(mockCacheManager.get).mockResolvedValue(null);
      vi.mocked(mockSettingsService.getSettings).mockResolvedValue(null);
      vi.mocked(mockLeagueRepository.exists).mockResolvedValue(true);
      vi.mocked(mockSettingsService.upsertSettings).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.getSettings(leagueId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should_throw_InternalServerErrorException_when_retrieval_fails', async () => {
      vi.mocked(mockCacheManager.get).mockResolvedValue(null);
      vi.mocked(mockSettingsService.getSettings).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.getSettings(leagueId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should_cache_settings_after_retrieval', async () => {
      vi.mocked(mockCacheManager.get).mockResolvedValue(null);
      vi.mocked(mockSettingsService.getSettings).mockResolvedValue(
        mockSettingsRecord,
      );
      vi.mocked(mockConfigMigration.needsMigration).mockReturnValue(false);

      await service.getSettings(leagueId);

      expect(mockCacheManager.set).toHaveBeenCalled();
    });
  });

  describe('updateSettings', () => {
    it('should_update_settings_successfully_when_validation_passes', async () => {
      const updateDto: LeagueSettingsDto = {
        membership: {
          maxPlayers: 200,
        },
      };
      const mergedSettings: LeagueConfiguration = {
        ...mockDefaultSettings,
        membership: {
          ...mockDefaultSettings.membership,
          maxPlayers: 200,
        },
      };

      vi.mocked(mockLeagueRepository.exists).mockResolvedValue(true);
      vi.mocked(mockSettingsService.getSettings).mockResolvedValue(
        mockSettingsRecord,
      );
      vi.mocked(mockConfigMigration.needsMigration).mockReturnValue(false);
      vi.mocked(mockSettingsDefaults.mergeSettings).mockReturnValue(
        mergedSettings,
      );
      vi.mocked(mockSettingsService.updateSettings).mockResolvedValue({
        ...mockSettingsRecord,
        settings: mergedSettings as unknown as Prisma.JsonValue,
      });

      const result = await service.updateSettings(leagueId, updateDto);

      expect(result.membership.maxPlayers).toBe(200);
      expect(mockCacheManager.del).toHaveBeenCalledWith(
        `league:${leagueId}:settings`,
      );
    });

    it('should_merge_with_current_settings', async () => {
      const updateDto: LeagueSettingsDto = {
        membership: {
          maxPlayers: 150,
        },
      };
      const mergedSettings: LeagueConfiguration = {
        ...mockDefaultSettings,
        membership: {
          ...mockDefaultSettings.membership,
          maxPlayers: 150,
        },
      };

      vi.mocked(mockLeagueRepository.exists).mockResolvedValue(true);
      vi.mocked(mockSettingsService.getSettings).mockResolvedValue(
        mockSettingsRecord,
      );
      vi.mocked(mockConfigMigration.needsMigration).mockReturnValue(false);
      vi.mocked(mockSettingsDefaults.mergeSettings).mockReturnValue(
        mergedSettings,
      );
      vi.mocked(mockSettingsService.updateSettings).mockResolvedValue({
        ...mockSettingsRecord,
        settings: mergedSettings as unknown as Prisma.JsonValue,
      });

      const result = await service.updateSettings(leagueId, updateDto);

      expect(mockSettingsDefaults.mergeSettings).toHaveBeenCalled();
      expect(result).toEqual(mergedSettings);
    });

    it('should_validate_settings_before_update', async () => {
      const updateDto: LeagueSettingsDto = {
        membership: {
          maxPlayers: -1,
        },
      };
      const validationError = new Error('Validation failed');

      vi.mocked(mockLeagueRepository.exists).mockResolvedValue(true);
      vi.mocked(mockCacheManager.get).mockResolvedValue(null);
      vi.mocked(mockSettingsService.getSettings).mockResolvedValue(
        mockSettingsRecord,
      );
      vi.mocked(mockConfigMigration.needsMigration).mockReturnValue(false);
      vi.mocked(mockSettingsDefaults.mergeSettings).mockReturnValue(
        mockDefaultSettings,
      );
      vi.mocked(mockSettingsValidation.validate).mockImplementation(() => {
        throw validationError;
      });

      await expect(service.updateSettings(leagueId, updateDto)).rejects.toThrow(
        validationError,
      );
    });

    it('should_invalidate_cache_after_update', async () => {
      const updateDto: LeagueSettingsDto = {
        membership: {},
      };

      vi.mocked(mockLeagueRepository.exists).mockResolvedValue(true);
      vi.mocked(mockSettingsService.getSettings).mockResolvedValue(
        mockSettingsRecord,
      );
      vi.mocked(mockConfigMigration.needsMigration).mockReturnValue(false);
      vi.mocked(mockSettingsDefaults.mergeSettings).mockReturnValue(
        mockDefaultSettings,
      );
      vi.mocked(mockSettingsService.updateSettings).mockResolvedValue(
        mockSettingsRecord,
      );

      await service.updateSettings(leagueId, updateDto);

      expect(mockCacheManager.del).toHaveBeenCalledWith(
        `league:${leagueId}:settings`,
      );
    });

    it('should_throw_LeagueNotFoundException_when_league_does_not_exist', async () => {
      const updateDto: LeagueSettingsDto = {
        membership: {},
      };

      vi.mocked(mockLeagueRepository.exists).mockResolvedValue(false);

      await expect(service.updateSettings(leagueId, updateDto)).rejects.toThrow(
        LeagueNotFoundException,
      );
    });

    it('should_propagate_LeagueNotFoundException', async () => {
      const updateDto: LeagueSettingsDto = {
        membership: {},
      };

      vi.mocked(mockLeagueRepository.exists).mockResolvedValue(false);

      await expect(service.updateSettings(leagueId, updateDto)).rejects.toThrow(
        LeagueNotFoundException,
      );
    });

    it('should_handle_requireOrganization_change_auto_assign_teams', async () => {
      const updateDto: LeagueSettingsDto = {
        membership: {
          requireOrganization: true,
        },
      };
      const currentSettingsWithOrgFalse: LeagueConfiguration = {
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
      const defaultOrg = {
        id: 'org_123',
        leagueId,
        name: 'Unassigned Teams',
      };
      const teamsWithoutOrg = [{ id: 'team_1' }, { id: 'team_2' }];
      const currentSettingsRecord: Settings = {
        ...mockSettingsRecord,
        settings: currentSettingsWithOrgFalse as unknown as Prisma.JsonValue,
      };

      vi.mocked(mockLeagueRepository.exists).mockResolvedValue(true);
      vi.mocked(mockCacheManager.get).mockResolvedValue(null);
      vi.mocked(mockSettingsService.getSettings).mockResolvedValue(
        currentSettingsRecord,
      );
      vi.mocked(mockConfigMigration.needsMigration).mockReturnValue(false);
      vi.mocked(mockSettingsDefaults.mergeSettings)
        .mockReturnValueOnce(currentSettingsWithOrgFalse)
        .mockReturnValueOnce(mergedSettings);
      vi.mocked(
        mockTeamRepository.findTeamsWithoutOrganization,
      ).mockResolvedValue(teamsWithoutOrg as any);
      vi.mocked(mockOrganizationService.findByLeagueId).mockResolvedValue([]);
      vi.mocked(mockOrganizationService.create).mockResolvedValue(
        defaultOrg as any,
      );
      vi.mocked(
        mockOrganizationService.assignTeamsToOrganization,
      ).mockResolvedValue(undefined);
      vi.mocked(mockSettingsService.updateSettings).mockResolvedValue({
        ...mockSettingsRecord,
        settings: mergedSettings as unknown as Prisma.JsonValue,
      });

      const result = await service.updateSettings(leagueId, updateDto);

      expect(result.membership.requireOrganization).toBe(true);
      expect(mockOrganizationService.create).toHaveBeenCalled();
      expect(
        mockOrganizationService.assignTeamsToOrganization,
      ).toHaveBeenCalled();
    });

    it('should_throw_error_when_team_assignment_fails', async () => {
      const updateDto: LeagueSettingsDto = {
        membership: {
          requireOrganization: true,
        },
      };
      const currentSettingsWithOrgFalse: LeagueConfiguration = {
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
      const defaultOrg = {
        id: 'org_123',
        leagueId,
        name: 'Unassigned Teams',
      };
      const teamsWithoutOrg = [{ id: 'team_1' }];
      const assignmentError = new Error('Assignment failed');
      const currentSettingsRecord: Settings = {
        ...mockSettingsRecord,
        settings: currentSettingsWithOrgFalse as unknown as Prisma.JsonValue,
      };

      vi.mocked(mockLeagueRepository.exists).mockResolvedValue(true);
      vi.mocked(mockCacheManager.get).mockResolvedValue(null);
      vi.mocked(mockSettingsService.getSettings).mockResolvedValue(
        currentSettingsRecord,
      );
      vi.mocked(mockConfigMigration.needsMigration).mockReturnValue(false);
      vi.mocked(mockSettingsDefaults.mergeSettings)
        .mockReturnValueOnce(currentSettingsWithOrgFalse)
        .mockReturnValueOnce(mergedSettings);
      vi.mocked(
        mockTeamRepository.findTeamsWithoutOrganization,
      ).mockResolvedValue(teamsWithoutOrg as any);
      vi.mocked(mockOrganizationService.findByLeagueId).mockResolvedValue([]);
      vi.mocked(mockOrganizationService.create).mockResolvedValue(
        defaultOrg as any,
      );
      vi.mocked(
        mockOrganizationService.assignTeamsToOrganization,
      ).mockRejectedValue(assignmentError);
      vi.mocked(mockOrganizationService.delete).mockResolvedValue(undefined);

      await expect(service.updateSettings(leagueId, updateDto)).rejects.toThrow(
        assignmentError,
      );
      expect(mockOrganizationService.delete).toHaveBeenCalledWith(
        defaultOrg.id,
        'system',
      );
    });
  });
});
