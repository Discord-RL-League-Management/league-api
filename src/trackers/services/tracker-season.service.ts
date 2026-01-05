import { Injectable, Logger } from '@nestjs/common';
import { TrackerSeason } from '@prisma/client';
import { SeasonData } from '../interfaces/scraper.interfaces';
import { TrackerSeasonRepository } from '../repositories/tracker-season.repository';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TrackerSeasonService {
  private readonly logger = new Logger(TrackerSeasonService.name);

  constructor(
    private readonly seasonRepository: TrackerSeasonRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Create or update a season for a tracker
   * Uses upsert to handle both new and existing seasons
   */
  async createOrUpdateSeason(
    trackerId: string,
    seasonData: SeasonData,
  ): Promise<TrackerSeason> {
    try {
      const season = await this.seasonRepository.upsert(trackerId, seasonData);

      this.logger.debug(
        `Upserted season ${seasonData.seasonNumber} for tracker ${trackerId}`,
      );

      return season;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
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
    return this.seasonRepository.findByTrackerId(trackerId);
  }

  /**
   * Delete all seasons for a tracker
   */
  async deleteSeasonsByTracker(trackerId: string): Promise<void> {
    await this.seasonRepository.deleteByTrackerId(trackerId);

    this.logger.debug(`Deleted all seasons for tracker ${trackerId}`);
  }

  /**
   * Get the latest season for a tracker
   */
  async getLatestSeason(trackerId: string): Promise<TrackerSeason | null> {
    return this.seasonRepository.findLatestByTrackerId(trackerId);
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
        await this.seasonRepository.bulkUpsert(trackerId, seasons, tx);
        return seasons.length;
      });

      this.logger.debug(
        `Bulk upserted ${result} seasons for tracker ${trackerId}`,
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to bulk upsert seasons: ${errorMessage}`,
        error,
      );
      throw error;
    }
  }
}
