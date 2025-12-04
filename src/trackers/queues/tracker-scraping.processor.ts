import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TrackerScrapingStatus } from '@prisma/client';
import { TRACKER_SCRAPING_QUEUE } from './tracker-scraping.queue';
import {
  ScrapingJobData,
  ScrapingJobResult,
} from './tracker-scraping.interfaces';
import { TrackerScraperService } from '../services/tracker-scraper.service';
import { TrackerSeasonService } from '../services/tracker-season.service';
import { TrackerService } from '../services/tracker.service';
import { TrackerNotificationService } from '../services/tracker-notification.service';
import { ActivityLogService } from '../../infrastructure/activity-log/services/activity-log.service';
import { MmrCalculationIntegrationService } from '../../mmr-calculation/services/mmr-calculation-integration.service';

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
    private readonly activityLogService: ActivityLogService,
    private readonly mmrCalculationIntegration: MmrCalculationIntegrationService,
  ) {
    super();
  }

  async process(job: Job<ScrapingJobData>): Promise<ScrapingJobResult> {
    const { trackerId } = job.data;
    this.logger.log(`Processing scraping job for tracker ${trackerId}`);

    let scrapingLogId: string | null = null;
    let tracker: { id: string; url: string; userId: string } | null = null;

    try {
      tracker = await this.prisma.tracker.findUnique({
        where: { id: trackerId },
        select: { id: true, url: true, userId: true },
      });

      if (!tracker) {
        throw new Error(`Tracker ${trackerId} not found`);
      }

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
        await this.prisma.tracker.update({
          where: { id: trackerId },
          data: {
            scrapingStatus: TrackerScrapingStatus.COMPLETED,
            lastScrapedAt: new Date(),
            scrapingError: null,
            scrapingAttempts: 0,
          },
        });

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

        // Log success to audit log (zero seasons is still a success)
        // tracker is guaranteed to be non-null here due to check above
        const trackerUserId = tracker.userId;
        const trackerUrl = tracker.url;
        await this.prisma
          .$transaction(async (tx) => {
            await this.activityLogService.logActivity(
              tx,
              'tracker',
              trackerId,
              'TRACKER_SCRAPING',
              'scrape.success',
              trackerUserId,
              undefined, // No guildId for tracker scraping
              {
                seasonsScraped: 0,
                seasonsFailed: 0,
                totalSeasons: 0,
              },
              {
                trackerUrl,
                scrapingLogId,
                note: 'No seasons found',
              },
            );
          })
          .catch((err) => {
            this.logger.warn(
              `Failed to log scraping success to audit log: ${err.message}`,
            );
          });

        // Send notification (non-blocking)
        this.notificationService
          .sendScrapingCompleteNotification(trackerId, tracker.userId, 0, 0)
          .catch((err) => {
            const errorMessage =
              err instanceof Error ? err.message : String(err);
            this.logger.warn(
              `Failed to send success notification: ${errorMessage}`,
            );
          });

        return {
          success: true,
          seasonsScraped: 0,
          seasonsFailed: 0,
        };
      }

      // Store season data using bulk upsert to avoid N+1 query problem
      let seasonsScraped = 0;
      let seasonsFailed = 0;

      try {
        // Use bulk upsert for better performance (single transaction with parallel upserts)
        await this.seasonService.bulkUpsertSeasons(trackerId, seasons);
        seasonsScraped = seasons.length;
        seasonsFailed = 0;
      } catch (error) {
        // Fallback to individual upserts if bulk operation fails
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Bulk season upsert failed, falling back to individual upserts: ${errorMessage}`,
        );

        // Fallback: process seasons individually
        for (const seasonData of seasons) {
          try {
            await this.seasonService.createOrUpdateSeason(
              trackerId,
              seasonData,
            );
            seasonsScraped++;
          } catch (individualError) {
            const individualErrorMessage =
              individualError instanceof Error
                ? individualError.message
                : String(individualError);
            this.logger.error(
              `Failed to store season ${seasonData.seasonNumber}: ${individualErrorMessage}`,
            );
            seasonsFailed++;
          }
        }
      }

      await this.prisma.tracker.update({
        where: { id: trackerId },
        data: {
          scrapingStatus: TrackerScrapingStatus.COMPLETED,
          lastScrapedAt: new Date(),
          scrapingError: null,
          scrapingAttempts: 0, // Reset attempts on success
        },
      });

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

      // Log success to audit log
      // tracker is guaranteed to be non-null here due to check above
      const trackerUserId = tracker.userId;
      const trackerUrl = tracker.url;
      await this.prisma
        .$transaction(async (tx) => {
          await this.activityLogService.logActivity(
            tx,
            'tracker',
            trackerId,
            'TRACKER_SCRAPING',
            'scrape.success',
            trackerUserId,
            undefined, // No guildId for tracker scraping
            {
              seasonsScraped,
              seasonsFailed,
              totalSeasons: seasonsScraped + seasonsFailed,
            },
            {
              trackerUrl,
              scrapingLogId,
            },
          );
        })
        .catch((err) => {
          this.logger.warn(
            `Failed to log scraping success to audit log: ${err.message}`,
          );
        });

      // Send success notification (non-blocking)
      this.notificationService
        .sendScrapingCompleteNotification(
          trackerId,
          tracker.userId,
          seasonsScraped,
          seasonsFailed,
        )
        .catch((err) => {
          const errorMessage = err instanceof Error ? err.message : String(err);
          this.logger.warn(
            `Failed to send success notification: ${errorMessage}`,
          );
        });

      // Calculate MMR for user across all guilds (non-blocking)
      // This happens after scraping completes successfully
      // tracker is guaranteed to be non-null here due to check above
      const mmrUserId = tracker.userId;
      this.mmrCalculationIntegration
        .calculateMmrForUser(mmrUserId, trackerId)
        .catch((err) => {
          const errorMessage = err instanceof Error ? err.message : String(err);
          this.logger.warn(
            `Failed to calculate MMR for user ${mmrUserId}: ${errorMessage}`,
          );
          // Don't fail the scraping job if MMR calculation fails
        });

      return {
        success: true,
        seasonsScraped,
        seasonsFailed,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to scrape tracker ${trackerId}: ${errorMessage}`,
        error,
      );

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

      // Log failure to audit log
      if (tracker) {
        const trackerUserId = tracker.userId;
        const trackerUrl = tracker.url;

        await this.prisma
          .$transaction(async (tx) => {
            // Fetch scraping attempts count inside transaction to ensure consistency
            const trackerWithAttempts = await tx.tracker.findUnique({
              where: { id: trackerId },
              select: { scrapingAttempts: true },
            });
            const scrapingAttempts = trackerWithAttempts?.scrapingAttempts || 0;

            await this.activityLogService.logActivity(
              tx,
              'tracker',
              trackerId,
              'TRACKER_SCRAPING',
              'scrape.failure',
              trackerUserId,
              undefined, // No guildId for tracker scraping
              {
                error: errorMessage.substring(0, 500), // Limit error length in audit log
              },
              {
                trackerUrl,
                scrapingLogId,
                scrapingAttempts,
              },
            );
          })
          .catch((err) => {
            this.logger.warn(
              `Failed to log scraping failure to audit log: ${err.message}`,
            );
          });
      }

      // Send failure notification (non-blocking)
      if (tracker) {
        this.notificationService
          .sendScrapingFailedNotification(
            trackerId,
            tracker.userId,
            errorMessage,
          )
          .catch((err) => {
            this.logger.warn(
              `Failed to send failure notification: ${err.message}`,
            );
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
