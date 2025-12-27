import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Prisma,
  Tracker,
  GamePlatform,
  Game,
  TrackerSeason,
} from '@prisma/client';

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

  async findByUserId(userId: string): Promise<Tracker[]> {
    return this.prisma.tracker.findMany({
      where: {
        userId,
        isDeleted: false,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByGuildId(guildId: string): Promise<Tracker[]> {
    // Get trackers for users who are members of this guild
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
    // First, try to find a tracker with season data, ordered by lastScrapedAt desc
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
          take: 1, // Only need latest season
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
