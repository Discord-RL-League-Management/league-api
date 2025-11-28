import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { OrganizationRepository } from '../repositories/organization.repository';
import { OrganizationMemberService } from './organization-member.service';
import { OrganizationValidationService } from './organization-validation.service';
import { PlayerService } from '../../players/services/player.service';
import { LeagueRepository } from '../../leagues/repositories/league.repository';
import { LeagueSettingsService } from '../../leagues/league-settings.service';
import { TeamRepository } from '../../teams/repositories/team.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';
import { OrganizationMemberRole } from '@prisma/client';
import { LeagueConfiguration } from '../../leagues/interfaces/league-settings.interface';
import {
  OrganizationNotFoundException,
  OrganizationHasTeamsException,
  NotGeneralManagerException,
  OrganizationCapacityExceededException,
} from '../exceptions/organization.exceptions';

/**
 * OrganizationService - Business logic layer for Organization operations
 */
@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(
    private organizationRepository: OrganizationRepository,
    private organizationMemberService: OrganizationMemberService,
    private validationService: OrganizationValidationService,
    private playerService: PlayerService,
    private leagueRepository: LeagueRepository,
    private leagueSettingsService: LeagueSettingsService,
    private teamRepository: TeamRepository,
    private prisma: PrismaService,
  ) {}

  /**
   * Find organization by ID
   */
  async findOne(id: string) {
    const organization = await this.organizationRepository.findById(id);
    if (!organization) {
      throw new OrganizationNotFoundException(id);
    }
    return organization;
  }

  /**
   * Find all organizations in a league
   */
  async findByLeagueId(leagueId: string) {
    return this.organizationRepository.findByLeagueId(leagueId);
  }

  /**
   * Create organization and add creator as General Manager
   */
  async create(
    createDto: CreateOrganizationDto,
    userId: string,
    settings?: any,
  ) {
    // Validate organization creation
    await this.validationService.validateCreate(createDto);

    // Validate league organization capacity (use provided settings if available)
    await this.validationService.validateLeagueOrganizationCapacity(
      createDto.leagueId,
      settings,
    );

    // Get league to get guildId
    const league = await this.leagueRepository.findById(createDto.leagueId);
    if (!league) {
      throw new NotFoundException(`League ${createDto.leagueId} not found`);
    }

    // For system user, skip player creation and GM assignment
    // System-created organizations don't need a GM initially (can be added later)
    let player = null;
    if (userId !== 'system') {
      // Ensure player exists (validates guild membership for real users)
      player = await this.playerService.ensurePlayerExists(
        userId,
        league.guildId,
      );
    }

    // Create organization
    const organization = await this.organizationRepository.create(createDto);

    // Add creator as General Manager (only if not system user)
    if (player) {
      await this.organizationMemberService.addMember(
        organization.id,
        player.id,
        OrganizationMemberRole.GENERAL_MANAGER,
        userId,
      );
    }

    // Return organization with members
    return this.findOne(organization.id);
  }

  /**
   * Update organization
   */
  async update(id: string, updateDto: UpdateOrganizationDto, userId: string) {
    // Verify organization exists
    await this.findOne(id);

    // Verify user is General Manager
    const isGM = await this.organizationMemberService.isGeneralManager(
      userId,
      id,
    );
    if (!isGM) {
      // Allow bot users to update organizations with no GMs (for managing orphaned orgs)
      const hasGMs =
        await this.organizationMemberService.hasGeneralManagers(id);
      if (!hasGMs && (userId === 'system' || userId === 'bot')) {
        this.logger.log(
          `Allowing ${userId} user to update organization ${id} with no GMs`,
        );
      } else {
        throw new NotGeneralManagerException(id);
      }
    }

    return this.organizationRepository.update(id, updateDto);
  }

  /**
   * Delete organization
   */
  async delete(id: string, userId: string) {
    // Verify organization exists
    const organization = await this.findOne(id);

    // Verify user is General Manager (or bot/system user for organizations with no GMs)
    const isGM = await this.organizationMemberService.isGeneralManager(
      userId,
      id,
    );
    if (!isGM) {
      // Allow bot/system users to delete organizations with no GMs (for rollback scenarios and orphaned orgs)
      const hasGMs =
        await this.organizationMemberService.hasGeneralManagers(id);
      if (!hasGMs && (userId === 'system' || userId === 'bot')) {
        this.logger.log(
          `Allowing ${userId} user to delete organization ${id} with no GMs`,
        );
      } else {
        throw new NotGeneralManagerException(id);
      }
    }

    // Validate can delete (no teams)
    await this.validationService.validateCanDeleteOrganization(id);

    return this.organizationRepository.delete(id);
  }

  /**
   * Find teams in organization
   */
  async findTeams(organizationId: string) {
    await this.findOne(organizationId);
    return this.organizationRepository.findTeamsByOrganization(organizationId);
  }

  /**
   * Transfer team to different organization
   */
  async transferTeam(
    teamId: string,
    targetOrganizationId: string,
    userId: string,
  ) {
    // Get team to find source organization
    const team = await this.teamRepository.findById(teamId);
    if (!team) {
      throw new NotFoundException(`Team ${teamId} not found`);
    }

    if (!team.organizationId) {
      throw new BadRequestException(
        `Team ${teamId} is not assigned to an organization`,
      );
    }

    const sourceOrgId = team.organizationId;
    const leagueId = team.leagueId;

    // Verify user is GM of source or target organization
    const isSourceGM = await this.organizationMemberService.isGeneralManager(
      userId,
      sourceOrgId,
    );
    const isTargetGM = await this.organizationMemberService.isGeneralManager(
      userId,
      targetOrganizationId,
    );

    if (!isSourceGM && !isTargetGM) {
      throw new ForbiddenException(
        'User must be a General Manager of either the source or target organization',
      );
    }

    // Validate transfer
    await this.validationService.validateTeamTransfer(
      teamId,
      sourceOrgId,
      targetOrganizationId,
      leagueId,
    );

    // Update team organization
    return this.teamRepository.update(teamId, {
      organizationId: targetOrganizationId,
    });
  }

  /**
   * Get organization statistics
   */
  async getOrganizationStats(organizationId: string) {
    const organization = await this.findOne(organizationId);

    const [teamCount, memberCount, gmCount] = await Promise.all([
      this.organizationRepository.countTeamsByOrganization(organizationId),
      this.organizationRepository
        .findMembersByOrganization(organizationId)
        .then((members) => members.length),
      this.organizationRepository.countGeneralManagers(organizationId),
    ]);

    return {
      organizationId,
      name: organization.name,
      teamCount,
      memberCount,
      generalManagerCount: gmCount,
    };
  }

  /**
   * Bulk assign teams to organization (for auto-assignment)
   */
  async assignTeamsToOrganization(
    leagueId: string,
    organizationId: string,
    teamIds: string[],
    settings?: LeagueConfiguration,
  ) {
    // Verify organization exists in league
    const organization = await this.organizationRepository.findByIdAndLeague(
      organizationId,
      leagueId,
    );
    if (!organization) {
      throw new OrganizationNotFoundException(organizationId);
    }

    // Get settings for capacity validation
    // Use provided settings if available (for validation during settings updates before persistence),
    // otherwise fall back to getSettings() which may return cached data
    const leagueSettings =
      settings || (await this.leagueSettingsService.getSettings(leagueId));
    const maxTeamsPerOrg = leagueSettings.membership.maxTeamsPerOrganization;

    // Update all teams atomically in a database transaction
    // Capacity validation occurs inside the transaction to prevent race conditions where
    // concurrent requests could add teams between the validation check and the actual updates
    return this.prisma.$transaction(async (tx) => {
      // Validate capacity within transaction to prevent race conditions
      // Count teams using transaction client to ensure consistent view of data
      if (maxTeamsPerOrg !== null && maxTeamsPerOrg !== undefined) {
        const currentTeamCount = await tx.team.count({
          where: { organizationId },
        });
        const totalTeamsAfterAssignment = currentTeamCount + teamIds.length;

        if (totalTeamsAfterAssignment > maxTeamsPerOrg) {
          throw new OrganizationCapacityExceededException(
            organizationId,
            maxTeamsPerOrg,
          );
        }
      }

      // Update all teams atomically
      // This ensures all-or-nothing semantics: if any update fails, all updates are rolled back
      const results = [];
      for (const teamId of teamIds) {
        const team = await tx.team.update({
          where: { id: teamId },
          data: { organizationId },
          include: { members: true, organization: true },
        });
        results.push(team);
      }
      return results;
    });
  }
}
