import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Prisma,
  Tracker,
  GamePlatform,
  Game,
  TrackerSeason,
  TrackerScrapingStatus,
} from '@prisma/client';
import {
  TrackerQueryOptions,
  defaultTrackerQueryOptions,
} from '../interfaces/tracker-query.options';

@Injectable()
export class TrackerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    url: string;
    game: Game;
    platform: GamePlatform;
    username: string;
    userId: string;
    displayName?: string;
    registrationChannelId?: string;
    registrationInteractionToken?: string;
  }): Promise<Tracker> {
    return this.prisma.tracker.create({
      data,
    });
  }

  async findByUrl(url: string): Promise<Tracker | null> {
    return this.prisma.tracker.findUnique({
      where: { url },
    });
  }

  async findById(id: string): Promise<Tracker | null> {
    return this.prisma.tracker.findUnique({
      where: { id },
      include: {
        user: true,
        snapshots: {
          orderBy: { capturedAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  /**
   * Find all trackers for a user with optional filtering, sorting, and pagination
   * Single Responsibility: User tracker retrieval with query options
   *
   * @param userId - User ID to find trackers for
   * @param options - Query options for filtering, sorting, and pagination
   * @returns Paginated response with trackers data and pagination metadata
   */
  async findByUserId(
    userId: string,
    options?: TrackerQueryOptions,
  ): Promise<{
    data: Tracker[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const opts = { ...defaultTrackerQueryOptions, ...options };
    const page = opts.page;
    const limit = opts.limit;
    const maxLimit = Math.min(limit, 100);
    const skip = (page - 1) * maxLimit;

    const where: Prisma.TrackerWhereInput = {
      userId,
      isDeleted: false,
    };

    if (opts.platform) {
      if (Array.isArray(opts.platform)) {
        where.platform = { in: opts.platform };
      } else {
        where.platform = opts.platform;
      }
    }

    if (opts.status) {
      if (Array.isArray(opts.status)) {
        where.scrapingStatus = { in: opts.status };
      } else {
        where.scrapingStatus = opts.status;
      }
    }

    if (opts.isActive !== undefined) {
      where.isActive = opts.isActive;
    }
    const orderBy: Prisma.TrackerOrderByWithRelationInput = {};
    if (opts.sortBy) {
      orderBy[opts.sortBy] = opts.sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [trackers, total] = await Promise.all([
      this.prisma.tracker.findMany({
        where,
        orderBy,
        skip,
        take: maxLimit,
      }),
      this.prisma.tracker.count({ where }),
    ]);

    return {
      data: trackers,
      pagination: {
        page,
        limit: maxLimit,
        total,
        pages: maxLimit > 0 ? Math.ceil(total / maxLimit) : 0,
      },
    };
  }

  async findByGuildId(guildId: string): Promise<Tracker[]> {
    return this.prisma.tracker.findMany({
      where: {
        user: {
          guildMembers: {
            some: {
              guildId,
              isDeleted: false,
              isBanned: false,
            },
          },
        },
        isDeleted: false,
      },
      include: {
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find pending and stale trackers for a specific guild
   *
   * Returns trackers that are:
   * - Active and not deleted
   * - Not currently in progress
   * - Either pending (never scraped) OR stale (lastScrapedAt is null or older than refreshIntervalHours)
   * - Belong to users who are members of the specified guild
   *
   * @param guildId - Discord guild ID
   * @param refreshIntervalHours - Number of hours after which a tracker is considered stale
   * @returns Array of tracker objects with id field selected
   */
  async findPendingAndStaleForGuild(
    guildId: string,
    refreshIntervalHours: number,
  ): Promise<Array<{ id: string }>> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - refreshIntervalHours);

    return this.prisma.tracker.findMany({
      where: {
        isActive: true,
        isDeleted: false,
        scrapingStatus: {
          not: TrackerScrapingStatus.IN_PROGRESS,
        },
        OR: [
          { scrapingStatus: TrackerScrapingStatus.PENDING },
          { lastScrapedAt: null },
          { lastScrapedAt: { lt: cutoffTime } },
        ],
        user: {
          guildMembers: {
            some: {
              guildId,
              isDeleted: false,
              isBanned: false,
            },
          },
        },
      },
      select: {
        id: true,
      },
    });
  }

  async update(id: string, data: Prisma.TrackerUpdateInput): Promise<Tracker> {
    return this.prisma.tracker.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string): Promise<Tracker> {
    return this.prisma.tracker.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async checkUrlUniqueness(url: string): Promise<boolean> {
    const existing = await this.findByUrl(url);
    return existing === null;
  }

  /**
   * Find the best/most recent tracker from a user's active trackers
   * Selects tracker with:
   * 1. Most recent lastScrapedAt date
   * 2. Has season data available (preferred)
   *
   * @param userId - User ID to find trackers for
   * @returns Best tracker with seasons or null if no active trackers exist
   */
  async findBestForUser(
    userId: string,
  ): Promise<(Tracker & { seasons: TrackerSeason[] }) | null> {
    const trackerWithData = await this.prisma.tracker.findFirst({
      where: {
        userId,
        isActive: true,
        isDeleted: false,
        seasons: {
          some: {},
        },
      },
      include: {
        seasons: {
          orderBy: { seasonNumber: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastScrapedAt: 'desc' },
    });

    if (trackerWithData) {
      return trackerWithData;
    }

    // Fallback: return most recently scraped tracker (even without season data)
    // This handles cases where trackers exist but haven't been scraped yet
    return this.prisma.tracker.findFirst({
      where: {
        userId,
        isActive: true,
        isDeleted: false,
      },
      include: {
        seasons: {
          orderBy: { seasonNumber: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastScrapedAt: 'desc' },
    });
  }
}
