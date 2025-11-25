import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TeamMember, Prisma } from '@prisma/client';
import { CreateTeamMemberDto } from '../dto/create-team-member.dto';
import { UpdateTeamMemberDto } from '../dto/update-team-member.dto';
import { BaseRepository } from '../../common/repositories/base.repository.interface';

/**
 * TeamMemberRepository - Handles all database operations for TeamMember entity
 */
@Injectable()
export class TeamMemberRepository implements BaseRepository<TeamMember, CreateTeamMemberDto, UpdateTeamMemberDto> {
  private readonly logger = new Logger(TeamMemberRepository.name);

  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<TeamMember | null> {
    return this.prisma.teamMember.findUnique({
      where: { id },
      include: { player: true, team: true, league: true },
    });
  }

  async findAll(options?: { page?: number; limit?: number }): Promise<{ data: TeamMember[]; total: number; page: number; limit: number }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 50;
    const skip = (page - 1) * limit;
    const maxLimit = Math.min(limit, 100);

    const [members, total] = await Promise.all([
      this.prisma.teamMember.findMany({
        skip,
        take: maxLimit,
        orderBy: { joinedAt: 'desc' },
      }),
      this.prisma.teamMember.count(),
    ]);

    return { data: members, total, page, limit: maxLimit };
  }

  async findByPlayerAndLeague(playerId: string, leagueId: string): Promise<TeamMember | null> {
    return this.prisma.teamMember.findFirst({
      where: {
        playerId,
        leagueId,
        status: 'ACTIVE',
      },
      include: { player: true, team: true },
    });
  }

  async findByTeamId(teamId: string, includeInactive: boolean = false): Promise<TeamMember[]> {
    const where: Prisma.TeamMemberWhereInput = { teamId };
    if (!includeInactive) {
      where.status = 'ACTIVE';
    }
    return this.prisma.teamMember.findMany({
      where,
      include: { player: true },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async create(data: CreateTeamMemberDto): Promise<TeamMember> {
    return this.prisma.teamMember.create({
      data: {
        teamId: data.teamId,
        playerId: data.playerId,
        leagueId: data.leagueId,
        role: data.role || 'MEMBER',
        status: data.status || 'ACTIVE',
        membershipType: data.membershipType || 'PERMANENT',
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        notes: data.notes,
      },
      include: { player: true, team: true },
    });
  }

  async update(id: string, data: UpdateTeamMemberDto): Promise<TeamMember> {
    return this.prisma.teamMember.update({
      where: { id },
      data: {
        ...(data.role !== undefined && { role: data.role }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.membershipType !== undefined && { membershipType: data.membershipType }),
        ...(data.startDate !== undefined && { startDate: new Date(data.startDate) }),
        ...(data.endDate !== undefined && { endDate: data.endDate ? new Date(data.endDate) : null }),
        ...(data.notes !== undefined && { notes: data.notes }),
        // Handle leftAt: null clears the field, date string updates it, undefined is ignored
        ...(data.leftAt !== undefined && { 
          leftAt: data.leftAt === null ? null : (data.leftAt ? new Date(data.leftAt) : null)
        }),
      },
      include: { player: true, team: true },
    });
  }

  async delete(id: string): Promise<TeamMember> {
    return this.prisma.teamMember.update({
      where: { id },
      data: {
        status: 'REMOVED',
        leftAt: new Date(),
      },
    });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.teamMember.count({ where: { id } });
    return count > 0;
  }

  async countActiveMembers(teamId: string): Promise<number> {
    return this.prisma.teamMember.count({
      where: { teamId, status: 'ACTIVE' },
    });
  }
}

