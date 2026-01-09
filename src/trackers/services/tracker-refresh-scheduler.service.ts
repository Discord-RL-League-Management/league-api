import {
  Injectable,
  Logger,
  OnModuleInit,
  OnApplicationShutdown,
} from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { ConfigService } from '@nestjs/config';
import { TrackerScrapingQueueService } from '../queues/tracker-scraping.queue';
import { TrackerBatchRefreshService } from './tracker-batch-refresh.service';
import { TrackerProcessingGuardService } from './tracker-processing-guard.service';
import { TrackerRepository } from '../repositories/tracker.repository';

// Manages cron jobs via SchedulerRegistry to schedule tracker refreshes and prevents orphaned tasks on shutdown
@Injectable()
export class TrackerRefreshSchedulerService
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger(TrackerRefreshSchedulerService.name);
  private readonly refreshIntervalHours: number;
  private readonly batchSize: number;
  private readonly cronExpression: string;
  private cronJob: CronJob | null = null;

  constructor(
    private readonly trackerRepository: TrackerRepository,
    private readonly scrapingQueueService: TrackerScrapingQueueService,
    private readonly batchRefreshService: TrackerBatchRefreshService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly processingGuard: TrackerProcessingGuardService,
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

    this.logger.log(
      `Tracker refresh scheduler initialized. Cron: ${cronExpression}, Batch size: ${this.batchSize}, Interval: ${this.refreshIntervalHours} hours`,
    );

    const job = new CronJob(cronExpression, () => {
      // Prevents unhandled promise rejections from crashing the application when cron callback fails
      void this.scheduledRefresh().catch((error) => {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Unhandled error in scheduled tracker refresh: ${errorMessage}`,
          error instanceof Error ? error.stack : undefined,
        );
      });
    });

    this.cronJob = job;
    this.schedulerRegistry.addCronJob('tracker-refresh', job);
    job.start();

    this.logger.log(
      `Tracker refresh cron job registered and started with expression: ${cronExpression}`,
    );
  }

  async scheduledRefresh() {
    this.logger.log('Starting scheduled tracker refresh');
    await this.triggerManualRefresh();
  }

  async triggerManualRefresh(trackerIds?: string[]): Promise<void> {
    try {
      if (trackerIds && trackerIds.length > 0) {
        this.logger.log(`Manually refreshing ${trackerIds.length} trackers`);
        await this.batchRefreshService.refreshTrackers(trackerIds);
      } else {
        const trackersToRefresh = await this.getTrackersNeedingRefresh();
        this.logger.log(
          `Found ${trackersToRefresh.length} trackers needing refresh`,
        );

        if (trackersToRefresh.length === 0) {
          this.logger.log('No trackers need refresh at this time');
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
      this.logger.error(`Error during tracker refresh: ${errorMessage}`, error);
      throw error;
    }
  }

  private async getTrackersNeedingRefresh(): Promise<string[]> {
    const trackers = await this.trackerRepository.findPendingAndStale(
      this.refreshIntervalHours,
    );

    const trackerIds = trackers.map((t) => t.id);

    return this.processingGuard.filterProcessableTrackers(trackerIds);
  }

  async onApplicationShutdown(signal?: string) {
    this.logger.log(`Application shutting down: ${signal || 'unknown signal'}`);

    if (this.cronJob) {
      try {
        await this.cronJob.stop();
      } catch (error) {
        this.logger.warn(
          `Error stopping cron job: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      this.cronJob = null;
    }

    if (this.schedulerRegistry.doesExist('cron', 'tracker-refresh')) {
      this.schedulerRegistry.deleteCronJob('tracker-refresh');
      this.logger.debug('Tracker refresh cron job deleted from registry');
    } else {
      this.logger.debug(
        'Tracker refresh cron job not found in registry (may not have been registered)',
      );
    }

    this.logger.log('✅ Tracker refresh scheduler stopped');
  }
}
