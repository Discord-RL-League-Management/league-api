import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { TrackerScrapingStatus, Tracker } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TRACKER_SCRAPING_QUEUE } from './tracker-scraping.queue';
import {
  ScrapingJobData,
  ScrapingJobResult,
} from './tracker-scraping.interfaces';
import { TrackerScraperService } from '../services/tracker-scraper.service';
import { TrackerSeasonService } from '../services/tracker-season.service';
import { TrackerService } from '../tracker.service';
import { TrackerNotificationService } from '../services/tracker-notification.service';
import { ActivityLogService } from '../../infrastructure/activity-log/services/activity-log.service';
import { MmrCalculationIntegrationService } from '../../mmr-calculation/services/mmr-calculation-integration.service';
import { TrackerRepository } from '../repositories/tracker.repository';
import { TrackerScrapingLogRepository } from '../repositories/tracker-scraping-log.repository';
import { GuildMembersService } from '../../guild-members/guild-members.service';
import { GuildMemberWithGuild } from '../../guild-members/services/guild-member-query.service';
import { PlayerService } from '../../players/player.service';

@Processor(TRACKER_SCRAPING_QUEUE)
@Injectable()
export class TrackerScrapingProcessor extends WorkerHost {
  private readonly logger = new Logger(TrackerScrapingProcessor.name);
  // In-memory Set to prevent duplicate summary sends (clears on restart, acceptable for this use case)
  private readonly sentSummaries = new Set<string>();

  constructor(
    private readonly trackerRepository: TrackerRepository,
    private readonly scrapingLogRepository: TrackerScrapingLogRepository,
    private readonly prisma: PrismaService,
    private readonly scraperService: TrackerScraperService,
    private readonly seasonService: TrackerSeasonService,
    private readonly trackerService: TrackerService,
    private readonly notificationService: TrackerNotificationService,
    private readonly activityLogService: ActivityLogService,
    private readonly mmrCalculationIntegration: MmrCalculationIntegrationService,
    private readonly guildMembersService: GuildMembersService,
    private readonly playerService: PlayerService,
  ) {
    super();
  }

  async process(job: Job<ScrapingJobData>): Promise<ScrapingJobResult> {
    const { trackerId } = job.data;
    this.logger.log(`Processing scraping job for tracker ${trackerId}`);

    let scrapingLogId: string | null = null;
    let tracker: { id: string; url: string; userId: string } | null = null;

    try {
      const trackerRecord = await this.trackerRepository.findById(trackerId);
      if (!trackerRecord) {
        throw new Error(`Tracker ${trackerId} not found`);
      }
      tracker = {
        id: trackerRecord.id,
        url: trackerRecord.url,
        userId: trackerRecord.userId,
      };

      if (!tracker) {
        throw new Error(`Tracker ${trackerId} not found`);
      }

      const scrapingLog = await this.scrapingLogRepository.create({
        trackerId,
        status: TrackerScrapingStatus.IN_PROGRESS,
        seasonsScraped: 0,
        seasonsFailed: 0,
        startedAt: new Date(),
      });
      scrapingLogId = scrapingLog.id;

      await this.trackerRepository.update(trackerId, {
        scrapingStatus: TrackerScrapingStatus.IN_PROGRESS,
        scrapingError: null,
      });

      // Check if this is first-time scraping (never scraped before)
      const isFirstScrape =
        trackerRecord.lastScrapedAt === null ||
        (await this.seasonService.getSeasonsByTracker(trackerId)).length === 0;

      // Limit to 3 most recent historical seasons for first-time scraping
      // Subsequent scrapes only fetch current season (maxSeasons: 0)
      const maxSeasons = isFirstScrape ? 3 : 0;

      if (isFirstScrape) {
        this.logger.log(
          `First-time scraping for tracker ${trackerId}, limiting to 3 most recent historical seasons`,
        );
      } else {
        this.logger.log(
          `Subsequent scraping for tracker ${trackerId}, only fetching current season`,
        );
      }

      const seasons = await this.scraperService.scrapeSeasons(
        tracker.url,
        maxSeasons,
      );

      if (!seasons || seasons.length === 0) {
        this.logger.warn(`No seasons found for tracker ${trackerId}`);
        await this.trackerRepository.update(trackerId, {
          scrapingStatus: TrackerScrapingStatus.COMPLETED,
          lastScrapedAt: new Date(),
          scrapingError: null,
          scrapingAttempts: 0,
        });

        if (scrapingLogId) {
          await this.scrapingLogRepository.update(scrapingLogId, {
            status: TrackerScrapingStatus.COMPLETED,
            seasonsScraped: 0,
            seasonsFailed: 0,
            completedAt: new Date(),
          });
        }

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
            const errorMessage =
              err instanceof Error ? err.message : String(err);
            this.logger.warn(
              `Failed to log scraping success to audit log: ${errorMessage}`,
            );
          });

        this.notificationService
          .sendScrapingCompleteNotification(trackerId, tracker.userId, 0, 0)
          .catch((err) => {
            const errorMessage =
              err instanceof Error ? err.message : String(err);
            this.logger.warn(
              `Failed to send success notification: ${errorMessage}`,
            );
          });

        // Check if all trackers from registration are complete (for force-processed registrations)
        if (trackerRecord.registrationInteractionToken) {
          void this.checkAndSendRegistrationSummary(
            trackerRecord.registrationInteractionToken,
          ).catch((err) => {
            const errorMessage =
              err instanceof Error ? err.message : String(err);
            this.logger.warn(
              `Failed to check registration summary for token: ${errorMessage}`,
            );
          });
        }

        return {
          success: true,
          seasonsScraped: 0,
          seasonsFailed: 0,
        };
      }

      let seasonsScraped = 0;
      let seasonsFailed = 0;

      try {
        await this.seasonService.bulkUpsertSeasons(trackerId, seasons);
        seasonsScraped = seasons.length;
        seasonsFailed = 0;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Bulk season upsert failed, falling back to individual upserts: ${errorMessage}`,
        );

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

      await this.trackerRepository.update(trackerId, {
        scrapingStatus: TrackerScrapingStatus.COMPLETED,
        lastScrapedAt: new Date(),
        scrapingError: null,
        scrapingAttempts: 0,
      });

      await this.scrapingLogRepository.update(scrapingLogId, {
        status: TrackerScrapingStatus.COMPLETED,
        seasonsScraped,
        seasonsFailed,
        completedAt: new Date(),
      });

      this.logger.log(
        `Successfully scraped tracker ${trackerId}: ${seasonsScraped} seasons scraped, ${seasonsFailed} failed`,
      );

      // Fire-and-forget: Create players for all guilds where user is a member
      const trackerUserId = tracker.userId;
      const trackerUrl = tracker.url;
      void this.createPlayersForUserGuilds(trackerUserId).catch((err) => {
        const errorMessage = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Failed to create players for user ${trackerUserId} after tracker scraping: ${errorMessage}`,
        );
      });
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
          const errorMessage = err instanceof Error ? err.message : String(err);
          this.logger.warn(
            `Failed to log scraping success to audit log: ${errorMessage}`,
          );
        });

      // Fire-and-forget: Send notification asynchronously (errors are logged but don't block processing)
      void this.notificationService
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

      // Check if all trackers from registration are complete (for force-processed registrations)
      if (trackerRecord.registrationInteractionToken) {
        void this.checkAndSendRegistrationSummary(
          trackerRecord.registrationInteractionToken,
        ).catch((err) => {
          const errorMessage = err instanceof Error ? err.message : String(err);
          this.logger.warn(
            `Failed to check registration summary for token: ${errorMessage}`,
          );
        });
      }

      const mmrUserId = tracker.userId;
      // Fire-and-forget: Calculate MMR asynchronously (errors are logged but don't block processing)
      void this.mmrCalculationIntegration
        .calculateMmrForUser(mmrUserId, trackerId)
        .catch((err) => {
          const errorMessage = err instanceof Error ? err.message : String(err);
          this.logger.warn(
            `Failed to calculate MMR for user ${mmrUserId}: ${errorMessage}`,
          );
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

      const currentTracker = await this.trackerRepository.findById(trackerId);
      const currentAttempts = currentTracker?.scrapingAttempts || 0;

      await this.trackerRepository.update(trackerId, {
        scrapingStatus: TrackerScrapingStatus.FAILED,
        scrapingError: errorMessage,
        scrapingAttempts: currentAttempts + 1,
      });

      if (scrapingLogId) {
        await this.scrapingLogRepository.update(scrapingLogId, {
          status: TrackerScrapingStatus.FAILED,
          errorMessage: errorMessage.substring(0, 1000), // Limit error message length
          completedAt: new Date(),
        });
      }

      if (tracker) {
        const trackerUserId = tracker.userId;
        const trackerUrl = tracker.url;

        await this.prisma
          .$transaction(async (tx) => {
            const trackerWithAttempts =
              await this.trackerRepository.findById(trackerId);
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
            const errorMessage =
              err instanceof Error ? err.message : String(err);
            this.logger.warn(
              `Failed to log scraping failure to audit log: ${errorMessage}`,
            );
          });
      }

      if (tracker) {
        this.notificationService
          .sendScrapingFailedNotification(
            trackerId,
            tracker.userId,
            errorMessage,
          )
          .catch((err) => {
            const errorMessage =
              err instanceof Error ? err.message : String(err);
            this.logger.warn(
              `Failed to send failure notification: ${errorMessage}`,
            );
          });
      }

      // Check if all trackers from registration are complete (for force-processed registrations)
      const failedTracker = await this.trackerRepository.findById(trackerId);
      if (failedTracker?.registrationInteractionToken) {
        void this.checkAndSendRegistrationSummary(
          failedTracker.registrationInteractionToken,
        ).catch((err) => {
          const errorMessage = err instanceof Error ? err.message : String(err);
          this.logger.warn(
            `Failed to check registration summary for token: ${errorMessage}`,
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

  /**
   * Create players for all guilds where user is a member
   * Single Responsibility: Player creation for user's guild memberships
   */
  private async createPlayersForUserGuilds(userId: string): Promise<void> {
    const guildMembers =
      await this.guildMembersService.findMembersByUser(userId);

    await Promise.allSettled(
      guildMembers.map(async (guildMember: GuildMemberWithGuild) => {
        try {
          await this.playerService.ensurePlayerExists(
            userId,
            guildMember.guildId,
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.warn(
            `Failed to create player for user ${userId} in guild ${guildMember.guildId}: ${errorMessage}`,
          );
        }
      }),
    );
  }

  /**
   * Check if all trackers from a registration are complete
   * Single Responsibility: Determine if all trackers have finished processing
   *
   * @param trackers - Array of trackers to check
   * @returns true if all trackers are COMPLETED or FAILED, false otherwise
   */
  private areAllTrackersComplete(trackers: Tracker[]): boolean {
    return trackers.every(
      (tracker) =>
        tracker.scrapingStatus === TrackerScrapingStatus.COMPLETED ||
        tracker.scrapingStatus === TrackerScrapingStatus.FAILED,
    );
  }

  /**
   * Check if all trackers from a registration are complete and send summary if so
   * Single Responsibility: Coordinate registration summary notification
   *
   * @param interactionToken - Discord interaction token for the registration
   */
  private async checkAndSendRegistrationSummary(
    interactionToken: string,
  ): Promise<void> {
    try {
      // Prevent duplicate summaries using in-memory Set
      if (this.sentSummaries.has(interactionToken)) {
        this.logger.debug(
          `Summary already sent for token ${interactionToken.substring(0, 10)}..., skipping`,
        );
        return;
      }

      // Find all trackers with this token
      const allTrackers =
        await this.trackerRepository.findByRegistrationToken(interactionToken);

      if (allTrackers.length === 0) {
        this.logger.warn(
          `No trackers found for registration token ${interactionToken.substring(0, 10)}...`,
        );
        return;
      }

      // Check if all are complete
      if (this.areAllTrackersComplete(allTrackers)) {
        // Mark as sent before sending to prevent race conditions
        this.sentSummaries.add(interactionToken);

        // Retrieve applicationId from mapping (if available)
        const applicationId =
          this.notificationService.getApplicationId(interactionToken);

        // Send summary (only once)
        // applicationId will be passed if available, otherwise method will look it up or use fallback
        await this.notificationService.sendRegistrationSummary(
          interactionToken,
          allTrackers,
          applicationId,
        );

        this.logger.log(
          `Sent registration summary for ${allTrackers.length} tracker(s) with token ${interactionToken.substring(0, 10)}...`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to check registration summary for token: ${errorMessage}`,
      );
      // Don't throw - summary failures shouldn't break processing
    }
  }
}
