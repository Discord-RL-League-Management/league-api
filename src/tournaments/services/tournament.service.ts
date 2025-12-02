import { Injectable } from '@nestjs/common';
import { TournamentRepository } from '../repositories/tournament.repository';
import { CreateTournamentDto } from '../dto/create-tournament.dto';

@Injectable()
export class TournamentService {
  constructor(private repository: TournamentRepository) {}

  async findOne(id: string) {
    return this.repository.findById(id);
  }

  async create(createDto: CreateTournamentDto) {
    return this.repository.create(createDto);
  }

  async registerParticipant(
    tournamentId: string,
    playerId: string | null,
    teamId: string | null,
    leagueId: string,
  ) {
    // Implementation would use TournamentParticipantRepository
    return { tournamentId, playerId, teamId, leagueId };
  }
}

