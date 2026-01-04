import { Injectable } from '@nestjs/common';
import { IOrganizationValidationProvider } from '../../common/interfaces/league-domain/organization-validation-provider.interface';
import { OrganizationRepository } from '../repositories/organization.repository';
import { OrganizationValidationService } from '../services/organization-validation.service';
import { Organization } from '@prisma/client';

/**
 * OrganizationValidationProviderAdapter - Adapter implementing IOrganizationValidationProvider
 *
 * Implements the interface using OrganizationRepository and OrganizationValidationService
 * to break circular dependency between TeamsModule and OrganizationsModule.
 */
@Injectable()
export class OrganizationValidationProviderAdapter
  implements IOrganizationValidationProvider
{
  constructor(
    private readonly organizationRepository: OrganizationRepository,
    private readonly organizationValidationService: OrganizationValidationService,
  ) {}

  async findByIdAndLeague(
    organizationId: string,
    leagueId: string,
  ): Promise<Organization | null> {
    return this.organizationRepository.findByIdAndLeague(
      organizationId,
      leagueId,
    );
  }

  async validateOrganizationCapacity(
    leagueId: string,
    organizationId: string,
  ): Promise<void> {
    await this.organizationValidationService.validateOrganizationCapacity(
      leagueId,
      organizationId,
    );
  }
}
