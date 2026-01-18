import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Player, Prisma, PlayerStatus } from '@prisma/client';
import { CreatePlayerDto } from '../dto/create-player.dto';
import { UpdatePlayerDto } from '../dto/update-player.dto';
import { BaseRepository } from '../../common/repositories/base.repository.interface';
import {
  PlayerQueryOptions,
  defaultPlayerQueryOptions,
} from '../interfaces/player.interface';

/**
 * PlayerRepository - Handles all database operations for Player entity
 * Single Responsibility: Data access layer for Player entity
 *
 * Separates data access concerns from business logic,
 * making services more focused and testable.
 */
@Injectable()
export class PlayerRepository implements BaseRepository<
  Player,
  CreatePlayerDto,
  UpdatePlayerDto
> {
  private readonly logger = new Logger(PlayerRepository.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Find by ID (cuid primary key)
   */
  async findById(
    id: string,
    options?: PlayerQueryOptions,
    tx?: Prisma.TransactionClient,
  ): Promise<Player | null> {
    const opts = { ...defaultPlayerQueryOptions, ...options };
    const client = tx || this.prisma;

    const include: Prisma.PlayerInclude = {};
    if (opts.includeUser) {
      include.guildMember = {
        include: {
          user: true,
        },
      };
    }
    if (opts.includeGuild) {
      include.guild = true;
    }

    return client.player.findUnique({
      where: { id },
      include: Object.keys(include).length > 0 ? include : undefined,
    });
  }

  /**
   * Find all players with optional pagination
   */
  async findAll(options?: {
    page?: number;
    limit?: number;
  }): Promise<{ data: Player[]; total: number; page: number; limit: number }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 50;
    const skip = (page - 1) * limit;
    const maxLimit = Math.min(limit, 100);

    const [players, total] = await Promise.all([
      this.prisma.player.findMany({
        skip,
        take: maxLimit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.player.count(),
    ]);

    return {
      data: players,
      total,
      page,
      limit: maxLimit,
    };
  }

  /**
   * Find by composite key (userId + guildId)
   * This is the primary lookup method for Player
   */
  async findByUserIdAndGuildId(
    userId: string,
    guildId: string,
    options?: PlayerQueryOptions,
    tx?: Prisma.TransactionClient,
  ): Promise<Player | null> {
    const opts = { ...defaultPlayerQueryOptions, ...options };
    const client = tx || this.prisma;

    const include: Prisma.PlayerInclude = {};
    if (opts.includeUser) {
      include.guildMember = {
        include: {
          user: true,
        },
      };
    }
    if (opts.includeGuild) {
      include.guild = true;
    }

    // First find GuildMember by (userId, guildId) to get guildMemberId
    const guildMember = await client.guildMember.findUnique({
      where: {
        userId_guildId: {
          userId,
          guildId,
        },
      },
    });

    if (!guildMember) {
      return null;
    }

    // Then find Player using the unique constraint (userId, guildMemberId)
    return client.player.findUnique({
      where: {
        userId_guildMemberId: {
          userId,
          guildMemberId: guildMember.id,
        },
      },
      include: Object.keys(include).length > 0 ? include : undefined,
    });
  }

  /**
   * Find all players in a guild with optional filtering
   */
  async findByGuildId(
    guildId: string,
    options?: PlayerQueryOptions,
  ): Promise<{ data: Player[]; total: number; page: number; limit: number }> {
    const opts = { ...defaultPlayerQueryOptions, ...options };
    const page = opts.page ?? 1;
    const limit = opts.limit ?? 50;
    const skip = (page - 1) * limit;
    const maxLimit = Math.min(limit, 100);

    const where: Prisma.PlayerWhereInput = {
      guildId,
    };

    if (opts.status) {
      if (Array.isArray(opts.status)) {
        where.status = { in: opts.status as PlayerStatus[] };
      } else {
        where.status = opts.status as PlayerStatus;
      }
    }

    const include: Prisma.PlayerInclude = {};
    if (opts.includeUser) {
      include.guildMember = {
        include: {
          user: true,
        },
      };
    }
    if (opts.includeGuild) {
      include.guild = true;
    }

    const orderBy: Prisma.PlayerOrderByWithRelationInput = {};
    if (opts.sortBy) {
      orderBy[opts.sortBy] = opts.sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [players, total] = await Promise.all([
      this.prisma.player.findMany({
        where,
        include: Object.keys(include).length > 0 ? include : undefined,
        orderBy,
        skip,
        take: maxLimit,
      }),
      this.prisma.player.count({ where }),
    ]);

    return {
      data: players,
      total,
      page,
      limit: maxLimit,
    };
  }

  /**
   * Find all players for a user across all guilds
   */
  async findByUserId(
    userId: string,
    options?: PlayerQueryOptions,
  ): Promise<{ data: Player[]; total: number; page: number; limit: number }> {
    const opts = { ...defaultPlayerQueryOptions, ...options };
    const page = opts.page ?? 1;
    const limit = opts.limit ?? 50;
    const skip = (page - 1) * limit;
    const maxLimit = Math.min(limit, 100);

    const where: Prisma.PlayerWhereInput = {
      userId,
    };

    if (opts.status) {
      if (Array.isArray(opts.status)) {
        where.status = { in: opts.status as PlayerStatus[] };
      } else {
        where.status = opts.status as PlayerStatus;
      }
    }

    const include: Prisma.PlayerInclude = {};
    if (opts.includeUser) {
      include.guildMember = {
        include: {
          user: true,
        },
      };
    }
    if (opts.includeGuild) {
      include.guild = true;
    }

    const orderBy: Prisma.PlayerOrderByWithRelationInput = {};
    if (opts.sortBy) {
      orderBy[opts.sortBy] = opts.sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [players, total] = await Promise.all([
      this.prisma.player.findMany({
        where,
        include: Object.keys(include).length > 0 ? include : undefined,
        orderBy,
        skip,
        take: maxLimit,
      }),
      this.prisma.player.count({ where }),
    ]);

    return {
      data: players,
      total,
      page,
      limit: maxLimit,
    };
  }

  /**
   * Create a new player
   * Note: guildMemberId must be provided by the service layer
   * The service layer should look up GuildMember from userId/guildId and pass guildMemberId here
   */
  async create(
    data: CreatePlayerDto & { guildMemberId: string },
    tx?: Prisma.TransactionClient,
  ): Promise<Player> {
    const client = tx || this.prisma;
    return client.player.create({
      data: {
        userId: data.userId,
        guildId: data.guildId,
        guildMemberId: data.guildMemberId,
        status: data.status || 'ACTIVE',
      },
    });
  }

  /**
   * Update an existing player
   */
  async update(
    id: string,
    data: UpdatePlayerDto,
    tx?: Prisma.TransactionClient,
  ): Promise<Player> {
    const client = tx || this.prisma;
    return client.player.update({
      where: { id },
      data: {
        ...(data.status !== undefined && { status: data.status }),
      },
    });
  }

  /**
   * Delete a player
   */
  async delete(id: string): Promise<Player> {
    return this.prisma.player.delete({
      where: { id },
    });
  }

  /**
   * Check if player exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.player.count({
      where: { id },
    });
    return count > 0;
  }

  /**
   * Update cooldown tracking
   */
  async updateCooldown(
    id: string,
    lastLeftLeagueAt: Date,
    lastLeftLeagueId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Player> {
    const client = tx || this.prisma;
    return client.player.update({
      where: { id },
      data: {
        lastLeftLeagueAt,
        lastLeftLeagueId,
      },
    });
  }
}
