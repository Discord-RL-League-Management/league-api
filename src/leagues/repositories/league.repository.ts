import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { League, Prisma, LeagueStatus, Game } from '@prisma/client';
import { CreateLeagueDto } from '../dto/create-league.dto';
import { UpdateLeagueDto } from '../dto/update-league.dto';
import { BaseRepository } from '../../common/repositories/base.repository.interface';
import {
  LeagueQueryOptions,
  defaultLeagueQueryOptions,
} from '../interfaces/league-query.options';

/**
 * LeagueRepository - Handles all database operations for League entity
 * Single Responsibility: Data access layer for League entity
 *
 * Separates data access concerns from business logic,
 * making services more focused and testable.
 */
@Injectable()
export class LeagueRepository
  implements
    BaseRepository<
      League,
      CreateLeagueDto & { createdBy: string },
      UpdateLeagueDto
    >
{
  private readonly logger = new Logger(LeagueRepository.name);

  constructor(private prisma: PrismaService) {}

  async findById(
    id: string,
    options?: LeagueQueryOptions,
    tx?: Prisma.TransactionClient,
  ): Promise<League | null> {
    const opts = { ...defaultLeagueQueryOptions, ...options };
    const client = tx || this.prisma;

    const include: Prisma.LeagueInclude = {};

    // Note: Settings are NOT a Prisma relation and cannot be included in queries.
    // Settings must be fetched separately using LeagueSettingsService.getSettings(leagueId).

    if (opts.includeGuild) {
      include.guild = true;
    }

    if (opts.includeMembers) {
      (include as Record<string, unknown>).leagueMembers = {
        where: { status: 'ACTIVE' },
        include: { player: true },
      };
    }
    if (opts.includeTeams) {
      (include as Record<string, unknown>).teams = {
        include: { members: { where: { status: 'ACTIVE' } } },
      };
    }
    if (opts.includeTournaments) {
      (include as Record<string, unknown>).tournaments = true;
    }

    const league = await client.league.findUnique({
      where: { id },
      ...(Object.keys(include).length > 0 ? { include } : {}),
    });

    return league;
  }

  async findOne(
    id: string,
    options?: LeagueQueryOptions,
  ): Promise<League | null> {
    return this.findById(id, options);
  }

  async findAll(options?: {
    page?: number;
    limit?: number;
    guildId?: string;
    status?: string | string[];
    game?: string | string[];
  }): Promise<{ data: League[]; total: number; page: number; limit: number }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 50;
    const skip = (page - 1) * limit;
    const maxLimit = Math.min(limit, 100);

    const where: Prisma.LeagueWhereInput = {};

    if (options?.guildId) {
      where.guildId = options.guildId;
    }

    if (options?.status) {
      if (Array.isArray(options.status)) {
        where.status = { in: options.status as LeagueStatus[] };
      } else {
        where.status = options.status as LeagueStatus;
      }
    }

    if (options?.game) {
      if (Array.isArray(options.game)) {
        where.game = { in: options.game as Game[] };
      } else {
        where.game = options.game as Game;
      }
    }

    const include: Prisma.LeagueInclude = {
      guild: {
        select: {
          id: true,
          name: true,
          icon: true,
        },
      },
    };

    const [leagues, total] = await Promise.all([
      this.prisma.league.findMany({
        where,
        include,
        orderBy: { createdAt: 'desc' },
        skip,
        take: maxLimit,
      }),
      this.prisma.league.count({ where }),
    ]);

    return {
      data: leagues,
      total,
      page,
      limit: maxLimit,
    };
  }

  /**
   * Find leagues by guild ID
   * Repository-specific method for filtering
   */
  async findByGuild(
    guildId: string,
    options?: LeagueQueryOptions,
  ): Promise<{ data: League[]; total: number; page: number; limit: number }> {
    return this.findAll({
      ...options,
      guildId,
    });
  }

  /**
   * Find leagues by game
   * Repository-specific method for filtering
   */
  async findByGame(
    guildId: string,
    game: string,
    options?: LeagueQueryOptions,
  ): Promise<{ data: League[]; total: number; page: number; limit: number }> {
    return this.findAll({
      ...options,
      guildId,
      game,
    });
  }

  /**
   * Create league
   * Single Responsibility: League creation
   *
   * Note: Prefer createWithSettings() for league creation
   * as it ensures settings are initialized atomically.
   */
  async create(data: CreateLeagueDto & { createdBy: string }): Promise<League> {
    return this.prisma.league.create({ data });
  }

  async update(id: string, data: UpdateLeagueDto): Promise<League> {
    return this.prisma.league.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<League> {
    return this.prisma.league.delete({ where: { id } });
  }

  async exists(id: string): Promise<boolean> {
    const league = await this.prisma.league.findUnique({
      where: { id },
      select: { id: true },
    });
    return !!league;
  }

  /**
   * Create league with default settings in a transaction
   * Single Responsibility: Atomic league creation with settings initialization
   */
  async createWithSettings(
    leagueData: CreateLeagueDto & { createdBy: string },
    settingsData: Prisma.InputJsonValue,
    tx?: Prisma.TransactionClient,
  ): Promise<League> {
    if (tx) {
      // If transaction client provided, use it directly
      const league = await tx.league.create({
        data: leagueData,
      });

      await tx.settings.upsert({
        where: {
          ownerType_ownerId: {
            ownerType: 'league',
            ownerId: league.id,
          },
        },
        create: {
          ownerType: 'league',
          ownerId: league.id,
          settings: settingsData,
          schemaVersion: 1,
        },
        update: {
          settings: settingsData,
        },
      });

      return league;
    }

    // Otherwise, create a new transaction
    return this.prisma.$transaction(async (transaction) => {
      const league = await transaction.league.create({
        data: leagueData,
      });

      await transaction.settings.upsert({
        where: {
          ownerType_ownerId: {
            ownerType: 'league',
            ownerId: league.id,
          },
        },
        create: {
          ownerType: 'league',
          ownerId: league.id,
          settings: settingsData,
          schemaVersion: 1,
        },
        update: {
          settings: settingsData,
        },
      });

      return league;
    });
  }

  /**
   * Find leagues by status
   * Repository-specific method for filtering
   */
  async findByStatus(
    guildId: string,
    status: string,
    options?: LeagueQueryOptions,
  ): Promise<{ data: League[]; total: number; page: number; limit: number }> {
    return this.findAll({
      ...options,
      guildId,
      status: [status],
    });
  }
}
