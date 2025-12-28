import { Injectable } from '@nestjs/common';
import { ILeagueMemberAccess } from '../../leagues/interfaces/league-member-access.interface';
import { LeagueMemberRepository } from '../repositories/league-member.repository';
import { LeagueMember } from '@prisma/client';

/**
 * LeagueMemberAccessAdapter - Adapter implementing ILeagueMemberAccess
 *
 * Implements the interface using LeagueMemberRepository to break circular dependency.
 */
@Injectable()
export class LeagueMemberAccessAdapter implements ILeagueMemberAccess {
  constructor(private readonly repository: LeagueMemberRepository) {}

  async findByPlayerAndLeague(
    playerId: string,
    leagueId: string,
  ): Promise<LeagueMember | null> {
    return this.repository.findByPlayerAndLeague(playerId, leagueId);
  }
}
