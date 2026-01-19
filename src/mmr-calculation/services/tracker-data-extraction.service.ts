import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TrackerData } from './mmr-calculation.service';
import { PlaylistData } from '../../trackers/interfaces/scraper.interfaces';

/**
 * TrackerDataExtractionService - Single Responsibility: Extract tracker data for MMR calculation
 *
 * Extracts TrackerData from TrackerSeason records for use in MMR calculation.
 */
@Injectable()
export class TrackerDataExtractionService {
  private readonly logger = new Logger(TrackerDataExtractionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Extract TrackerData from latest TrackerSeason for a tracker
   * Single Responsibility: Data extraction from TrackerSeason
   *
   * @param trackerId - Tracker ID
   * @returns TrackerData or null if no season data available
   */
  async extractTrackerData(trackerId: string): Promise<TrackerData | null> {
    try {
      // Get latest season for the tracker
      const latestSeason = await this.prisma.trackerSeason.findFirst({
        where: { trackerId },
        orderBy: { seasonNumber: 'desc' },
      });

      if (!latestSeason) {
        this.logger.debug(`No season data found for tracker ${trackerId}`);
        return null;
      }

      // Extract playlist data from JSON fields
      const playlist1v1 = latestSeason.playlist1v1 as PlaylistData | null;
      const playlist2v2 = latestSeason.playlist2v2 as PlaylistData | null;
      const playlist3v3 = latestSeason.playlist3v3 as PlaylistData | null;
      const playlist4v4 = latestSeason.playlist4v4 as PlaylistData | null;

      return {
        ones: playlist1v1?.rating ?? undefined,
        twos: playlist2v2?.rating ?? undefined,
        threes: playlist3v3?.rating ?? undefined,
        fours: playlist4v4?.rating ?? undefined,
        onesGamesPlayed: playlist1v1?.matchesPlayed ?? undefined,
        twosGamesPlayed: playlist2v2?.matchesPlayed ?? undefined,
        threesGamesPlayed: playlist3v3?.matchesPlayed ?? undefined,
        foursGamesPlayed: playlist4v4?.matchesPlayed ?? undefined,
        onesPeak: playlist1v1?.allTimePeakRating ?? undefined,
        twosPeak: playlist2v2?.allTimePeakRating ?? undefined,
        threesPeak: playlist3v3?.allTimePeakRating ?? undefined,
        foursPeak: playlist4v4?.allTimePeakRating ?? undefined,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to extract tracker data for tracker ${trackerId}: ${errorMessage}`,
        error,
      );
      return null;
    }
  }
}
