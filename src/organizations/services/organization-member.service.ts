import { Injectable, Logger } from '@nestjs/common';
import { OrganizationRepository } from '../repositories/organization.repository';
import { OrganizationValidationService } from './organization-validation.service';
import { UpdateOrganizationMemberDto } from '../dto/update-organization-member.dto';
import { OrganizationMemberRole } from '@prisma/client';
import {
  OrganizationMemberNotFoundException,
  OrganizationNotFoundException,
} from '../exceptions/organization.exceptions';

/**
 * OrganizationMemberService - Business logic layer for OrganizationMember operations
 */
@Injectable()
export class OrganizationMemberService {
  private readonly logger = new Logger(OrganizationMemberService.name);

  constructor(
    private organizationRepository: OrganizationRepository,
    private validationService: OrganizationValidationService,
  ) {}

  /**
   * Find all members in an organization
   */
  async findMembers(organizationId: string) {
    return this.organizationRepository.findMembersByOrganization(
      organizationId,
    );
  }

  /**
   * Find member by ID
   */
  async findMemberById(memberId: string) {
    const member = await this.organizationRepository.findMemberById(memberId);
    if (!member) {
      throw new OrganizationMemberNotFoundException(memberId);
    }
    return member;
  }

  /**
   * Find member by player and organization
   */
  async findMemberByPlayer(organizationId: string, playerId: string) {
    const organization =
      await this.organizationRepository.findById(organizationId);
    if (!organization) {
      return null;
    }

    return this.organizationRepository.findMembersByPlayer(
      playerId,
      organization.leagueId,
    );
  }

  /**
   * Add member to organization
   */
  async addMember(
    organizationId: string,
    playerId: string,
    role: OrganizationMemberRole,
    userId: string,
  ) {
    const organization =
      await this.organizationRepository.findById(organizationId);
    if (!organization) {
      throw new OrganizationNotFoundException(organizationId);
    }

    await this.validationService.validateMemberAdd(
      organizationId,
      playerId,
      organization.leagueId,
    );

    return this.organizationRepository.addMember({
      organizationId,
      playerId,
      leagueId: organization.leagueId,
      role: role ?? OrganizationMemberRole.MEMBER,
      approvedBy: userId,
    });
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    memberId: string,
    role: OrganizationMemberRole,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    userId: string,
  ) {
    const member = await this.findMemberById(memberId);

    if (
      member.role === OrganizationMemberRole.GENERAL_MANAGER &&
      role !== OrganizationMemberRole.GENERAL_MANAGER
    ) {
      await this.validationService.validateCanRemoveGeneralManager(
        member.organizationId,
        memberId,
      );
    }

    return this.organizationRepository.updateMember(memberId, { role });
  }

  /**
   * Update member (role, status, notes)
   */
  async updateMember(
    memberId: string,
    updateDto: UpdateOrganizationMemberDto,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    userId: string,
  ) {
    const member = await this.findMemberById(memberId);

    if (updateDto.role !== undefined) {
      if (
        member.role === OrganizationMemberRole.GENERAL_MANAGER &&
        updateDto.role !== OrganizationMemberRole.GENERAL_MANAGER
      ) {
        await this.validationService.validateCanRemoveGeneralManager(
          member.organizationId,
          memberId,
        );
      }
    }

    return this.organizationRepository.updateMember(memberId, updateDto);
  }

  /**
   * Remove member from organization
   */
  async removeMember(
    memberId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    userId: string,
  ) {
    const member = await this.findMemberById(memberId);

    if (member.role === OrganizationMemberRole.GENERAL_MANAGER) {
      await this.validationService.validateCanRemoveGeneralManager(
        member.organizationId,
        memberId,
      );
    }

    return this.organizationRepository.removeMember(memberId);
  }

  /**
   * Promote member to General Manager
   */
  async promoteToGeneralManager(memberId: string, userId: string) {
    return this.updateMemberRole(
      memberId,
      OrganizationMemberRole.GENERAL_MANAGER,
      userId,
    );
  }

  /**
   * Ensure at least one General Manager exists
   */
  async ensureGeneralManagerExists(organizationId: string): Promise<void> {
    await this.validationService.validateGeneralManagerRequirement(
      organizationId,
    );
  }

  /**
   * Get all General Managers
   */
  async getGeneralManagers(organizationId: string) {
    return this.organizationRepository.findGeneralManagers(organizationId);
  }

  /**
   * Check if user is General Manager
   */
  async isGeneralManager(
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    const organization =
      await this.organizationRepository.findById(organizationId);
    if (!organization) {
      return false;
    }

    const gms =
      await this.organizationRepository.findGeneralManagers(organizationId);
    const member = gms.find((m) => {
      const memberWithPlayer = m as {
        player?: { guildMember?: { user?: { id?: string } } };
      };
      return memberWithPlayer?.player?.guildMember?.user?.id === userId;
    });

    return !!member;
  }

  /**
   * Check if organization has any General Managers
   */
  async hasGeneralManagers(organizationId: string): Promise<boolean> {
    const gmCount =
      await this.organizationRepository.countGeneralManagers(organizationId);
    return gmCount > 0;
  }
}
