import {
  Injectable,
  Logger,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
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
  private readonly logger = new Logger(LeagueSettingsService.name);
  private readonly cacheTtl: number;

  constructor(
    private settingsService: SettingsService,
    private leagueRepository: LeagueRepository,
    private settingsDefaults: LeagueSettingsDefaultsService,
    private settingsValidation: SettingsValidationService,
    private configMigration: ConfigMigrationService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private prisma: PrismaService,
    @Inject(forwardRef(() => OrganizationService))
    private organizationService: OrganizationService,
    @Inject(forwardRef(() => TeamRepository))
    private teamRepository: TeamRepository,
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
      const cached = await this.cacheManager.get<LeagueConfiguration>(cacheKey);
      if (cached) {
        this.logger.log(`Settings cache hit for league ${leagueId}`);
        return cached;
      }

      let settings = await this.settingsService.getSettings('league', leagueId);

      // If settings don't exist, ensure league exists first, then auto-create and persist settings
      if (!settings) {
        // Verify league exists (defense-in-depth)
        const leagueExists = await this.leagueRepository.exists(leagueId);
        if (!leagueExists) {
          throw new LeagueNotFoundException(leagueId);
        }

        // Auto-create and persist default settings using existing upsert method
        const defaultSettings = this.settingsDefaults.getDefaults();
        settings = await this.settingsService.upsertSettings(
          'league',
          leagueId,
          defaultSettings as Record<string, any>,
          1, // schemaVersion
          undefined, // configVersion
        );
        this.logger.warn(
          `Auto-created missing settings for league ${leagueId}. This should not happen if settings were created with league.`,
        );
      }

      // Migrate config to current schema version if needed
      let migratedConfig: LeagueConfiguration;
      if (this.configMigration.needsMigration(settings.settings as any)) {
        this.logger.log(
          `Migrating league ${leagueId} settings from schema version ${this.configMigration.getSchemaVersion(settings.settings as any)} to ${1}`,
        );
        migratedConfig = this.configMigration.migrate(settings.settings as any);

        // Persist migrated config
        await this.settingsService.updateSettings(
          'league',
          leagueId,
          migratedConfig as Record<string, any>,
        );
        this.logger.log(
          `Successfully migrated settings for league ${leagueId}`,
        );
      } else {
        migratedConfig = settings.settings as unknown as LeagueConfiguration;
      }

      // Ensure config structure is normalized (merge with defaults to ensure all fields exist)
      const normalized = this.settingsDefaults.mergeSettings(
        this.settingsDefaults.getDefaults(),
        migratedConfig,
      );

      // Cache the result
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
      // Verify league exists
      const leagueExists = await this.leagueRepository.exists(leagueId);
      if (!leagueExists) {
        throw new LeagueNotFoundException(leagueId);
      }

      // Get current settings
      const currentSettings = await this.getSettings(leagueId);

      // Merge new settings with current settings
      const mergedSettings = this.settingsDefaults.mergeSettings(
        currentSettings,
        newSettings as Partial<LeagueConfiguration>,
      );

      // Validate merged settings
      this.settingsValidation.validate(mergedSettings);

      // Handle requireOrganization change: auto-assign teams to organizations
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
          mergedSettings as Record<string, any>,
        );

        // Invalidate cache after successful update
        const cacheKey = `league:${leagueId}:settings`;
        await this.cacheManager.del(cacheKey);

        this.logger.log(
          `Updated settings for league ${leagueId} and auto-assigned teams`,
        );
        return mergedSettings;
      }

      // For non-requireOrganization changes, just update settings normally
      await this.settingsService.updateSettings(
        'league',
        leagueId,
        mergedSettings as Record<string, any>,
      );

      // Invalidate cache
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
   * Single Responsibility: Automatic team assignment when league requires organizations
   */
  private async handleRequireOrganizationChange(
    leagueId: string,
    mergedSettings: LeagueConfiguration,
  ): Promise<void> {
    this.logger.log(
      `League ${leagueId} is changing to require organizations. Auto-assigning teams...`,
    );

    // Find all teams without organizations
    const teamsWithoutOrg =
      await this.teamRepository.findTeamsWithoutOrganization(leagueId);

    if (teamsWithoutOrg.length === 0) {
      this.logger.log(`No teams need assignment in league ${leagueId}`);
      return;
    }

    // Get or create organizations in league
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
      this.logger.log(
        `Created default organization ${defaultOrgId} for league ${leagueId}`,
      );
    } else {
      // Use first organization as default
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
      await this.organizationService.assignTeamsToOrganization(
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
          await this.organizationService.delete(defaultOrgId, 'system');
          this.logger.log(`Rolled back default organization ${defaultOrgId}`);
        } catch (deleteError) {
          this.logger.error(
            `Failed to rollback default organization ${defaultOrgId} after assignment failure:`,
            deleteError,
          );
          // Continue to throw original error
        }
      }
      // If capacity is exceeded, log warning
      this.logger.warn(
        `Cannot assign all ${teamIds.length} teams to organization ${defaultOrgId} due to capacity limits. ` +
          `Some teams may remain unassigned. Consider creating additional organizations or increasing capacity limits.`,
      );
      throw error; // Re-throw to prevent silent failures
    }
  }
}
