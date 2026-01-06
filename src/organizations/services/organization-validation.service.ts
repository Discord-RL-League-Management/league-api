import { Injectable, Logger, Inject } from '@nestjs/common';
import { OrganizationRepository } from '../repositories/organization.repository';
import type { ILeagueRepositoryAccess } from '../../common/interfaces/league-domain/league-repository-access.interface';
import { PlayerService } from '../../players/player.service';
import type { ILeagueSettingsProvider } from '../../common/interfaces/league-domain/league-settings-provider.interface';
import {
  ILEAGUE_REPOSITORY_ACCESS,
  ILEAGUE_SETTINGS_PROVIDER,
} from '../../common/tokens/injection.tokens';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import {
  OrganizationNotFoundException,
  OrganizationHasTeamsException,
  NoGeneralManagerException,
  CannotRemoveLastGeneralManagerException,
  PlayerAlreadyInOrganizationException,
  OrganizationCapacityExceededException,
  LeagueOrganizationCapacityExceededException,
} from '../exceptions/organization.exceptions';
import { LeagueNotFoundException } from '../../leagues/exceptions/league.exceptions';
import { OrganizationMemberRole } from '@prisma/client';
import { LeagueConfiguration } from '../../leagues/interfaces/league-settings.interface';

/**
 * OrganizationValidationService - Single Responsibility: Organization validation logic
 */
@Injectable()
export class OrganizationValidationService {
  private readonly logger = new Logger(OrganizationValidationService.name);

  constructor(
    private organizationRepository: OrganizationRepository,
    @Inject(ILEAGUE_REPOSITORY_ACCESS)
    private leagueRepositoryAccess: ILeagueRepositoryAccess,
    private playerService: PlayerService,
    @Inject(ILEAGUE_SETTINGS_PROVIDER)
    private leagueSettingsProvider: ILeagueSettingsProvider,
  ) {}

  /**
   * Validate organization creation
   */
  async validateCreate(data: CreateOrganizationDto): Promise<void> {
    const leagueExists = await this.leagueRepositoryAccess.exists(
      data.leagueId,
    );
    if (!leagueExists) {
      throw new LeagueNotFoundException(data.leagueId);
    }
  }

  /**
   * Validate member can join organization
   */
  async validateMemberAdd(
    organizationId: string,
    playerId: string,
    leagueId: string,
  ): Promise<void> {
    const organization = await this.organizationRepository.findByIdAndLeague(
      organizationId,
      leagueId,
    );
    if (!organization) {
      throw new OrganizationNotFoundException(organizationId);
    }

    await this.playerService.findOne(playerId);

    // Note: findMembersByPlayer now filters out REMOVED members, so this only returns ACTIVE memberships
    const existingMembership =
      await this.organizationRepository.findMembersByPlayer(playerId, leagueId);
    if (existingMembership) {
      // If already in the same organization, throw error (duplicate add attempt)
      // This prevents Prisma unique constraint violation
      if (existingMembership.organizationId === organizationId) {
        throw new PlayerAlreadyInOrganizationException(playerId, leagueId);
      }
      throw new PlayerAlreadyInOrganizationException(playerId, leagueId);
    }
  }

  /**
   * Validate at least one General Manager exists
   */
  async validateGeneralManagerRequirement(
    organizationId: string,
  ): Promise<void> {
    const count =
      await this.organizationRepository.countGeneralManagers(organizationId);
    if (count === 0) {
      throw new NoGeneralManagerException(organizationId);
    }
  }

  /**
   * Validate can remove General Manager (not the last one)
   */
  async validateCanRemoveGeneralManager(
    organizationId: string,
    memberId: string,
  ): Promise<void> {
    const member = await this.organizationRepository.findMemberById(memberId);
    if (!member) {
      return; // Will be caught by other validation
    }

    if (member.role === OrganizationMemberRole.GENERAL_MANAGER) {
      const count =
        await this.organizationRepository.countGeneralManagers(organizationId);
      if (count <= 1) {
        throw new CannotRemoveLastGeneralManagerException(organizationId);
      }
    }
  }

  /**
   * Validate organization capacity (max teams per org)
   */
  async validateOrganizationCapacity(
    leagueId: string,
    organizationId?: string,
    settings?: LeagueConfiguration,
  ): Promise<void> {
    if (!organizationId) {
      return;
    }

    // Use provided settings or fetch from service (for cache-aware validation)
    const leagueSettings =
      settings || (await this.leagueSettingsProvider.getSettings(leagueId));
    const maxTeamsPerOrg = leagueSettings.membership.maxTeamsPerOrganization;

    if (maxTeamsPerOrg !== null && maxTeamsPerOrg !== undefined) {
      const teamCount =
        await this.organizationRepository.countTeamsByOrganization(
          organizationId,
        );
      // Use > instead of >= to match assignTeamsToOrganization logic
      // This ensures consistency: both throw only when capacity would be exceeded, not when at capacity
      if (teamCount > maxTeamsPerOrg) {
        throw new OrganizationCapacityExceededException(
          organizationId,
          maxTeamsPerOrg,
        );
      }
    }
  }

  /**
   * Validate league organization capacity (max orgs in league)
   */
  async validateLeagueOrganizationCapacity(
    leagueId: string,
    settings?: LeagueConfiguration,
  ): Promise<void> {
    // Use provided settings or fetch from service (for cache-aware validation)
    const leagueSettings =
      settings || (await this.leagueSettingsProvider.getSettings(leagueId));
    const maxOrganizations = leagueSettings.membership.maxOrganizations;

    if (maxOrganizations !== null && maxOrganizations !== undefined) {
      const organizations =
        await this.organizationRepository.findByLeagueId(leagueId);
      if (organizations.length >= maxOrganizations) {
        throw new LeagueOrganizationCapacityExceededException(
          leagueId,
          maxOrganizations,
        );
      }
    }
  }

  /**
   * Validate can delete organization (no teams)
   */
  async validateCanDeleteOrganization(organizationId: string): Promise<void> {
    const teamCount =
      await this.organizationRepository.countTeamsByOrganization(
        organizationId,
      );
    if (teamCount > 0) {
      throw new OrganizationHasTeamsException(organizationId);
    }
  }

  /**
   * Validate player not in another organization
   */
  async validatePlayerNotInAnotherOrg(
    playerId: string,
    leagueId: string,
    excludeOrgId?: string,
  ): Promise<void> {
    const existingMembership =
      await this.organizationRepository.findMembersByPlayer(playerId, leagueId);
    if (
      existingMembership &&
      existingMembership.organizationId !== excludeOrgId
    ) {
      throw new PlayerAlreadyInOrganizationException(playerId, leagueId);
    }
  }

  /**
   * Validate team can be transferred
   */
  async validateTeamTransfer(
    teamId: string,
    sourceOrgId: string,
    targetOrgId: string,
    leagueId: string,
  ): Promise<void> {
    const sourceOrg = await this.organizationRepository.findByIdAndLeague(
      sourceOrgId,
      leagueId,
    );
    if (!sourceOrg) {
      throw new OrganizationNotFoundException(sourceOrgId);
    }

    const targetOrg = await this.organizationRepository.findByIdAndLeague(
      targetOrgId,
      leagueId,
    );
    if (!targetOrg) {
      throw new OrganizationNotFoundException(targetOrgId);
    }

    await this.validateOrganizationCapacity(leagueId, targetOrgId);
  }
}
