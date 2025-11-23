import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TrackerSeason, Prisma } from '@prisma/client';
import { SeasonData } from '../interfaces/scraper.interfaces';

@Injectable()
export class TrackerSeasonService {
  private readonly logger = new Logger(TrackerSeasonService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create or update a season for a tracker
   * Uses upsert to handle both new and existing seasons
   */
  async createOrUpdateSeason(
    trackerId: string,
    seasonData: SeasonData,
  ): Promise<TrackerSeason> {
    try {
      const season = await this.prisma.trackerSeason.upsert({
        where: {
          trackerId_seasonNumber: {
            trackerId,
            seasonNumber: seasonData.seasonNumber,
          },
        },
        update: {
          seasonName: seasonData.seasonName,
          playlist1v1: (seasonData.playlist1v1 as unknown) as Prisma.InputJsonValue,
          playlist2v2: (seasonData.playlist2v2 as unknown) as Prisma.InputJsonValue,
          playlist3v3: (seasonData.playlist3v3 as unknown) as Prisma.InputJsonValue,
          playlist4v4: (seasonData.playlist4v4 as unknown) as Prisma.InputJsonValue,
          scrapedAt: new Date(),
          updatedAt: new Date(),
        },
        create: {
          trackerId,
          seasonNumber: seasonData.seasonNumber,
          seasonName: seasonData.seasonName,
          playlist1v1: (seasonData.playlist1v1 as unknown) as Prisma.InputJsonValue,
          playlist2v2: (seasonData.playlist2v2 as unknown) as Prisma.InputJsonValue,
          playlist3v3: (seasonData.playlist3v3 as unknown) as Prisma.InputJsonValue,
          playlist4v4: (seasonData.playlist4v4 as unknown) as Prisma.InputJsonValue,
          scrapedAt: new Date(),
        },
      });

      this.logger.debug(
        `Upserted season ${seasonData.seasonNumber} for tracker ${trackerId}`,
      );

      return season;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to create/update season: ${errorMessage}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get all seasons for a tracker, ordered by season number descending (newest first)
   */
  async getSeasonsByTracker(trackerId: string): Promise<TrackerSeason[]> {
    return this.prisma.trackerSeason.findMany({
      where: { trackerId },
      orderBy: { seasonNumber: 'desc' },
    });
  }

  /**
   * Delete all seasons for a tracker
   */
  async deleteSeasonsByTracker(trackerId: string): Promise<void> {
    await this.prisma.trackerSeason.deleteMany({
      where: { trackerId },
    });

    this.logger.debug(`Deleted all seasons for tracker ${trackerId}`);
  }

  /**
   * Get the latest season for a tracker
   */
  async getLatestSeason(trackerId: string): Promise<TrackerSeason | null> {
    return this.prisma.trackerSeason.findFirst({
      where: { trackerId },
      orderBy: { seasonNumber: 'desc' },
    });
  }

  /**
   * Bulk create/update seasons in a transaction
   */
  async bulkUpsertSeasons(
    trackerId: string,
    seasons: SeasonData[],
  ): Promise<number> {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const upsertPromises = seasons.map((seasonData) =>
          tx.trackerSeason.upsert({
            where: {
              trackerId_seasonNumber: {
                trackerId,
                seasonNumber: seasonData.seasonNumber,
              },
            },
            update: {
              seasonName: seasonData.seasonName,
              playlist1v1: (seasonData.playlist1v1 as unknown) as Prisma.InputJsonValue,
              playlist2v2: (seasonData.playlist2v2 as unknown) as Prisma.InputJsonValue,
              playlist3v3: (seasonData.playlist3v3 as unknown) as Prisma.InputJsonValue,
              playlist4v4: (seasonData.playlist4v4 as unknown) as Prisma.InputJsonValue,
              scrapedAt: new Date(),
              updatedAt: new Date(),
            },
            create: {
              trackerId,
              seasonNumber: seasonData.seasonNumber,
              seasonName: seasonData.seasonName,
              playlist1v1: (seasonData.playlist1v1 as unknown) as Prisma.InputJsonValue,
              playlist2v2: (seasonData.playlist2v2 as unknown) as Prisma.InputJsonValue,
              playlist3v3: (seasonData.playlist3v3 as unknown) as Prisma.InputJsonValue,
              playlist4v4: (seasonData.playlist4v4 as unknown) as Prisma.InputJsonValue,
              scrapedAt: new Date(),
            },
          }),
        );

        await Promise.all(upsertPromises);
        return seasons.length;
      });

      this.logger.debug(
        `Bulk upserted ${result} seasons for tracker ${trackerId}`,
      );

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to bulk upsert seasons: ${errorMessage}`,
        error,
      );
      throw error;
    }
  }
}

