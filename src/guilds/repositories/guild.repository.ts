import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Guild, Prisma } from '@prisma/client';
import { CreateGuildDto } from '../dto/create-guild.dto';
import { UpdateGuildDto } from '../dto/update-guild.dto';
import { BaseRepository } from '../../common/repositories/base.repository.interface';
import {
  GuildQueryOptions,
  defaultGuildQueryOptions,
} from '../interfaces/guild-query.options';

/**
 * GuildRepository - Handles all database operations for Guild entity
 * Single Responsibility: Data access layer for Guild entity
 *
 * Separates data access concerns from business logic,
 * making services more focused and testable.
 */
@Injectable()
export class GuildRepository
  implements BaseRepository<Guild, CreateGuildDto, UpdateGuildDto>
{
  private readonly logger = new Logger(GuildRepository.name);

  constructor(private prisma: PrismaService) {}

  async findById(
    id: string,
    options?: GuildQueryOptions,
  ): Promise<Guild | null> {
    const opts = { ...defaultGuildQueryOptions, ...options };

    const include: Prisma.GuildInclude = {};

    // Note: Settings are NOT a Prisma relation and cannot be included in queries.
    // Settings must be fetched separately using GuildSettingsService.getSettings(guildId).
    // The includeSettings option is ignored for this reason.

    if (opts.includeMembers) {
      include.members = {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              globalName: true,
              avatar: true,
              lastLoginAt: true,
            },
          },
        },
        take: opts.membersLimit,
        orderBy: { joinedAt: 'desc' as const },
      };
    }

    if (opts.includeCount) {
      include._count = {
        select: { members: true },
      };
    }

    const guild = await this.prisma.guild.findUnique({
      where: { id },
      ...(Object.keys(include).length > 0 ? { include } : {}),
    });

    return guild;
  }

  async findOne(
    id: string,
    options?: GuildQueryOptions,
  ): Promise<Guild | null> {
    return this.findById(id, options);
  }

  async findAll(options?: {
    page?: number;
    limit?: number;
  }): Promise<{ data: Guild[]; total: number; page: number; limit: number }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 50;
    const skip = (page - 1) * limit;
    const maxLimit = Math.min(limit, 100);

    const [guilds, total] = await Promise.all([
      this.prisma.guild.findMany({
        where: { isActive: true },
        include: {
          _count: {
            select: { members: true },
          },
        },
        orderBy: { joinedAt: 'desc' },
        skip,
        take: maxLimit,
      }),
      this.prisma.guild.count({
        where: { isActive: true },
      }),
    ]);

    return {
      data: guilds,
      total,
      page,
      limit: maxLimit,
    };
  }

  /**
   * Create guild
   * Single Responsibility: Guild creation
   *
   * Note: Prefer createWithSettings() or upsertWithSettings() for guild creation
   * as they ensure settings are initialized atomically.
   */
  async create(data: CreateGuildDto): Promise<Guild> {
    return this.prisma.guild.create({ data });
  }

  async update(id: string, data: UpdateGuildDto): Promise<Guild> {
    return this.prisma.guild.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Guild> {
    return this.prisma.guild.delete({ where: { id } });
  }

  async exists(id: string): Promise<boolean> {
    const guild = await this.prisma.guild.findUnique({
      where: { id },
      select: { id: true },
    });
    return !!guild;
  }

  /**
   * Find active guild IDs
   * Repository-specific method for filtering
   */
  async findActiveGuildIds(): Promise<string[]> {
    const guilds = await this.prisma.guild.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    return guilds.map((g) => g.id);
  }

  /**
   * Create guild with default settings in a transaction
   * Single Responsibility: Atomic guild creation with settings initialization
   */
  async createWithSettings(
    guildData: CreateGuildDto,
    defaultSettings: Record<string, unknown>,
  ): Promise<Guild> {
    return this.prisma.$transaction(async (tx) => {
      // Create guild
      const guild = await tx.guild.create({
        data: guildData,
      });

      // Initialize default settings atomically
      await tx.settings.create({
        data: {
          ownerType: 'guild',
          ownerId: guild.id,
          settings: JSON.parse(
            JSON.stringify(defaultSettings),
          ) as Prisma.InputJsonValue,
        },
      });

      return guild;
    });
  }

  /**
   * Soft delete guild with cleanup in a transaction
   * Single Responsibility: Atomic guild deactivation with member updates
   */
  async removeWithCleanup(guildId: string): Promise<Guild> {
    return this.prisma.$transaction(async (tx) => {
      // Soft delete guild
      const updatedGuild = await tx.guild.update({
        where: { id: guildId },
        data: {
          isActive: false,
          leftAt: new Date(),
        },
      });

      // Optionally update all members (soft delete)
      await tx.guildMember.updateMany({
        where: { guildId },
        data: { updatedAt: new Date() },
      });

      return updatedGuild;
    });
  }

  /**
   * Upsert guild (create or update) with default settings in a transaction
   * Single Responsibility: Atomic guild upsert with settings initialization
   *
   * Creates guild if not exists, updates if exists.
   * Always ensures settings exist using idempotent upsert pattern.
   */
  async upsertWithSettings(
    guildData: CreateGuildDto,
    defaultSettings: Record<string, unknown>,
  ): Promise<Guild> {
    return this.prisma.$transaction(async (tx) => {
      // Upsert guild using Prisma's built-in upsert (cleaner than manual check/update/create)
      const guild = await tx.guild.upsert({
        where: { id: guildData.id },
        update: {
          name: guildData.name,
          icon: guildData.icon ?? null,
          ownerId: guildData.ownerId,
          memberCount: guildData.memberCount ?? 0,
          isActive: true, // Reactivate if it was soft-deleted
          leftAt: null, // Clear leftAt if it was set
        },
        create: guildData,
      });

      // Always ensure settings exist using idempotent upsert
      // This will create if missing, or no-op if they already exist
      await tx.settings.upsert({
        where: {
          ownerType_ownerId: {
            ownerType: 'guild',
            ownerId: guild.id,
          },
        },
        update: {}, // No-op if settings already exist
        create: {
          ownerType: 'guild',
          ownerId: guild.id,
          settings: JSON.parse(
            JSON.stringify(defaultSettings),
          ) as Prisma.InputJsonValue,
        },
      });

      return guild;
    });
  }
}
