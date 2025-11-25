import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { TeamRepository } from '../repositories/team.repository';
import { TeamValidationService } from './team-validation.service';
import { CreateTeamDto } from '../dto/create-team.dto';
import { UpdateTeamDto } from '../dto/update-team.dto';
import { TeamNotFoundException } from '../exceptions/team.exceptions';

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(
    private teamRepository: TeamRepository,
    private teamValidationService: TeamValidationService,
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
    // Validate organization requirement
    await this.teamValidationService.validateOrganizationRequirement(
      createTeamDto.leagueId,
      createTeamDto.organizationId,
    );

    // If organizationId provided, validate it exists in league
    if (createTeamDto.organizationId) {
      await this.teamValidationService.validateOrganizationExists(
        createTeamDto.organizationId,
        createTeamDto.leagueId,
      );

      // Validate organization capacity
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

    // If organizationId is being updated, validate
    if (updateTeamDto.organizationId !== undefined) {
      // If removing organizationId (setting to null), check if league requires organizations
      if (updateTeamDto.organizationId === null) {
        await this.teamValidationService.validateOrganizationRequirement(team.leagueId, undefined);
      } else {
        // Validate new organization exists in league
        await this.teamValidationService.validateOrganizationExists(
          updateTeamDto.organizationId,
          team.leagueId,
        );

        // Validate organization capacity
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

