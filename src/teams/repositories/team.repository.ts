import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Team, Prisma } from '@prisma/client';
import { CreateTeamDto } from '../dto/create-team.dto';
import { UpdateTeamDto } from '../dto/update-team.dto';
import { BaseRepository } from '../../common/repositories/base.repository.interface';

/**
 * TeamRepository - Handles all database operations for Team entity
 */
@Injectable()
export class TeamRepository
  implements BaseRepository<Team, CreateTeamDto, UpdateTeamDto>
{
  private readonly logger = new Logger(TeamRepository.name);

  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<Team | null> {
    return this.prisma.team.findUnique({
      where: { id },
      include: { members: true, captain: true, organization: true },
    });
  }

  async findAll(options?: {
    page?: number;
    limit?: number;
  }): Promise<{ data: Team[]; total: number; page: number; limit: number }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 50;
    const skip = (page - 1) * limit;
    const maxLimit = Math.min(limit, 100);

    const [teams, total] = await Promise.all([
      this.prisma.team.findMany({
        skip,
        take: maxLimit,
        orderBy: { createdAt: 'desc' },
        include: { members: true },
      }),
      this.prisma.team.count(),
    ]);

    return { data: teams, total, page, limit: maxLimit };
  }

  async findByLeagueId(leagueId: string): Promise<Team[]> {
    return this.prisma.team.findMany({
      where: { leagueId },
      include: { members: { where: { status: 'ACTIVE' } }, captain: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: CreateTeamDto): Promise<Team> {
    return this.prisma.team.create({
      data: {
        leagueId: data.leagueId,
        name: data.name,
        tag: data.tag,
        description: data.description,
        captainId: data.captainId,
        organizationId: data.organizationId,
        maxPlayers: data.maxPlayers ?? 5,
        minPlayers: data.minPlayers ?? 2,
        allowEmergencySubs: data.allowEmergencySubs ?? true,
        maxSubstitutes: data.maxSubstitutes ?? 2,
      },
      include: { members: true, organization: true },
    });
  }

  async update(
    id: string,
    data: UpdateTeamDto,
    tx?: Prisma.TransactionClient,
  ): Promise<Team> {
    const client = tx || this.prisma;
    return client.team.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.tag !== undefined && { tag: data.tag }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.captainId !== undefined && { captainId: data.captainId }),
        ...(data.organizationId !== undefined && {
          organizationId: data.organizationId,
        }),
        ...(data.maxPlayers !== undefined && { maxPlayers: data.maxPlayers }),
        ...(data.minPlayers !== undefined && { minPlayers: data.minPlayers }),
        ...(data.allowEmergencySubs !== undefined && {
          allowEmergencySubs: data.allowEmergencySubs,
        }),
        ...(data.maxSubstitutes !== undefined && {
          maxSubstitutes: data.maxSubstitutes,
        }),
      },
      include: { members: true, organization: true },
    });
  }

  /**
   * Count teams by organization ID
   */
  async countByOrganizationId(
    organizationId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx || this.prisma;
    return client.team.count({
      where: { organizationId },
    });
  }

  async delete(id: string): Promise<Team> {
    return this.prisma.team.delete({ where: { id } });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.team.count({ where: { id } });
    return count > 0;
  }

  async findByOrganizationId(organizationId: string): Promise<Team[]> {
    return this.prisma.team.findMany({
      where: { organizationId },
      include: { members: { where: { status: 'ACTIVE' } }, captain: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findTeamsWithoutOrganization(leagueId: string): Promise<Team[]> {
    return this.prisma.team.findMany({
      where: {
        leagueId,
        organizationId: null,
      },
      include: { members: { where: { status: 'ACTIVE' } }, captain: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
