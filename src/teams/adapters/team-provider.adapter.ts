import { Injectable } from '@nestjs/common';
import { ITeamProvider } from '../../common/interfaces/league-domain/team-provider.interface';
import { TeamRepository } from '../repositories/team.repository';
import { Team } from '@prisma/client';

/**
 * TeamProviderAdapter - Adapter implementing ITeamProvider
 *
 * Implements the interface using TeamRepository to break circular dependency.
 */
@Injectable()
export class TeamProviderAdapter implements ITeamProvider {
  constructor(private readonly teamRepository: TeamRepository) {}

  async findTeamsWithoutOrganization(leagueId: string): Promise<Team[]> {
    return this.teamRepository.findTeamsWithoutOrganization(leagueId);
  }
}
