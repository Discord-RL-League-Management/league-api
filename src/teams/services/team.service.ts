import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TeamRepository } from '../repositories/team.repository';
import { CreateTeamDto } from '../dto/create-team.dto';
import { UpdateTeamDto } from '../dto/update-team.dto';
import { TeamNotFoundException } from '../exceptions/team.exceptions';

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(private teamRepository: TeamRepository) {}

  async findOne(id: string) {
    const team = await this.teamRepository.findById(id);
    if (!team) throw new TeamNotFoundException(id);
    return team;
  }

  async findByLeagueId(leagueId: string) {
    return this.teamRepository.findByLeagueId(leagueId);
  }

  async create(createTeamDto: CreateTeamDto) {
    return this.teamRepository.create(createTeamDto);
  }

  async update(id: string, updateTeamDto: UpdateTeamDto) {
    const team = await this.teamRepository.findById(id);
    if (!team) throw new TeamNotFoundException(id);
    return this.teamRepository.update(id, updateTeamDto);
  }

  async delete(id: string) {
    const team = await this.teamRepository.findById(id);
    if (!team) throw new TeamNotFoundException(id);
    return this.teamRepository.delete(id);
  }
}

