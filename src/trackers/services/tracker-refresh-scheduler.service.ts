import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { TrackerScrapingQueueService } from '../queues/tracker-scraping.queue';
import { TrackerBatchRefreshService } from './tracker-batch-refresh.service';

@Injectable()
export class TrackerRefreshSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(TrackerRefreshSchedulerService.name);
  private readonly refreshIntervalHours: number;
  private readonly batchSize: number;
  private readonly cronExpression: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly scrapingQueueService: TrackerScrapingQueueService,
    private readonly batchRefreshService: TrackerBatchRefreshService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {
    const trackerConfig = this.configService.get('tracker');
    this.refreshIntervalHours = trackerConfig.refreshIntervalHours;
    this.batchSize = trackerConfig.batchSize;
    this.cronExpression = trackerConfig.refreshCron;
  }

  onModuleInit() {
    const cronExpression = this.cronExpression || '0 2 * * *';

    this.logger.log(
      `Tracker refresh scheduler initialized. Cron: ${cronExpression}, Batch size: ${this.batchSize}, Interval: ${this.refreshIntervalHours} hours`,
    );

    // Register cron job dynamically using configured expression
    const job = new CronJob(cronExpression, () => {
      // Handle async operation in cron callback to prevent unhandled promise rejections
      this.scheduledRefresh().catch((error) => {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Unhandled error in scheduled tracker refresh: ${errorMessage}`,
          error instanceof Error ? error.stack : undefined,
        );
      });
    });

    this.schedulerRegistry.addCronJob('tracker-refresh', job);
    job.start();

    this.logger.log(
      `Tracker refresh cron job registered and started with expression: ${cronExpression}`,
    );
  }

  /**
   * Scheduled job to refresh all trackers that need updating
   * Runs according to configured cron expression (TRACKER_REFRESH_CRON environment variable)
   * Default cron: '0 2 * * *' (2 AM daily) if not configured
   */
  async scheduledRefresh() {
    this.logger.log('Starting scheduled tracker refresh');
    await this.triggerManualRefresh();
  }

  /**
   * Manually trigger refresh for trackers
   * @param trackerIds - Optional array of tracker IDs to refresh. If not provided, refreshes all active trackers
   */
  async triggerManualRefresh(trackerIds?: string[]): Promise<void> {
    try {
      if (trackerIds && trackerIds.length > 0) {
        // Refresh specific trackers
        this.logger.log(`Manually refreshing ${trackerIds.length} trackers`);
        await this.batchRefreshService.refreshTrackers(trackerIds);
      } else {
        // Refresh all trackers that need updating
        const trackersToRefresh = await this.getTrackersNeedingRefresh();
        this.logger.log(
          `Found ${trackersToRefresh.length} trackers needing refresh`,
        );

        if (trackersToRefresh.length === 0) {
          this.logger.log('No trackers need refresh at this time');
          return;
        }

        // Process in batches
        await this.batchRefreshService.refreshTrackersInBatches(
          trackersToRefresh,
          this.batchSize,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error during tracker refresh: ${errorMessage}`, error);
      throw error;
    }
  }

  /**
   * Get trackers that need refresh based on lastScrapedAt and refresh interval
   */
  private async getTrackersNeedingRefresh(): Promise<string[]> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - this.refreshIntervalHours);

    const trackers = await this.prisma.tracker.findMany({
      where: {
        isActive: true,
        isDeleted: false,
        OR: [{ lastScrapedAt: null }, { lastScrapedAt: { lt: cutoffTime } }],
        // Don't refresh trackers that are currently being scraped
        scrapingStatus: {
          not: 'IN_PROGRESS',
        },
      },
      select: {
        id: true,
      },
    });

    return trackers.map((t) => t.id);
  }
}
