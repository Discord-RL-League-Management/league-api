import {
  Injectable,
  OnModuleInit,
  OnApplicationShutdown,
  Inject,
} from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { PrismaService } from '../../prisma/prisma.service';
import type { IConfigurationService } from '../../infrastructure/configuration/interfaces/configuration.interface';
import type { ILoggingService } from '../../infrastructure/logging/interfaces/logging.interface';
import { TrackerScrapingQueueService } from '../queues/tracker-scraping.queue';
import { TrackerBatchRefreshService } from './tracker-batch-refresh.service';
import { TrackerProcessingGuardService } from './tracker-processing-guard.service';

// Manages cron jobs via SchedulerRegistry to schedule tracker refreshes and prevents orphaned tasks on shutdown
@Injectable()
export class TrackerRefreshSchedulerService
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly serviceName = TrackerRefreshSchedulerService.name;
  private readonly refreshIntervalHours: number;
  private readonly batchSize: number;
  private readonly cronExpression: string;
  private cronJob: CronJob | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly scrapingQueueService: TrackerScrapingQueueService,
    private readonly batchRefreshService: TrackerBatchRefreshService,
    @Inject('IConfigurationService')
    private readonly configService: IConfigurationService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly processingGuard: TrackerProcessingGuardService,
    @Inject('ILoggingService')
    private readonly loggingService: ILoggingService,
  ) {
    const trackerConfig = this.configService.get<{
      refreshIntervalHours: number;
      batchSize: number;
      refreshCron: string;
    }>('tracker');
    if (!trackerConfig) {
      throw new Error('Tracker configuration is missing');
    }
    this.refreshIntervalHours = trackerConfig.refreshIntervalHours;
    this.batchSize = trackerConfig.batchSize;
    this.cronExpression = trackerConfig.refreshCron;
  }

  onModuleInit() {
    const cronExpression = this.cronExpression || '0 2 * * *';

    this.loggingService.log(
      `Tracker refresh scheduler initialized. Cron: ${cronExpression}, Batch size: ${this.batchSize}, Interval: ${this.refreshIntervalHours} hours`,
      this.serviceName,
    );

    const job = new CronJob(cronExpression, () => {
      // Prevents unhandled promise rejections from crashing the application when cron callback fails
      void this.scheduledRefresh().catch((error) => {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.loggingService.error(
          `Unhandled error in scheduled tracker refresh: ${errorMessage}`,
          error instanceof Error ? error.stack : undefined,
          this.serviceName,
        );
      });
    });

    this.cronJob = job;
    this.schedulerRegistry.addCronJob('tracker-refresh', job);
    job.start();

    this.loggingService.log(
      `Tracker refresh cron job registered and started with expression: ${cronExpression}`,
      this.serviceName,
    );
  }

  // Executes on cron schedule to refresh trackers that exceed their refresh interval
  async scheduledRefresh() {
    this.loggingService.log(
      'Starting scheduled tracker refresh',
      this.serviceName,
    );
    await this.triggerManualRefresh();
  }

  // Allows admin-triggered refresh of specific trackers or all trackers when none specified
  async triggerManualRefresh(trackerIds?: string[]): Promise<void> {
    try {
      if (trackerIds && trackerIds.length > 0) {
        this.loggingService.log(
          `Manually refreshing ${trackerIds.length} trackers`,
          this.serviceName,
        );
        await this.batchRefreshService.refreshTrackers(trackerIds);
      } else {
        const trackersToRefresh = await this.getTrackersNeedingRefresh();
        this.loggingService.log(
          `Found ${trackersToRefresh.length} trackers needing refresh`,
          this.serviceName,
        );

        if (trackersToRefresh.length === 0) {
          this.loggingService.log(
            'No trackers need refresh at this time',
            this.serviceName,
          );
          return;
        }

        await this.batchRefreshService.refreshTrackersInBatches(
          trackersToRefresh,
          this.batchSize,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.loggingService.error(
        `Error during tracker refresh: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      throw error;
    }
  }

  // Identifies trackers that haven't been scraped within their configured refresh interval
  private async getTrackersNeedingRefresh(): Promise<string[]> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - this.refreshIntervalHours);

    const trackers = await this.prisma.tracker.findMany({
      where: {
        isActive: true,
        isDeleted: false,
        OR: [{ lastScrapedAt: null }, { lastScrapedAt: { lt: cutoffTime } }],
        // Prevents race conditions by excluding trackers already in progress
        scrapingStatus: {
          not: 'IN_PROGRESS',
        },
      },
      select: {
        id: true,
      },
    });

    const trackerIds = trackers.map((t) => t.id);

    // Filter trackers to only those that can be processed based on guild settings
    return this.processingGuard.filterProcessableTrackers(trackerIds);
  }

  async onApplicationShutdown(signal?: string) {
    this.loggingService.log(
      `Application shutting down: ${signal || 'unknown signal'}`,
      this.serviceName,
    );

    if (this.cronJob) {
      try {
        await this.cronJob.stop();
      } catch (error) {
        this.loggingService.warn(
          `Error stopping cron job: ${error instanceof Error ? error.message : String(error)}`,
          this.serviceName,
        );
      }
      this.cronJob = null;
    }

    // Check if cron job exists before attempting to delete (official NestJS approach)
    if (this.schedulerRegistry.doesExist('cron', 'tracker-refresh')) {
      this.schedulerRegistry.deleteCronJob('tracker-refresh');
      this.loggingService.debug(
        'Tracker refresh cron job deleted from registry',
        this.serviceName,
      );
    } else {
      this.loggingService.debug(
        'Tracker refresh cron job not found in registry (may not have been registered)',
      );
    }

    this.loggingService.log(
      '✅ Tracker refresh scheduler stopped',
      this.serviceName,
    );
  }
}
