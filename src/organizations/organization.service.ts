import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { OrganizationRepository } from './repositories/organization.repository';
import { OrganizationMemberService } from './services/organization-member.service';
import { OrganizationValidationService } from './services/organization-validation.service';
import { PlayerService } from '@/players/player.service';
import type { ILeagueRepositoryAccess } from '../common/interfaces/league-domain/league-repository-access.interface';
import type { ILeagueSettingsProvider } from '../common/interfaces/league-domain/league-settings-provider.interface';
import type { IOrganizationTeamProvider } from '../common/interfaces/league-domain/organization-team-provider.interface';
import {
  ILEAGUE_REPOSITORY_ACCESS,
  ILEAGUE_SETTINGS_PROVIDER,
  IORGANIZATION_TEAM_PROVIDER,
} from '../common/tokens/injection.tokens';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationMemberRole } from '@prisma/client';
import { LeagueConfiguration } from '../leagues/interfaces/league-settings.interface';
import {
  OrganizationNotFoundException,
  NotGeneralManagerException,
  OrganizationCapacityExceededException,
} from './exceptions/organization.exceptions';

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
    @Inject(ILEAGUE_REPOSITORY_ACCESS)
    private leagueRepositoryAccess: ILeagueRepositoryAccess,
    @Inject(ILEAGUE_SETTINGS_PROVIDER)
    private leagueSettingsProvider: ILeagueSettingsProvider,
    @Inject(IORGANIZATION_TEAM_PROVIDER)
    private organizationTeamProvider: IOrganizationTeamProvider,
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
    settings?: LeagueConfiguration,
  ) {
    await this.validationService.validateCreate(createDto);

    await this.validationService.validateLeagueOrganizationCapacity(
      createDto.leagueId,
      settings,
    );

    const league = await this.leagueRepositoryAccess.findById(
      createDto.leagueId,
    );
    if (!league) {
      throw new NotFoundException(`League ${createDto.leagueId} not found`);
    }

    // For system user, skip player creation and GM assignment
    // System-created organizations don't need a GM initially (can be added later)
    let player: { id: string } | null = null;
    if (userId !== 'system') {
      // Ensure player exists (validates guild membership for real users)
      player = (await this.playerService.ensurePlayerExists(
        userId,
        league.guildId,
      )) as { id: string };
    }

    const organization = await this.organizationRepository.create(createDto);

    if (player) {
      await this.organizationMemberService.addMember(
        organization.id,
        player.id,
        OrganizationMemberRole.GENERAL_MANAGER,
        userId,
      );
    }

    return this.findOne(organization.id);
  }

  /**
   * Update organization
   */
  async update(id: string, updateDto: UpdateOrganizationDto, userId: string) {
    await this.findOne(id);

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
    await this.findOne(id);

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
    const team = await this.organizationTeamProvider.findById(teamId);
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

    await this.validationService.validateTeamTransfer(
      teamId,
      sourceOrgId,
      targetOrganizationId,
      leagueId,
    );

    return this.organizationTeamProvider.update(teamId, {
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
    const organization = await this.organizationRepository.findByIdAndLeague(
      organizationId,
      leagueId,
    );
    if (!organization) {
      throw new OrganizationNotFoundException(organizationId);
    }

    // Use provided settings if available (for validation during settings updates before persistence),
    // otherwise fall back to getSettings() which may return cached data
    const leagueSettings =
      settings || (await this.leagueSettingsProvider.getSettings(leagueId));
    const maxTeamsPerOrg = leagueSettings.membership.maxTeamsPerOrganization;

    // Capacity validation occurs inside the transaction to prevent race conditions where
    // concurrent requests could add teams between the validation check and the actual updates
    return this.prisma.$transaction(async (tx) => {
      // Count teams using transaction client to ensure consistent view of data
      if (maxTeamsPerOrg !== null && maxTeamsPerOrg !== undefined) {
        const currentTeamCount =
          await this.organizationTeamProvider.countByOrganizationId(
            organizationId,
            tx,
          );
        const totalTeamsAfterAssignment = currentTeamCount + teamIds.length;

        if (totalTeamsAfterAssignment > maxTeamsPerOrg) {
          throw new OrganizationCapacityExceededException(
            organizationId,
            maxTeamsPerOrg,
          );
        }
      }

      const results = [];
      for (const teamId of teamIds) {
        const team = await this.organizationTeamProvider.update(
          teamId,
          { organizationId },
          tx,
        );
        results.push(team);
      }
      return results;
    });
  }
}
