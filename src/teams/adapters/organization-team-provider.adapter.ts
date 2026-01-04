import { Injectable } from '@nestjs/common';
import { IOrganizationTeamProvider } from '../../common/interfaces/league-domain/organization-team-provider.interface';
import { TeamRepository } from '../repositories/team.repository';
import { PrismaService } from '../../prisma/prisma.service';
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
  constructor(
    private readonly teamRepository: TeamRepository,
    private readonly prisma: PrismaService,
  ) {}

  async findById(teamId: string): Promise<Team | null> {
    return this.teamRepository.findById(teamId);
  }

  async update(
    teamId: string,
    data: { organizationId: string | null },
  ): Promise<Team> {
    // Handle null explicitly - null means remove from organization
    // The repository's update method uses UpdateTeamDto which doesn't allow null,
    // so we need to use Prisma directly for this case
    if (data.organizationId === null) {
      // Use Prisma directly to set organizationId to null
      return this.prisma.team.update({
        where: { id: teamId },
        data: { organizationId: null },
        include: { members: true, organization: true },
      });
    }
    // For non-null values, use the repository's update method
    return this.teamRepository.update(teamId, {
      organizationId: data.organizationId,
    });
  }
}
