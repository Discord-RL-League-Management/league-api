import { Injectable, Logger, Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { SettingsService } from '../infrastructure/settings/services/settings.service';
import { LeagueRepository } from './repositories/league.repository';
import { LeagueSettingsDefaultsService } from './services/league-settings-defaults.service';
import { SettingsValidationService } from './services/settings-validation.service';
import { ConfigMigrationService } from './services/config-migration.service';
import { LeagueConfiguration } from './interfaces/league-settings.interface';
import { LeagueNotFoundException } from './exceptions/league.exceptions';
import { LeagueSettingsDto } from './dto/league-settings.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import type { IOrganizationProvider } from '../common/interfaces/league-domain/organization-provider.interface';
import type { ITeamProvider } from '../common/interfaces/league-domain/team-provider.interface';

/**
 * LeagueSettingsService - League configuration management
 *
 * Handles league settings retrieval, updates, caching, and migration.
 * Provides lazy initialization of settings if they don't exist.
 */
@Injectable()
export class LeagueSettingsService {
  private readonly logger = new Logger(LeagueSettingsService.name);
  private readonly cacheTtl: number;
  private organizationProvider?: IOrganizationProvider;
  private teamProvider?: ITeamProvider;

  constructor(
    private settingsService: SettingsService,
    private leagueRepository: LeagueRepository,
    private settingsDefaults: LeagueSettingsDefaultsService,
    private settingsValidation: SettingsValidationService,
    private configMigration: ConfigMigrationService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private prisma: PrismaService,
    private moduleRef: ModuleRef,
  ) {
    this.cacheTtl = 300; // 5 minutes cache TTL
  }

  private getOrganizationProvider(): IOrganizationProvider {
    if (!this.organizationProvider) {
      this.organizationProvider = this.moduleRef.get<IOrganizationProvider>(
        'IOrganizationProvider',
        { strict: false },
      );
    }
    return this.organizationProvider;
  }

  private getTeamProvider(): ITeamProvider {
    if (!this.teamProvider) {
      this.teamProvider = this.moduleRef.get<ITeamProvider>('ITeamProvider', {
        strict: false,
      });
    }
    return this.teamProvider;
  }

  /**
   * Get league settings with caching and defaults
   *
   * Automatically persists default settings if they don't exist (lazy initialization).
   * Settings creation is independent of user validation.
   */
  async getSettings(leagueId: string): Promise<LeagueConfiguration> {
    try {
      const cacheKey = `league:${leagueId}:settings`;
      const cached = await this.cacheManager.get<LeagueConfiguration>(cacheKey);
      if (cached) {
        this.logger.log(`Settings cache hit for league ${leagueId}`);
        return cached;
      }

      let settings = await this.settingsService.getSettings('league', leagueId);

      if (!settings) {
        const leagueExists = await this.leagueRepository.exists(leagueId);
        if (!leagueExists) {
          throw new LeagueNotFoundException(leagueId);
        }

        const defaultSettings = this.settingsDefaults.getDefaults();
        settings = await this.settingsService.upsertSettings(
          'league',
          leagueId,
          defaultSettings as unknown as Prisma.InputJsonValue,
          1,
          undefined,
        );
        this.logger.warn(
          `Auto-created missing settings for league ${leagueId}. This should not happen if settings were created with league.`,
        );
      }

      let migratedConfig: LeagueConfiguration;
      const rawSettings = settings.settings as unknown;
      if (
        this.configMigration.needsMigration(
          rawSettings as Record<string, unknown>,
        )
      ) {
        this.logger.log(
          `Migrating league ${leagueId} settings from schema version ${this.configMigration.getSchemaVersion(rawSettings as Record<string, unknown>)} to ${1}`,
        );
        migratedConfig = this.configMigration.migrate(
          rawSettings as Record<string, unknown>,
        );

        await this.settingsService.updateSettings(
          'league',
          leagueId,
          migratedConfig as unknown as Prisma.InputJsonValue,
        );
        this.logger.log(
          `Successfully migrated settings for league ${leagueId}`,
        );
      } else {
        migratedConfig = settings.settings as unknown as LeagueConfiguration;
      }

      const normalized = this.settingsDefaults.mergeSettings(
        this.settingsDefaults.getDefaults(),
        migratedConfig,
      );

      await this.cacheManager.set(cacheKey, normalized, this.cacheTtl * 1000);

      return normalized;
    } catch (error) {
      if (error instanceof LeagueNotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to get settings for league ${leagueId}:`,
        error,
      );
      throw new LeagueNotFoundException(leagueId);
    }
  }

  /**
   * Update league settings with validation and caching
   *
   * Validates new settings, merges with existing, and persists.
   * Invalidates cache after update.
   */
  async updateSettings(
    leagueId: string,
    newSettings: Partial<LeagueSettingsDto>,
  ): Promise<LeagueConfiguration> {
    try {
      const leagueExists = await this.leagueRepository.exists(leagueId);
      if (!leagueExists) {
        throw new LeagueNotFoundException(leagueId);
      }

      const currentSettings = await this.getSettings(leagueId);

      const mergedSettings = this.settingsDefaults.mergeSettings(
        currentSettings,
        newSettings as Partial<LeagueConfiguration>,
      );

      this.settingsValidation.validate(mergedSettings);
      const previousRequireOrg = currentSettings.membership.requireOrganization;
      const newRequireOrg = mergedSettings.membership.requireOrganization;

      // If changing to require organizations, perform auto-assignment BEFORE persisting settings
      // This ensures settings are only persisted if auto-assignment succeeds, preventing
      // inconsistent state where requireOrganization=true but teams remain unassigned
      if (!previousRequireOrg && newRequireOrg) {
        // Auto-assign teams to organizations first
        // If this fails, the error will be thrown and settings won't be persisted
        await this.handleRequireOrganizationChange(leagueId, mergedSettings);

        // Only persist settings after successful auto-assignment
        // This ensures requireOrganization=true is only set when all teams are assigned
        await this.settingsService.updateSettings(
          'league',
          leagueId,
          mergedSettings as unknown as Prisma.InputJsonValue,
        );

        const cacheKey = `league:${leagueId}:settings`;
        await this.cacheManager.del(cacheKey);

        this.logger.log(
          `Updated settings for league ${leagueId} and auto-assigned teams`,
        );
        return mergedSettings;
      }

      await this.settingsService.updateSettings(
        'league',
        leagueId,
        mergedSettings as unknown as Prisma.InputJsonValue,
      );

      const cacheKey = `league:${leagueId}:settings`;
      await this.cacheManager.del(cacheKey);

      this.logger.log(`Updated settings for league ${leagueId}`);
      return mergedSettings;
    } catch (error) {
      if (error instanceof LeagueNotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to update settings for league ${leagueId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Handle requireOrganization change: auto-assign teams to organizations
   */
  private async handleRequireOrganizationChange(
    leagueId: string,
    mergedSettings: LeagueConfiguration,
  ): Promise<void> {
    this.logger.log(
      `League ${leagueId} is changing to require organizations. Auto-assigning teams...`,
    );

    const teamsWithoutOrg =
      await this.getTeamProvider().findTeamsWithoutOrganization(leagueId);

    if (teamsWithoutOrg.length === 0) {
      this.logger.log(`No teams need assignment in league ${leagueId}`);
      return;
    }

    const organizations =
      await this.getOrganizationProvider().findByLeagueId(leagueId);

    // If no organizations exist, create a default one
    // Pass merged settings to validate against updated capacity limits
    let defaultOrgId: string;
    let createdDefaultOrg = false;
    if (organizations.length === 0) {
      const defaultOrg = await this.getOrganizationProvider().create(
        {
          leagueId,
          name: 'Unassigned Teams',
          tag: 'UNASSIGNED',
          description: 'Default organization for teams without an organization',
        },
        'system',
        mergedSettings,
      );
      defaultOrgId = defaultOrg.id;
      createdDefaultOrg = true;
      this.logger.log(
        `Created default organization ${defaultOrgId} for league ${leagueId}`,
      );
    } else {
      defaultOrgId = organizations[0].id;
    }

    // Assign all teams to organizations (distribute evenly or assign to default)
    // For simplicity, assign all to default organization
    // In a more sophisticated implementation, you could distribute evenly
    const teamIds = teamsWithoutOrg.map((team) => team.id);

    // Use OrganizationService.assignTeamsToOrganization to validate capacity constraints
    // Pass merged settings to ensure validation uses updated limits before persistence
    // This ensures we don't violate maxTeamsPerOrganization limits with new settings
    try {
      await this.getOrganizationProvider().assignTeamsToOrganization(
        leagueId,
        defaultOrgId,
        teamIds,
        mergedSettings,
      );
      this.logger.log(
        `Auto-assigned ${teamIds.length} teams to organization ${defaultOrgId} in league ${leagueId}`,
      );
    } catch (error) {
      // If assignment fails and we created a default organization, rollback by deleting it
      // This prevents orphaned organizations with no teams and no general managers
      if (createdDefaultOrg) {
        this.logger.warn(
          `Team assignment failed for default organization ${defaultOrgId}. Rolling back organization creation.`,
        );
        try {
          await this.getOrganizationProvider().delete(defaultOrgId, 'system');
          this.logger.log(`Rolled back default organization ${defaultOrgId}`);
        } catch (deleteError) {
          this.logger.error(
            `Failed to rollback default organization ${defaultOrgId} after assignment failure:`,
            deleteError,
          );
        }
      }
      this.logger.warn(
        `Cannot assign all ${teamIds.length} teams to organization ${defaultOrgId} due to capacity limits. ` +
          `Some teams may remain unassigned. Consider creating additional organizations or increasing capacity limits.`,
      );
      throw error;
    }
  }
}
