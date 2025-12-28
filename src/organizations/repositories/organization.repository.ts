import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Organization, OrganizationMember } from '@prisma/client';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';
import { AddOrganizationMemberDto } from '../dto/add-organization-member.dto';
import { UpdateOrganizationMemberDto } from '../dto/update-organization-member.dto';
import { BaseRepository } from '../../common/repositories/base.repository.interface';
import {
  OrganizationMemberRole,
  OrganizationMemberStatus,
} from '@prisma/client';

/**
 * OrganizationRepository - Handles all database operations for Organization entity
 */
@Injectable()
export class OrganizationRepository
  implements
    BaseRepository<Organization, CreateOrganizationDto, UpdateOrganizationDto>
{
  private readonly logger = new Logger(OrganizationRepository.name);

  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<Organization | null> {
    return this.prisma.organization.findUnique({
      where: { id },
      include: {
        members: {
          include: { player: { include: { user: true } } },
        },
        teams: true,
        league: true,
      },
    });
  }

  async findByIdAndLeague(
    id: string,
    leagueId: string,
  ): Promise<Organization | null> {
    return this.prisma.organization.findFirst({
      where: { id, leagueId },
      include: {
        members: {
          include: { player: { include: { user: true } } },
        },
        teams: true,
      },
    });
  }

  async findByLeagueId(leagueId: string): Promise<Organization[]> {
    return this.prisma.organization.findMany({
      where: { leagueId },
      include: {
        members: {
          where: { status: 'ACTIVE' },
          include: { player: { include: { user: true } } },
        },
        teams: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(options?: { page?: number; limit?: number }): Promise<{
    data: Organization[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 50;
    const skip = (page - 1) * limit;
    const maxLimit = Math.min(limit, 100);

    const [organizations, total] = await Promise.all([
      this.prisma.organization.findMany({
        skip,
        take: maxLimit,
        orderBy: { createdAt: 'desc' },
        include: { members: true, teams: true },
      }),
      this.prisma.organization.count(),
    ]);

    return { data: organizations, total, page, limit: maxLimit };
  }

  async create(data: CreateOrganizationDto): Promise<Organization> {
    return this.prisma.organization.create({
      data: {
        leagueId: data.leagueId,
        name: data.name,
        tag: data.tag,
        description: data.description,
      },
      include: { members: true, teams: true },
    });
  }

  async update(id: string, data: UpdateOrganizationDto): Promise<Organization> {
    return this.prisma.organization.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.tag !== undefined && { tag: data.tag }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
      },
      include: { members: true, teams: true },
    });
  }

  async delete(id: string): Promise<Organization> {
    return this.prisma.organization.delete({ where: { id } });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.organization.count({ where: { id } });
    return count > 0;
  }

  // Organization-specific methods
  async findTeamsByOrganization(organizationId: string) {
    return this.prisma.team.findMany({
      where: { organizationId },
      include: { members: { where: { status: 'ACTIVE' } }, captain: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async countTeamsByOrganization(organizationId: string): Promise<number> {
    return this.prisma.team.count({ where: { organizationId } });
  }

  // OrganizationMember methods
  async findMemberById(memberId: string): Promise<OrganizationMember | null> {
    return this.prisma.organizationMember.findUnique({
      where: { id: memberId },
      include: {
        organization: true,
        player: { include: { user: true } },
        league: true,
      },
    });
  }

  async findMembersByOrganization(
    organizationId: string,
  ): Promise<OrganizationMember[]> {
    return this.prisma.organizationMember.findMany({
      where: {
        organizationId,
        status: OrganizationMemberStatus.ACTIVE, // Only return active members
      },
      include: {
        player: { include: { user: true } },
      },
      orderBy: { joinedAt: 'desc' },
    });
  }

  async findMembersByPlayer(
    playerId: string,
    leagueId: string,
  ): Promise<OrganizationMember | null> {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        playerId_leagueId: {
          playerId,
          leagueId,
        },
      },
      include: {
        organization: true,
        player: { include: { user: true } },
      },
    });

    // REMOVED members should not block re-joins (treat as not in organization)
    if (membership && membership.status === OrganizationMemberStatus.REMOVED) {
      return null;
    }

    return membership;
  }

  async findGeneralManagers(
    organizationId: string,
  ): Promise<OrganizationMember[]> {
    return this.prisma.organizationMember.findMany({
      where: {
        organizationId,
        role: OrganizationMemberRole.GENERAL_MANAGER,
        status: OrganizationMemberStatus.ACTIVE,
      },
      include: {
        player: { include: { user: true } },
      },
    });
  }

  async countGeneralManagers(organizationId: string): Promise<number> {
    return this.prisma.organizationMember.count({
      where: {
        organizationId,
        role: OrganizationMemberRole.GENERAL_MANAGER,
        status: OrganizationMemberStatus.ACTIVE,
      },
    });
  }

  async addMember(
    data: AddOrganizationMemberDto & {
      organizationId: string;
      leagueId: string;
      approvedBy?: string;
    },
  ): Promise<OrganizationMember> {
    // This prevents race conditions where concurrent requests could both pass validation
    // (filtering out REMOVED members) and then both attempt to create memberships,
    // violating the unique constraint on (playerId, leagueId)
    return this.prisma.$transaction(async (tx) => {
      // Allows players to rejoin organizations after being removed
      await tx.organizationMember.deleteMany({
        where: {
          playerId: data.playerId,
          leagueId: data.leagueId,
          status: OrganizationMemberStatus.REMOVED,
        },
      });

      return tx.organizationMember.create({
        data: {
          organizationId: data.organizationId,
          playerId: data.playerId,
          leagueId: data.leagueId,
          role: data.role ?? OrganizationMemberRole.MEMBER,
          notes: data.notes,
          approvedBy: data.approvedBy,
          approvedAt:
            data.approvedBy !== undefined && data.approvedBy !== null
              ? new Date()
              : undefined,
        },
        include: {
          organization: true,
          player: { include: { user: true } },
        },
      });
    });
  }

  async updateMember(
    memberId: string,
    data: UpdateOrganizationMemberDto,
  ): Promise<OrganizationMember> {
    return this.prisma.organizationMember.update({
      where: { id: memberId },
      data: {
        ...(data.role !== undefined && { role: data.role }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: {
        organization: true,
        player: { include: { user: true } },
      },
    });
  }

  async removeMember(memberId: string): Promise<OrganizationMember> {
    return this.prisma.organizationMember.update({
      where: { id: memberId },
      data: {
        status: OrganizationMemberStatus.REMOVED,
        leftAt: new Date(),
      },
      include: {
        organization: true,
        player: { include: { user: true } },
      },
    });
  }
}
