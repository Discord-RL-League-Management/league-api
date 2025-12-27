import {
  Injectable,
  Logger,
  OnModuleInit,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ScheduledTrackerProcessingService } from './scheduled-tracker-processing.service';
import { CronJobSchedulerService } from './cron-job-scheduler.service';

/**
 * ScheduledJobLifecycleManager - Handles module initialization and shutdown
 * Single Responsibility: Infrastructure lifecycle management
 *
 * Separates lifecycle concerns from business logic,
 * making services more focused and testable.
 */
@Injectable()
export class ScheduledJobLifecycleManager
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger(ScheduledJobLifecycleManager.name);

  constructor(
    private readonly scheduledProcessingService: ScheduledTrackerProcessingService,
    private readonly schedulerService: CronJobSchedulerService,
  ) {}

  /**
   * Initialize scheduled jobs on module start
   * Loads all pending scheduled jobs from database and schedules them
   */
  async onModuleInit() {
    this.logger.log('Initializing scheduled tracker processing service');
    await this.scheduledProcessingService.loadPendingSchedules();
  }

  /**
   * Clean up scheduled jobs on shutdown
   */
  onApplicationShutdown() {
    this.logger.log('Shutting down scheduled tracker processing service');
    this.schedulerService.stopAllJobs();
  }
}
