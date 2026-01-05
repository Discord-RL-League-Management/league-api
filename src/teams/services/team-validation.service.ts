import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import type { ILeagueSettingsProvider } from '../../common/interfaces/league-domain/league-settings-provider.interface';
import type { IOrganizationValidationProvider } from '../../common/interfaces/league-domain/organization-validation-provider.interface';
import {
  ILEAGUE_SETTINGS_PROVIDER,
  IORGANIZATION_VALIDATION_PROVIDER,
} from '../../common/tokens/injection.tokens';

/**
 * TeamValidationService - Single Responsibility: Team organization requirement validation
 */
@Injectable()
export class TeamValidationService {
  private readonly logger = new Logger(TeamValidationService.name);

  constructor(
    @Inject(ILEAGUE_SETTINGS_PROVIDER)
    private leagueSettingsProvider: ILeagueSettingsProvider,
    @Inject(IORGANIZATION_VALIDATION_PROVIDER)
    private organizationValidationProvider: IOrganizationValidationProvider,
  ) {}

  /**
   * Validate organization requirement for team
   */
  async validateOrganizationRequirement(
    leagueId: string,
    organizationId?: string,
  ): Promise<void> {
    const settings = await this.leagueSettingsProvider.getSettings(leagueId);

    if (settings.membership.requireOrganization) {
      if (!organizationId) {
        throw new BadRequestException(
          'Organization is required for teams in this league',
        );
      }
    }
  }

  /**
   * Validate organization exists in league
   */
  async validateOrganizationExists(
    organizationId: string,
    leagueId: string,
  ): Promise<void> {
    const organization =
      await this.organizationValidationProvider.findByIdAndLeague(
        organizationId,
        leagueId,
      );
    if (!organization) {
      throw new NotFoundException(
        `Organization ${organizationId} not found in league ${leagueId}`,
      );
    }
  }

  /**
   * Validate organization capacity
   */
  async validateOrganizationCapacity(
    organizationId: string,
    leagueId: string,
  ): Promise<void> {
    await this.organizationValidationProvider.validateOrganizationCapacity(
      leagueId,
      organizationId,
    );
  }

  /**
   * Validate league organization requirement change
   */
  validateLeagueOrganizationRequirementChange(
    leagueId: string,
    newRequireOrg: boolean,
  ): Promise<void> {
    // This is a warning/pre-check, not a blocker
    // The actual assignment will happen in the settings update hook
    if (newRequireOrg) {
      this.logger.log(
        `League ${leagueId} is changing to require organizations. Teams without organizations will be auto-assigned.`,
      );
    }
    return Promise.resolve();
  }
}
