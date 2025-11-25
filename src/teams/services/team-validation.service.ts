import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { LeagueSettingsService } from '../../leagues/league-settings.service';
import { OrganizationRepository } from '../../organizations/repositories/organization.repository';
import { OrganizationValidationService } from '../../organizations/services/organization-validation.service';

/**
 * TeamValidationService - Single Responsibility: Team organization requirement validation
 */
@Injectable()
export class TeamValidationService {
  private readonly logger = new Logger(TeamValidationService.name);

  constructor(
    private leagueSettingsService: LeagueSettingsService,
    private organizationRepository: OrganizationRepository,
    private organizationValidationService: OrganizationValidationService,
  ) {}

  /**
   * Validate organization requirement for team
   */
  async validateOrganizationRequirement(leagueId: string, organizationId?: string): Promise<void> {
    const settings = await this.leagueSettingsService.getSettings(leagueId);

    if (settings.membership.requireOrganization) {
      if (!organizationId) {
        throw new BadRequestException('Organization is required for teams in this league');
      }
    }
  }

  /**
   * Validate organization exists in league
   */
  async validateOrganizationExists(organizationId: string, leagueId: string): Promise<void> {
    const organization = await this.organizationRepository.findByIdAndLeague(organizationId, leagueId);
    if (!organization) {
      throw new NotFoundException(`Organization ${organizationId} not found in league ${leagueId}`);
    }
  }

  /**
   * Validate organization capacity
   */
  async validateOrganizationCapacity(organizationId: string, leagueId: string): Promise<void> {
    await this.organizationValidationService.validateOrganizationCapacity(leagueId, organizationId);
  }

  /**
   * Validate league organization requirement change
   */
  async validateLeagueOrganizationRequirementChange(leagueId: string, newRequireOrg: boolean): Promise<void> {
    // This is a warning/pre-check, not a blocker
    // The actual assignment will happen in the settings update hook
    if (newRequireOrg) {
      this.logger.log(
        `League ${leagueId} is changing to require organizations. Teams without organizations will be auto-assigned.`,
      );
    }
  }
}

