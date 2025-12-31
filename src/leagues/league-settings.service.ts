import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { SettingsService } from '../infrastructure/settings/services/settings.service';
import { ICachingService } from '../infrastructure/caching/interfaces/caching.interface';
import { ILoggingService } from '../infrastructure/logging/interfaces/logging.interface';
import { LeagueRepository } from './repositories/league.repository';
import { LeagueSettingsDefaultsService } from './services/league-settings-defaults.service';
import { SettingsValidationService } from './services/settings-validation.service';
import { ConfigMigrationService } from './services/config-migration.service';
import { LeagueConfiguration } from './interfaces/league-settings.interface';
import { LeagueNotFoundException } from './exceptions/league.exceptions';
import { LeagueSettingsDto } from './dto/league-settings.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { OrganizationService } from '../organizations/services/organization.service';
import { TeamRepository } from '../teams/repositories/team.repository';

/**
 * LeagueSettingsService - Single Responsibility: League configuration management
 *
 * Handles league settings retrieval, updates, caching, and migration.
 * Provides lazy initialization of settings if they don't exist.
 */
@Injectable()
export class LeagueSettingsService {
  private readonly serviceName = LeagueSettingsService.name;
  private readonly cacheTtl: number;

  constructor(
    private settingsService: SettingsService,
    private leagueRepository: LeagueRepository,
    private settingsDefaults: LeagueSettingsDefaultsService,
    private settingsValidation: SettingsValidationService,
    private configMigration: ConfigMigrationService,
    @Inject(ICachingService) private cachingService: ICachingService,
    private prisma: PrismaService,
    @Inject(forwardRef(() => OrganizationService))
    private organizationService: OrganizationService,
    @Inject(forwardRef(() => TeamRepository))
    private teamRepository: TeamRepository,
    @Inject(ILoggingService)
    private readonly loggingService: ILoggingService,
  ) {
    this.cacheTtl = 300; // 5 minutes cache TTL
  }

  /**
   * Get league settings with caching and defaults
   * Single Responsibility: Settings retrieval with caching and lazy initialization
   *
   * Automatically persists default settings if they don't exist (lazy initialization).
   * Settings creation is independent of user validation - they exist regardless of who accesses them.
   * If settings don't exist, that's a bug - auto-create them immediately.
   * If creation fails, that's a system error - throw it.
   */
  async getSettings(leagueId: string): Promise<LeagueConfiguration> {
    try {
      const cacheKey = `league:${leagueId}:settings`;
      const cached =
        await this.cachingService.get<LeagueConfiguration>(cacheKey);
      if (cached) {
        this.loggingService.log(
          `Settings cache hit for league ${leagueId}`,
          this.serviceName,
        );
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
          1, // schemaVersion
          undefined, // configVersion
        );
        this.loggingService.warn(
          `Auto-created missing settings for league ${leagueId}. This should not happen if settings were created with league.`,
          this.serviceName,
        );
      }

      let migratedConfig: LeagueConfiguration;
      const rawSettings = settings.settings as unknown;
      if (
        this.configMigration.needsMigration(
          rawSettings as Record<string, unknown>,
        )
      ) {
        this.loggingService.log(
          `Migrating league ${leagueId} settings from schema version ${this.configMigration.getSchemaVersion(rawSettings as Record<string, unknown>)} to ${1}`,
          this.serviceName,
        );
        migratedConfig = this.configMigration.migrate(
          rawSettings as Record<string, unknown>,
        );

        await this.settingsService.updateSettings(
          'league',
          leagueId,
          migratedConfig as unknown as Prisma.InputJsonValue,
        );
        this.loggingService.log(
          `Successfully migrated settings for league ${leagueId}`,
          this.serviceName,
        );
      } else {
        migratedConfig = settings.settings as unknown as LeagueConfiguration;
      }

      const normalized = this.settingsDefaults.mergeSettings(
        this.settingsDefaults.getDefaults(),
        migratedConfig,
      );

      await this.cachingService.set(cacheKey, normalized, this.cacheTtl * 1000);

      return normalized;
    } catch (error) {
      if (error instanceof LeagueNotFoundException) {
        throw error;
      }
      this.loggingService.error(
        `Failed to get settings for league ${leagueId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      throw new NotFoundException('League', leagueId);
    }
  }

  /**
   * Update league settings with validation and caching
   * Single Responsibility: Settings update with validation
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

        // Invalidate cache after successful update
        const cacheKey = `league:${leagueId}:settings`;
        await this.cachingService.del(cacheKey);

        this.loggingService.log(
          `Updated settings for league ${leagueId} and auto-assigned teams`,
          this.serviceName,
        );
        return mergedSettings;
      }

      await this.settingsService.updateSettings(
        'league',
        leagueId,
        mergedSettings as unknown as Prisma.InputJsonValue,
      );

      const cacheKey = `league:${leagueId}:settings`;
      await this.cachingService.del(cacheKey);

      this.loggingService.log(
        `Updated settings for league ${leagueId}`,
        this.serviceName,
      );
      return mergedSettings;
    } catch (error) {
      if (error instanceof LeagueNotFoundException) {
        throw error;
      }
      this.loggingService.error(
        `Failed to update settings for league ${leagueId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      throw error;
    }
  }

  /**
   * Handle requireOrganization change: auto-assign teams to organizations
   * Single Responsibility: Automatic team assignment when league requires organizations
   */
  private async handleRequireOrganizationChange(
    leagueId: string,
    mergedSettings: LeagueConfiguration,
  ): Promise<void> {
    this.loggingService.log(
      `League ${leagueId} is changing to require organizations. Auto-assigning teams...`,
      this.serviceName,
    );

    const teamsWithoutOrg =
      await this.teamRepository.findTeamsWithoutOrganization(leagueId);

    if (teamsWithoutOrg.length === 0) {
      this.loggingService.log(
        `No teams need assignment in league ${leagueId}`,
        this.serviceName,
      );
      return;
    }

    const organizations =
      await this.organizationService.findByLeagueId(leagueId);

    // If no organizations exist, create a default one
    // Pass merged settings to validate against updated capacity limits
    let defaultOrgId: string;
    let createdDefaultOrg = false;
    if (organizations.length === 0) {
      const defaultOrg = await this.organizationService.create(
        {
          leagueId,
          name: 'Unassigned Teams',
          tag: 'UNASSIGNED',
          description: 'Default organization for teams without an organization',
        },
        'system', // System user ID for auto-creation
        mergedSettings, // Pass merged settings for validation
      );
      defaultOrgId = defaultOrg.id;
      createdDefaultOrg = true;
      this.loggingService.log(
        `Created default organization ${defaultOrgId} for league ${leagueId}`,
        this.serviceName,
      );
    } else {
      defaultOrgId = organizations[0].id;
    }

    const teamIds = teamsWithoutOrg.map((team) => team.id);

    // Use OrganizationService.assignTeamsToOrganization to validate capacity constraints
    // Pass merged settings to ensure validation uses updated limits before persistence
    // This ensures we don't violate maxTeamsPerOrganization limits with new settings
    try {
      await this.organizationService.assignTeamsToOrganization(
        leagueId,
        defaultOrgId,
        teamIds,
        mergedSettings,
      );
      this.loggingService.log(
        `Auto-assigned ${teamIds.length} teams to organization ${defaultOrgId} in league ${leagueId}`,
        this.serviceName,
      );
    } catch (error) {
      // If assignment fails and we created a default organization, rollback by deleting it
      // This prevents orphaned organizations with no teams and no general managers
      if (createdDefaultOrg) {
        this.loggingService.warn(
          `Team assignment failed for default organization ${defaultOrgId}. Rolling back organization creation.`,
          this.serviceName,
        );
        try {
          await this.organizationService.delete(defaultOrgId, 'system');
          this.loggingService.log(
            `Rolled back default organization ${defaultOrgId}`,
            this.serviceName,
          );
        } catch (deleteError) {
          this.loggingService.error(
            `Failed to rollback default organization ${defaultOrgId} after assignment failure: ${deleteError instanceof Error ? deleteError.message : String(deleteError)}`,
            deleteError instanceof Error ? deleteError.stack : undefined,
            this.serviceName,
          );
          // Continue to throw original error
        }
      }
      this.loggingService.warn(
        `Cannot assign all ${teamIds.length} teams to organization ${defaultOrgId} due to capacity limits. ` +
          `Some teams may remain unassigned. Consider creating additional organizations or increasing capacity limits.`,
        this.serviceName,
      );
      throw error; // Re-throw to prevent silent failures
    }
  }
}
