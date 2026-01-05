import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  LeagueMember,
  Prisma,
  LeagueMemberStatus,
  LeagueMemberRole,
} from '@prisma/client';
import { CreateLeagueMemberDto } from '../dto/create-league-member.dto';
import { UpdateLeagueMemberDto } from '../dto/update-league-member.dto';
import { BaseRepository } from '../../common/repositories/base.repository.interface';
import {
  LeagueMemberQueryOptions,
  defaultLeagueMemberQueryOptions,
} from '../interfaces/league-member.interface';

/**
 * LeagueMemberRepository - Handles all database operations for LeagueMember entity
 * Single Responsibility: Data access layer for LeagueMember entity
 *
 * Separates data access concerns from business logic,
 * making services more focused and testable.
 */
@Injectable()
export class LeagueMemberRepository
  implements
    BaseRepository<LeagueMember, CreateLeagueMemberDto, UpdateLeagueMemberDto>
{
  private readonly logger = new Logger(LeagueMemberRepository.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Find by ID (cuid primary key)
   */
  async findById(
    id: string,
    options?: LeagueMemberQueryOptions,
  ): Promise<LeagueMember | null> {
    const opts = { ...defaultLeagueMemberQueryOptions, ...options };

    const include: Prisma.LeagueMemberInclude = {};
    if (opts.includePlayer) {
      include.player = true;
    }
    if (opts.includeLeague) {
      include.league = true;
    }

    return this.prisma.leagueMember.findUnique({
      where: { id },
      include: Object.keys(include).length > 0 ? include : undefined,
    });
  }

  /**
   * Find all league members with optional pagination
   */
  async findAll(options?: { page?: number; limit?: number }): Promise<{
    data: LeagueMember[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 50;
    const skip = (page - 1) * limit;
    const maxLimit = Math.min(limit, 100);

    const [members, total] = await Promise.all([
      this.prisma.leagueMember.findMany({
        skip,
        take: maxLimit,
        orderBy: { joinedAt: 'desc' },
      }),
      this.prisma.leagueMember.count(),
    ]);

    return {
      data: members,
      total,
      page,
      limit: maxLimit,
    };
  }

  /**
   * Find by composite key (playerId + leagueId)
   * This is the primary lookup method for LeagueMember
   */
  async findByPlayerAndLeague(
    playerId: string,
    leagueId: string,
    options?: LeagueMemberQueryOptions,
    tx?: Prisma.TransactionClient,
  ): Promise<LeagueMember | null> {
    const opts = { ...defaultLeagueMemberQueryOptions, ...options };
    const client = tx || this.prisma;

    const include: Prisma.LeagueMemberInclude = {};
    if (opts.includePlayer) {
      include.player = true;
    }
    if (opts.includeLeague) {
      include.league = true;
    }

    return client.leagueMember.findUnique({
      where: {
        playerId_leagueId: {
          playerId,
          leagueId,
        },
      },
      include: Object.keys(include).length > 0 ? include : undefined,
    });
  }

  /**
   * Find all members in a league with optional filtering
   */
  async findByLeagueId(
    leagueId: string,
    options?: LeagueMemberQueryOptions,
  ): Promise<{
    data: LeagueMember[];
    total: number;
    page: number;
    limit: number;
  }> {
    const opts = { ...defaultLeagueMemberQueryOptions, ...options };
    const page = opts.page ?? 1;
    const limit = opts.limit ?? 50;
    const skip = (page - 1) * limit;
    const maxLimit = Math.min(limit, 100);

    const where: Prisma.LeagueMemberWhereInput = {
      leagueId,
    };

    if (opts.status) {
      if (Array.isArray(opts.status)) {
        where.status = { in: opts.status as LeagueMemberStatus[] };
      } else {
        where.status = opts.status as LeagueMemberStatus;
      }
    }

    if (opts.role) {
      if (Array.isArray(opts.role)) {
        where.role = { in: opts.role as LeagueMemberRole[] };
      } else {
        where.role = opts.role as LeagueMemberRole;
      }
    }

    const include: Prisma.LeagueMemberInclude = {};
    if (opts.includePlayer) {
      include.player = true;
    }
    if (opts.includeLeague) {
      include.league = true;
    }

    const orderBy: Prisma.LeagueMemberOrderByWithRelationInput = {};
    if (opts.sortBy) {
      orderBy[opts.sortBy] = opts.sortOrder || 'desc';
    } else {
      orderBy.joinedAt = 'desc';
    }

    const [members, total] = await Promise.all([
      this.prisma.leagueMember.findMany({
        where,
        include: Object.keys(include).length > 0 ? include : undefined,
        orderBy,
        skip,
        take: maxLimit,
      }),
      this.prisma.leagueMember.count({ where }),
    ]);

    return {
      data: members,
      total,
      page,
      limit: maxLimit,
    };
  }

  /**
   * Find all league memberships for a player
   */
  async findByPlayerId(
    playerId: string,
    options?: LeagueMemberQueryOptions,
  ): Promise<{
    data: LeagueMember[];
    total: number;
    page: number;
    limit: number;
  }> {
    const opts = { ...defaultLeagueMemberQueryOptions, ...options };
    const page = opts.page ?? 1;
    const limit = opts.limit ?? 50;
    const skip = (page - 1) * limit;
    const maxLimit = Math.min(limit, 100);

    const where: Prisma.LeagueMemberWhereInput = {
      playerId,
    };

    if (opts.status) {
      if (Array.isArray(opts.status)) {
        where.status = { in: opts.status as LeagueMemberStatus[] };
      } else {
        where.status = opts.status as LeagueMemberStatus;
      }
    }

    const include: Prisma.LeagueMemberInclude = {};
    if (opts.includePlayer) {
      include.player = true;
    }
    if (opts.includeLeague) {
      include.league = true;
    }

    const orderBy: Prisma.LeagueMemberOrderByWithRelationInput = {};
    if (opts.sortBy) {
      orderBy[opts.sortBy] = opts.sortOrder || 'desc';
    } else {
      orderBy.joinedAt = 'desc';
    }

    const [members, total] = await Promise.all([
      this.prisma.leagueMember.findMany({
        where,
        include: Object.keys(include).length > 0 ? include : undefined,
        orderBy,
        skip,
        take: maxLimit,
      }),
      this.prisma.leagueMember.count({ where }),
    ]);

    return {
      data: members,
      total,
      page,
      limit: maxLimit,
    };
  }

  /**
   * Count active members in a league
   */
  async countActiveMembers(leagueId: string): Promise<number> {
    return this.prisma.leagueMember.count({
      where: {
        leagueId,
        status: 'ACTIVE',
      },
    });
  }

  /**
   * Create a new league member
   */
  async create(
    data: CreateLeagueMemberDto,
    tx?: Prisma.TransactionClient,
  ): Promise<LeagueMember> {
    const client = tx || this.prisma;
    return client.leagueMember.create({
      data: {
        playerId: data.playerId,
        leagueId: data.leagueId,
        status: data.status || 'ACTIVE',
        role: data.role || 'MEMBER',
        approvedBy: data.approvedBy,
        approvedAt: data.approvedBy ? new Date() : undefined,
        notes: data.notes,
      },
    });
  }

  /**
   * Update an existing league member
   */
  async update(
    id: string,
    data: UpdateLeagueMemberDto,
    tx?: Prisma.TransactionClient,
  ): Promise<LeagueMember> {
    const client = tx || this.prisma;
    return client.leagueMember.update({
      where: { id },
      data: {
        ...(data.status !== undefined && { status: data.status }),
        ...(data.role !== undefined && { role: data.role }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.approvedBy !== undefined && {
          approvedBy: data.approvedBy,
          approvedAt: data.approvedBy ? new Date() : undefined,
        }),
        // Handle leftAt: null clears the field, date string updates it, undefined is ignored
        ...(data.leftAt !== undefined && {
          leftAt: data.leftAt === null ? null : new Date(data.leftAt),
        }),
      },
    });
  }

  /**
   * Delete a league member (soft delete by setting leftAt)
   */
  async delete(id: string): Promise<LeagueMember> {
    return this.prisma.leagueMember.update({
      where: { id },
      data: {
        leftAt: new Date(),
        status: 'INACTIVE',
      },
    });
  }

  /**
   * Check if league member exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.leagueMember.count({
      where: { id },
    });
    return count > 0;
  }

  /**
   * Check if player is a member of league
   */
  async existsByPlayerAndLeague(
    playerId: string,
    leagueId: string,
  ): Promise<boolean> {
    const count = await this.prisma.leagueMember.count({
      where: {
        playerId,
        leagueId,
      },
    });
    return count > 0;
  }
}
