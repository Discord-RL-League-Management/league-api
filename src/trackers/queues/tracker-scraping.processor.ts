import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TrackerScrapingStatus } from '@prisma/client';
import { TRACKER_SCRAPING_QUEUE } from './tracker-scraping.queue';
import { ScrapingJobData, ScrapingJobResult } from './tracker-scraping.interfaces';
import { TrackerScraperService } from '../services/tracker-scraper.service';
import { TrackerSeasonService } from '../services/tracker-season.service';
import { TrackerService } from '../services/tracker.service';
import { TrackerNotificationService } from '../services/tracker-notification.service';

@Processor(TRACKER_SCRAPING_QUEUE)
@Injectable()
export class TrackerScrapingProcessor extends WorkerHost {
  private readonly logger = new Logger(TrackerScrapingProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scraperService: TrackerScraperService,
    private readonly seasonService: TrackerSeasonService,
    private readonly trackerService: TrackerService,
    private readonly notificationService: TrackerNotificationService,
  ) {
    super();
  }

  async process(job: Job<ScrapingJobData>): Promise<ScrapingJobResult> {
    const { trackerId } = job.data;
    this.logger.log(`Processing scraping job for tracker ${trackerId}`);

    let scrapingLogId: string | null = null;
    let tracker: { id: string; url: string; userId: string } | null = null;

    try {
      // Get tracker to find the URL
      tracker = await this.prisma.tracker.findUnique({
        where: { id: trackerId },
        select: { id: true, url: true, userId: true },
      });

      if (!tracker) {
        throw new Error(`Tracker ${trackerId} not found`);
      }

      // Create scraping log entry
      const scrapingLog = await this.prisma.trackerScrapingLog.create({
        data: {
          trackerId,
          status: TrackerScrapingStatus.IN_PROGRESS,
          seasonsScraped: 0,
          seasonsFailed: 0,
          startedAt: new Date(),
        },
      });
      scrapingLogId = scrapingLog.id;

      // Update tracker status to IN_PROGRESS
      await this.prisma.tracker.update({
        where: { id: trackerId },
        data: {
          scrapingStatus: TrackerScrapingStatus.IN_PROGRESS,
          scrapingError: null,
        },
      });

      // Scrape all seasons
      const seasons = await this.scraperService.scrapeAllSeasons(tracker.url);

      // Handle case where no seasons were found
      if (!seasons || seasons.length === 0) {
        this.logger.warn(`No seasons found for tracker ${trackerId}`);
        // Update tracker status to COMPLETED with 0 seasons
        await this.prisma.tracker.update({
          where: { id: trackerId },
          data: {
            scrapingStatus: TrackerScrapingStatus.COMPLETED,
            lastScrapedAt: new Date(),
            scrapingError: null,
            scrapingAttempts: 0,
          },
        });

        // Update scraping log
        if (scrapingLogId) {
          await this.prisma.trackerScrapingLog.update({
            where: { id: scrapingLogId },
            data: {
              status: TrackerScrapingStatus.COMPLETED,
              seasonsScraped: 0,
              seasonsFailed: 0,
              completedAt: new Date(),
            },
          });
        }

        // Send notification (non-blocking)
        this.notificationService
          .sendScrapingCompleteNotification(trackerId, tracker.userId, 0, 0)
          .catch((err) => {
            const errorMessage = err instanceof Error ? err.message : String(err);
            this.logger.warn(`Failed to send success notification: ${errorMessage}`);
          });

        return {
          success: true,
          seasonsScraped: 0,
          seasonsFailed: 0,
        };
      }

      // Store season data
      let seasonsScraped = 0;
      let seasonsFailed = 0;

      for (const seasonData of seasons) {
        try {
          await this.seasonService.createOrUpdateSeason(trackerId, seasonData);
          seasonsScraped++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Failed to store season ${seasonData.seasonNumber}: ${errorMessage}`,
          );
          seasonsFailed++;
        }
      }

      // Update tracker status to COMPLETED
      await this.prisma.tracker.update({
        where: { id: trackerId },
        data: {
          scrapingStatus: TrackerScrapingStatus.COMPLETED,
          lastScrapedAt: new Date(),
          scrapingError: null,
          scrapingAttempts: 0, // Reset attempts on success
        },
      });

      // Update scraping log
      await this.prisma.trackerScrapingLog.update({
        where: { id: scrapingLogId },
        data: {
          status: TrackerScrapingStatus.COMPLETED,
          seasonsScraped,
          seasonsFailed,
          completedAt: new Date(),
        },
      });

      this.logger.log(
        `Successfully scraped tracker ${trackerId}: ${seasonsScraped} seasons scraped, ${seasonsFailed} failed`,
      );

      // Send success notification (non-blocking)
      this.notificationService
        .sendScrapingCompleteNotification(trackerId, tracker.userId, seasonsScraped, seasonsFailed)
        .catch((err) => {
          const errorMessage = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Failed to send success notification: ${errorMessage}`);
        });

      return {
        success: true,
        seasonsScraped,
        seasonsFailed,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to scrape tracker ${trackerId}: ${errorMessage}`,
        error,
      );

      // Update tracker status to FAILED
      await this.prisma.tracker.update({
        where: { id: trackerId },
        data: {
          scrapingStatus: TrackerScrapingStatus.FAILED,
          scrapingError: errorMessage,
          scrapingAttempts: {
            increment: 1,
          },
        },
      });

      // Update scraping log if it was created
      if (scrapingLogId) {
        await this.prisma.trackerScrapingLog.update({
          where: { id: scrapingLogId },
          data: {
            status: TrackerScrapingStatus.FAILED,
            errorMessage: errorMessage.substring(0, 1000), // Limit error message length
            completedAt: new Date(),
          },
        });
      }

      // Send failure notification (non-blocking)
      if (tracker) {
        this.notificationService
          .sendScrapingFailedNotification(trackerId, tracker.userId, errorMessage)
          .catch((err) => {
            this.logger.warn(`Failed to send failure notification: ${err.message}`);
          });
      }

      return {
        success: false,
        seasonsScraped: 0,
        seasonsFailed: 0,
        error: errorMessage,
      };
    }
  }
}

