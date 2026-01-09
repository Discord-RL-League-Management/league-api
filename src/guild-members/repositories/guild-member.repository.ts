import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GuildMember, Prisma } from '@prisma/client';
import { CreateGuildMemberDto } from '../dto/create-guild-member.dto';
import { UpdateGuildMemberDto } from '../dto/update-guild-member.dto';
import { BaseRepository } from '../../common/repositories/base.repository.interface';

/**
 * GuildMemberRepository - Handles all database operations for GuildMember entity
 * Single Responsibility: Data access layer for GuildMember entity
 *
 * Separates data access concerns from business logic,
 * making services more focused and testable.
 */
@Injectable()
export class GuildMemberRepository implements BaseRepository<
  GuildMember,
  CreateGuildMemberDto,
  UpdateGuildMemberDto
> {
  constructor(private prisma: PrismaService) {}

  /**
   * Find by composite key (userId + guildId)
   * This is the primary lookup method for GuildMember
   */
  async findByCompositeKey(
    userId: string,
    guildId: string,
    include?: {
      user?: boolean;
      guild?: boolean;
    },
  ): Promise<GuildMember | null> {
    const member = await this.prisma.guildMember.findUnique({
      where: {
        userId_guildId: {
          userId,
          guildId,
        },
      },
      include: include as Prisma.GuildMemberInclude | undefined,
    });

    return member;
  }

  /**
   * Find by ID (cuid primary key)
   */
  async findById(id: string): Promise<GuildMember | null> {
    return this.prisma.guildMember.findUnique({
      where: { id },
    });
  }

  /**
   * Find all members with optional pagination
   */
  async findAll(options?: { page?: number; limit?: number }): Promise<{
    data: GuildMember[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 50;
    const skip = (page - 1) * limit;
    const maxLimit = Math.min(limit, 100);

    const [members, total] = await Promise.all([
      this.prisma.guildMember.findMany({
        skip,
        take: maxLimit,
        orderBy: { joinedAt: 'desc' },
      }),
      this.prisma.guildMember.count(),
    ]);

    return {
      data: members,
      total,
      page,
      limit: maxLimit,
    };
  }

  /**
   * Find all members in a guild with pagination
   */
  async findByGuildId(
    guildId: string,
    options?: {
      page?: number;
      limit?: number;
      includeUser?: boolean;
    },
  ): Promise<{
    members: GuildMember[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 50;
    const skip = (page - 1) * limit;
    const maxLimit = Math.min(limit, 100);

    const include: Prisma.GuildMemberInclude = {};
    if (options?.includeUser) {
      include.user = {
        select: {
          id: true,
          username: true,
          globalName: true,
          avatar: true,
          lastLoginAt: true,
        },
      };
    }

    const [members, total] = await Promise.all([
      this.prisma.guildMember.findMany({
        where: { guildId },
        include: Object.keys(include).length > 0 ? include : undefined,
        orderBy: { joinedAt: 'desc' },
        skip,
        take: maxLimit,
      }),
      this.prisma.guildMember.count({
        where: { guildId },
      }),
    ]);

    return {
      members,
      pagination: {
        page,
        limit: maxLimit,
        total,
        pages: Math.ceil(total / maxLimit),
      },
    };
  }

  /**
   * Find all guild memberships for a user
   *
   * Note: Settings are NOT a Prisma relation and cannot be included.
   * Settings must be fetched separately using GuildSettingsService.getSettings(guildId).
   */
  async findByUserId(
    userId: string,
    include?: {
      guild?: boolean;
    },
  ): Promise<GuildMember[]> {
    return this.prisma.guildMember.findMany({
      where: { userId },
      include: include as Prisma.GuildMemberInclude | undefined,
      orderBy: { joinedAt: 'desc' },
    });
  }

  /**
   * Create a new guild member
   */
  async create(data: CreateGuildMemberDto): Promise<GuildMember> {
    return this.prisma.guildMember.create({
      data: {
        ...data,
        roles: data.roles || [],
      },
    });
  }

  /**
   * Upsert guild member (create or update)
   */
  async upsert(
    data: CreateGuildMemberDto,
    updateData?: Partial<UpdateGuildMemberDto>,
  ): Promise<GuildMember> {
    return this.prisma.guildMember.upsert({
      where: {
        userId_guildId: {
          userId: data.userId,
          guildId: data.guildId,
        },
      },
      update: {
        username: data.username,
        nickname: data.nickname ?? null,
        roles: data.roles || [],
        updatedAt: new Date(),
        ...updateData,
      },
      create: {
        ...data,
        roles: data.roles || [],
      },
    });
  }

  /**
   * Update guild member by composite key
   */
  async updateByCompositeKey(
    userId: string,
    guildId: string,
    data: UpdateGuildMemberDto,
  ): Promise<GuildMember> {
    return this.prisma.guildMember.update({
      where: {
        userId_guildId: {
          userId,
          guildId,
        },
      },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: { user: true },
    });
  }

  /**
   * Update by ID (cuid primary key)
   */
  async updateById(
    id: string,
    data: UpdateGuildMemberDto,
  ): Promise<GuildMember> {
    return this.prisma.guildMember.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Update entity by ID (BaseRepository interface compliance)
   */
  async update(id: string, data: UpdateGuildMemberDto): Promise<GuildMember> {
    return this.prisma.guildMember.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete guild member by composite key
   */
  async deleteByCompositeKey(userId: string, guildId: string): Promise<void> {
    await this.prisma.guildMember.delete({
      where: {
        userId_guildId: {
          userId,
          guildId,
        },
      },
    });
  }

  /**
   * Delete by ID (required by BaseRepository)
   */
  async deleteById(id: string): Promise<GuildMember> {
    return this.prisma.guildMember.delete({
      where: { id },
    });
  }

  /**
   * Delete entity by ID (BaseRepository interface compliance)
   */
  async delete(id: string): Promise<GuildMember> {
    return this.prisma.guildMember.delete({
      where: { id },
    });
  }

  /**
   * Check if member exists by composite key
   */
  async existsByCompositeKey(
    userId: string,
    guildId: string,
  ): Promise<boolean> {
    const member = await this.prisma.guildMember.findUnique({
      where: {
        userId_guildId: {
          userId,
          guildId,
        },
      },
      select: { id: true },
    });
    return !!member;
  }

  /**
   * Check if member exists by ID (required by BaseRepository)
   */
  async existsById(id: string): Promise<boolean> {
    const member = await this.prisma.guildMember.findUnique({
      where: { id },
      select: { id: true },
    });
    return !!member;
  }

  /**
   * Check if entity exists by ID (BaseRepository interface compliance)
   */
  async exists(id: string): Promise<boolean> {
    const member = await this.prisma.guildMember.findUnique({
      where: { id },
      select: { id: true },
    });
    return !!member;
  }

  /**
   * Find member with guild included
   *
   * Note: This method name is misleading - it does NOT include settings.
   * Settings are NOT a Prisma relation and must be fetched separately
   * using GuildSettingsService.getSettings(guildId).
   */
  async findWithGuildSettings(
    userId: string,
    guildId: string,
  ): Promise<Prisma.GuildMemberGetPayload<{
    include: { guild: true };
  }> | null> {
    return this.prisma.guildMember.findUnique({
      where: {
        userId_guildId: { userId, guildId },
      },
      include: {
        guild: true,
      },
    });
  }

  /**
   * Update member roles only
   */
  async updateRoles(
    userId: string,
    guildId: string,
    roles: string[],
  ): Promise<{ count: number }> {
    return this.prisma.guildMember.updateMany({
      where: { userId, guildId },
      data: {
        roles,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Count members with specific roles
   */
  async countMembersWithRoles(
    guildId: string,
    roleIds: string[],
  ): Promise<number> {
    return this.prisma.guildMember.count({
      where: {
        guildId,
        roles: {
          hasSome: roleIds,
        },
      },
    });
  }

  /**
   * Search guild members by username
   */
  async searchByUsername(
    guildId: string,
    query: string,
    options?: {
      page?: number;
      limit?: number;
      includeUser?: boolean;
    },
  ): Promise<{
    members: GuildMember[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const include: Prisma.GuildMemberInclude = {};
    if (options?.includeUser) {
      include.user = {
        select: {
          id: true,
          username: true,
          globalName: true,
          avatar: true,
          lastLoginAt: true,
        },
      };
    }

    const [members, total] = await Promise.all([
      this.prisma.guildMember.findMany({
        where: {
          guildId,
          OR: [{ username: { contains: query, mode: 'insensitive' } }],
        },
        include: Object.keys(include).length > 0 ? include : undefined,
        skip,
        take: limit,
        orderBy: { joinedAt: 'desc' },
      }),
      this.prisma.guildMember.count({
        where: {
          guildId,
          OR: [{ username: { contains: query, mode: 'insensitive' } }],
        },
      }),
    ]);

    return {
      members,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Delete all members for a guild (used in sync operations)
   */
  async deleteByGuildId(guildId: string): Promise<{ count: number }> {
    return this.prisma.guildMember.deleteMany({
      where: { guildId },
    });
  }

  /**
   * Create many members (used in sync operations)
   */
  async createMany(
    members: Array<{
      userId: string;
      guildId: string;
      username: string;
      nickname?: string;
      roles: string[];
    }>,
  ): Promise<{ count: number }> {
    return this.prisma.guildMember.createMany({
      data: members,
    });
  }

  /**
   * Sync guild members in a transaction
   */
  async syncMembers(
    guildId: string,
    members: Array<{
      userId: string;
      username: string;
      nickname?: string;
      roles: string[];
    }>,
  ): Promise<{ synced: number }> {
    return this.prisma.$transaction(async (tx) => {
      await tx.guildMember.deleteMany({
        where: { guildId },
      });

      const memberData = members.map((member) => ({
        userId: member.userId,
        guildId,
        username: member.username,
        nickname: member.nickname || null,
        roles: member.roles,
      }));

      await tx.guildMember.createMany({
        data: memberData,
      });

      return { synced: members.length };
    });
  }

  /**
   * Count members for statistics
   */
  async countStats(guildId: string): Promise<{
    totalMembers: number;
    activeMembers: number;
    newThisWeek: number;
  }> {
    const [totalMembers, activeMembers, newThisWeek] = await Promise.all([
      this.prisma.guildMember.count({ where: { guildId } }),
      this.prisma.guildMember.count({
        where: {
          guildId,
          updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.guildMember.count({
        where: {
          guildId,
          joinedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return {
      totalMembers,
      activeMembers,
      newThisWeek,
    };
  }
}
