import { Injectable } from '@nestjs/common';
import { LeagueRepository } from '../repositories/league.repository';
import type { ILeagueRepositoryAccess } from '../../common/interfaces/league-domain/league-repository-access.interface';
import { League } from '@prisma/client';

/**
 * LeagueRepositoryAccessAdapter - Adapter for LeagueRepository
 *
 * Provides ILeagueRepositoryAccess interface implementation to break circular dependencies.
 */
@Injectable()
export class LeagueRepositoryAccessAdapter implements ILeagueRepositoryAccess {
  constructor(private readonly leagueRepository: LeagueRepository) {}

  async findById(id: string): Promise<League | null> {
    return this.leagueRepository.findById(id);
  }

  async exists(id: string): Promise<boolean> {
    return this.leagueRepository.exists(id);
  }
}
