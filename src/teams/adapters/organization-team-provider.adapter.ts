import { Injectable } from '@nestjs/common';
import { IOrganizationTeamProvider } from '../../common/interfaces/league-domain/organization-team-provider.interface';
import { TeamRepository } from '../repositories/team.repository';
import { Team } from '@prisma/client';

/**
 * OrganizationTeamProviderAdapter - Adapter implementing IOrganizationTeamProvider
 *
 * Implements the interface using TeamRepository to break circular dependency
 * between OrganizationsModule and TeamsModule.
 */
@Injectable()
export class OrganizationTeamProviderAdapter
  implements IOrganizationTeamProvider
{
  constructor(private readonly teamRepository: TeamRepository) {}

  async findById(teamId: string): Promise<Team | null> {
    return this.teamRepository.findById(teamId);
  }

  async update(
    teamId: string,
    data: { organizationId: string | null },
  ): Promise<Team> {
    // Repository now handles null values explicitly
    return this.teamRepository.update(teamId, {
      organizationId: data.organizationId as string | undefined | null,
    } as Parameters<typeof this.teamRepository.update>[1]);
  }
}
