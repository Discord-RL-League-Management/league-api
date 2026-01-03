import { Injectable } from '@nestjs/common';
import { IOrganizationProvider } from '../../leagues/interfaces/organization-provider.interface';
import { OrganizationService } from '../services/organization.service';
import { Organization } from '@prisma/client';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { LeagueConfiguration } from '../../leagues/interfaces/league-settings.interface';

/**
 * OrganizationProviderAdapter - Adapter implementing IOrganizationProvider
 *
 * Implements the interface using OrganizationService to break circular dependency.
 */
@Injectable()
export class OrganizationProviderAdapter implements IOrganizationProvider {
  constructor(private readonly organizationService: OrganizationService) {}

  async findByLeagueId(leagueId: string): Promise<Organization[]> {
    return this.organizationService.findByLeagueId(leagueId);
  }

  async create(
    createDto: CreateOrganizationDto,
    userId: string,
    settings?: LeagueConfiguration,
  ): Promise<Organization> {
    return this.organizationService.create(createDto, userId, settings);
  }

  async assignTeamsToOrganization(
    leagueId: string,
    organizationId: string,
    teamIds: string[],
    settings?: LeagueConfiguration,
  ): Promise<void> {
    await this.organizationService.assignTeamsToOrganization(
      leagueId,
      organizationId,
      teamIds,
      settings,
    );
  }

  async delete(organizationId: string, userId: string): Promise<void> {
    await this.organizationService.delete(organizationId, userId);
  }
}
