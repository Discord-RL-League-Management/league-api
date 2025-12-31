import { Injectable, Inject } from '@nestjs/common';
import { ILoggingService } from '../../infrastructure/logging/interfaces/logging.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { TeamMemberRepository } from '../repositories/team-member.repository';
import { TeamService } from '../../teams/services/team.service';
import { CreateTeamMemberDto } from '../dto/create-team-member.dto';
import { UpdateTeamMemberDto } from '../dto/update-team-member.dto';
import {
  TeamMemberNotFoundException,
  TeamCapacityException,
  TeamMemberAlreadyExistsException,
} from '../../teams/exceptions/team.exceptions';

@Injectable()
export class TeamMemberService {
  private readonly serviceName = TeamMemberService.name;

  constructor(
    private teamMemberRepository: TeamMemberRepository,
    private teamService: TeamService,
    private prisma: PrismaService,
    @Inject(ILoggingService)
    private readonly loggingService: ILoggingService,
  ) {}

  async findOne(id: string) {
    const member = await this.teamMemberRepository.findById(id);
    if (!member) throw new TeamMemberNotFoundException(id);
    return member;
  }

  async findByTeamId(teamId: string) {
    return this.teamMemberRepository.findByTeamId(teamId);
  }

  async addMember(createDto: CreateTeamMemberDto) {
    const team = await this.teamService.findOne(createDto.teamId);

    // Check capacity
    const activeCount = await this.teamMemberRepository.countActiveMembers(
      createDto.teamId,
    );
    if (activeCount >= team.maxPlayers) {
      throw new TeamCapacityException(
        `Team is full (${activeCount}/${team.maxPlayers})`,
      );
    }

    // Check if already a member
    const existing = await this.teamMemberRepository.findByPlayerAndLeague(
      createDto.playerId,
      createDto.leagueId,
    );
    if (
      existing &&
      existing.teamId === createDto.teamId &&
      existing.status === 'ACTIVE'
    ) {
      throw new TeamMemberAlreadyExistsException(
        createDto.playerId,
        createDto.teamId,
      );
    }

    // If existing but inactive, reactivate
    if (existing && existing.teamId === createDto.teamId) {
      return this.teamMemberRepository.update(existing.id, {
        status: 'ACTIVE',
        leftAt: null,
      });
    }

    return this.teamMemberRepository.create(createDto);
  }

  async removeMember(id: string) {
    const member = await this.teamMemberRepository.findById(id);
    if (!member) throw new TeamMemberNotFoundException(id);
    return this.teamMemberRepository.delete(id);
  }

  async update(id: string, updateDto: UpdateTeamMemberDto) {
    const member = await this.teamMemberRepository.findById(id);
    if (!member) throw new TeamMemberNotFoundException(id);
    return this.teamMemberRepository.update(id, updateDto);
  }
}
