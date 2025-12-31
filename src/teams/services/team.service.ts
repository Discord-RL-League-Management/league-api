import { Injectable, Inject } from '@nestjs/common';
import type { ILoggingService } from '../../infrastructure/logging/interfaces/logging.interface';
import { TeamRepository } from '../repositories/team.repository';
import { TeamValidationService } from './team-validation.service';
import { CreateTeamDto } from '../dto/create-team.dto';
import { UpdateTeamDto } from '../dto/update-team.dto';
import { TeamNotFoundException } from '../exceptions/team.exceptions';

@Injectable()
export class TeamService {
  private readonly serviceName = TeamService.name;

  constructor(
    private teamRepository: TeamRepository,
    private teamValidationService: TeamValidationService,
    @Inject('ILoggingService')
    private readonly loggingService: ILoggingService,
  ) {}

  async findOne(id: string) {
    const team = await this.teamRepository.findById(id);
    if (!team) throw new TeamNotFoundException(id);
    return team;
  }

  async findByLeagueId(leagueId: string) {
    return this.teamRepository.findByLeagueId(leagueId);
  }

  async create(createTeamDto: CreateTeamDto) {
    await this.teamValidationService.validateOrganizationRequirement(
      createTeamDto.leagueId,
      createTeamDto.organizationId,
    );

    if (createTeamDto.organizationId) {
      await this.teamValidationService.validateOrganizationExists(
        createTeamDto.organizationId,
        createTeamDto.leagueId,
      );

      await this.teamValidationService.validateOrganizationCapacity(
        createTeamDto.organizationId,
        createTeamDto.leagueId,
      );
    }

    return this.teamRepository.create(createTeamDto);
  }

  async update(id: string, updateTeamDto: UpdateTeamDto) {
    const team = await this.teamRepository.findById(id);
    if (!team) throw new TeamNotFoundException(id);

    if (updateTeamDto.organizationId !== undefined) {
      if (updateTeamDto.organizationId === null) {
        await this.teamValidationService.validateOrganizationRequirement(
          team.leagueId,
          undefined,
        );
      } else {
        await this.teamValidationService.validateOrganizationExists(
          updateTeamDto.organizationId,
          team.leagueId,
        );

        await this.teamValidationService.validateOrganizationCapacity(
          updateTeamDto.organizationId,
          team.leagueId,
        );
      }
    }

    return this.teamRepository.update(id, updateTeamDto);
  }

  async delete(id: string) {
    const team = await this.teamRepository.findById(id);
    if (!team) throw new TeamNotFoundException(id);
    return this.teamRepository.delete(id);
  }
}
