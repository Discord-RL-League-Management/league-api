import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Prisma,
  Tracker,
  GamePlatform,
  Game,
  TrackerSeason,
  TrackerScrapingStatus,
  TrackerScrapingLog,
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

  /**
   * Find all trackers with admin filters (for admin endpoints)
   * Single Responsibility: Admin tracker retrieval with filtering
   */
  async findAllAdmin(options?: {
    status?: TrackerScrapingStatus;
    platform?: GamePlatform;
    page?: number;
    limit?: number;
  }): Promise<{
    data: Array<
      Tracker & {
        user: {
          id: string;
          username: string;
          globalName: string | null;
        };
        seasons: Array<{ seasonNumber: number }>;
      }
    >;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 50;
    const skip = (page - 1) * limit;
    const take = limit;

    const where: Prisma.TrackerWhereInput = {
      isDeleted: false,
      ...(options?.status && { scrapingStatus: options.status }),
      ...(options?.platform && { platform: options.platform }),
    };

    const [trackers, total] = await Promise.all([
      this.prisma.tracker.findMany({
        where,
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              globalName: true,
            },
          },
          seasons: {
            orderBy: { seasonNumber: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tracker.count({ where }),
    ]);

    return {
      data: trackers,
      pagination: {
        page,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  /**
   * Get scraping status overview (grouped by status)
   * Single Responsibility: Admin status aggregation
   */
  async getScrapingStatusOverview(): Promise<{
    total: number;
    byStatus: Record<string, number>;
  }> {
    const statusCounts = await this.prisma.tracker.groupBy({
      by: ['scrapingStatus'],
      where: {
        isDeleted: false,
      },
      _count: {
        id: true,
      },
    });

    const total = await this.prisma.tracker.count({
      where: { isDeleted: false },
    });

    const statusMap = statusCounts.reduce(
      (acc, item) => {
        acc[item.scrapingStatus] = item._count.id;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      total,
      byStatus: {
        PENDING: statusMap.PENDING || 0,
        IN_PROGRESS: statusMap.IN_PROGRESS || 0,
        COMPLETED: statusMap.COMPLETED || 0,
        FAILED: statusMap.FAILED || 0,
      },
    };
  }

  /**
   * Find scraping logs with filters
   * Single Responsibility: Scraping log retrieval
   */
  async findScrapingLogs(options?: {
    trackerId?: string;
    status?: TrackerScrapingStatus;
    page?: number;
    limit?: number;
  }): Promise<{
    data: Array<
      TrackerScrapingLog & {
        tracker: {
          id: string;
          url: string;
          username: string;
          platform: GamePlatform;
        };
      }
    >;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 50;
    const skip = (page - 1) * limit;
    const take = limit;

    const where: Prisma.TrackerScrapingLogWhereInput = {
      ...(options?.trackerId && { trackerId: options.trackerId }),
      ...(options?.status && { status: options.status }),
    };

    const [logs, total] = await Promise.all([
      this.prisma.trackerScrapingLog.findMany({
        where,
        skip,
        take,
        include: {
          tracker: {
            select: {
              id: true,
              url: true,
              username: true,
              platform: true,
            },
          },
        },
        orderBy: { startedAt: 'desc' },
      }),
      this.prisma.trackerScrapingLog.count({ where }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  /**
   * Find trackers by multiple URLs (for batch uniqueness checks)
   */
  async findByUrls(
    urls: string[],
  ): Promise<Array<{ url: string; id: string }>> {
    if (urls.length === 0) {
      return [];
    }
    return this.prisma.tracker.findMany({
      where: {
        url: { in: urls },
      },
      select: {
        url: true,
        id: true,
      },
    });
  }

  /**
   * Find all pending and stale trackers across all guilds
   * Used for scheduled refresh operations
   */
  async findPendingAndStale(
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
      },
      select: {
        id: true,
      },
    });
  }

  /**
   * Find all pending trackers (for batch processing)
   */
  async findPending(): Promise<Array<{ id: string }>> {
    return this.prisma.tracker.findMany({
      where: {
        scrapingStatus: TrackerScrapingStatus.PENDING,
        isActive: true,
        isDeleted: false,
      },
      select: {
        id: true,
      },
    });
  }

  /**
   * Find trackers by IDs with userId selection (for batch processing checks)
   */
  async findByIdsWithUserId(
    trackerIds: string[],
  ): Promise<Array<{ id: string; userId: string }>> {
    if (trackerIds.length === 0) {
      return [];
    }
    return this.prisma.tracker.findMany({
      where: {
        id: { in: trackerIds },
      },
      select: {
        id: true,
        userId: true,
      },
    });
  }

  /**
   * Find tracker by ID with only userId selection (for lightweight checks)
   */
  async findUserIdById(trackerId: string): Promise<string | null> {
    const tracker = await this.prisma.tracker.findUnique({
      where: { id: trackerId },
      select: { userId: true },
    });
    return tracker?.userId || null;
  }
}
