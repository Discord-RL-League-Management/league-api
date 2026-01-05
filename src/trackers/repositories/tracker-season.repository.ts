import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TrackerSeason, Prisma } from '@prisma/client';
import { SeasonData } from '../interfaces/scraper.interfaces';

/**
 * TrackerSeasonRepository - Handles all database operations for TrackerSeason entity
 * Single Responsibility: Data access layer for TrackerSeason entity
 */
@Injectable()
export class TrackerSeasonRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upsert a season (create or update)
   */
  async upsert(
    trackerId: string,
    seasonData: SeasonData,
    tx?: Prisma.TransactionClient,
  ): Promise<TrackerSeason> {
    const client = tx || this.prisma;
    return client.trackerSeason.upsert({
      where: {
        trackerId_seasonNumber: {
          trackerId,
          seasonNumber: seasonData.seasonNumber,
        },
      },
      update: {
        seasonName: seasonData.seasonName,
        playlist1v1: seasonData.playlist1v1 as unknown as Prisma.InputJsonValue,
        playlist2v2: seasonData.playlist2v2 as unknown as Prisma.InputJsonValue,
        playlist3v3: seasonData.playlist3v3 as unknown as Prisma.InputJsonValue,
        playlist4v4: seasonData.playlist4v4 as unknown as Prisma.InputJsonValue,
        scrapedAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        trackerId,
        seasonNumber: seasonData.seasonNumber,
        seasonName: seasonData.seasonName,
        playlist1v1: seasonData.playlist1v1 as unknown as Prisma.InputJsonValue,
        playlist2v2: seasonData.playlist2v2 as unknown as Prisma.InputJsonValue,
        playlist3v3: seasonData.playlist3v3 as unknown as Prisma.InputJsonValue,
        playlist4v4: seasonData.playlist4v4 as unknown as Prisma.InputJsonValue,
        scrapedAt: new Date(),
      },
    });
  }

  /**
   * Find all seasons for a tracker
   */
  async findByTrackerId(
    trackerId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<TrackerSeason[]> {
    const client = tx || this.prisma;
    return client.trackerSeason.findMany({
      where: { trackerId },
      orderBy: { seasonNumber: 'desc' },
    });
  }

  /**
   * Delete all seasons for a tracker
   */
  async deleteByTrackerId(
    trackerId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx || this.prisma;
    await client.trackerSeason.deleteMany({
      where: { trackerId },
    });
  }

  /**
   * Get the latest season for a tracker
   */
  async findLatestByTrackerId(
    trackerId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<TrackerSeason | null> {
    const client = tx || this.prisma;
    return client.trackerSeason.findFirst({
      where: { trackerId },
      orderBy: { seasonNumber: 'desc' },
    });
  }

  /**
   * Bulk upsert seasons (for use within transactions)
   */
  async bulkUpsert(
    trackerId: string,
    seasons: SeasonData[],
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const upsertPromises = seasons.map((seasonData) =>
      this.upsert(trackerId, seasonData, tx),
    );
    await Promise.all(upsertPromises);
  }
}
