import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';

/**
 * CronJobSchedulerService - Handles CronJob creation, registration, and lifecycle
 * Single Responsibility: Job scheduling and orchestration
 *
 * Separates job scheduling concerns from business logic,
 * making services more focused and testable.
 */
@Injectable()
export class CronJobSchedulerService {
  private readonly logger = new Logger(CronJobSchedulerService.name);
  private readonly scheduledJobs = new Map<string, CronJob>();

  constructor(private readonly schedulerRegistry: SchedulerRegistry) {}

  /**
   * Schedule a job using CronJob
   * @param jobId - Unique identifier for the job
   * @param scheduledAt - When to execute the job
   * @param executeCallback - Callback function to execute when job runs
   */
  scheduleJob(
    jobId: string,
    scheduledAt: Date,
    executeCallback: () => Promise<void>,
  ): void {
    const cronExpression = this.dateToCronExpression(scheduledAt);

    const job = new CronJob(cronExpression, async () => {
      try {
        await executeCallback();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Error executing scheduled job ${jobId}: ${errorMessage}`,
        );
        throw error; // Re-throw to allow callback to handle error state
      } finally {
        // Cleanup after execution (one-time jobs)
        void Promise.resolve(job.stop()).catch((err: unknown) => {
          const errorMessage = err instanceof Error ? err.message : String(err);
          this.logger.error(`Error stopping job ${jobId}: ${errorMessage}`);
        });
        this.scheduledJobs.delete(jobId);
        if (this.schedulerRegistry.doesExist('cron', jobId)) {
          try {
            this.schedulerRegistry.deleteCronJob(jobId);
          } catch (err: unknown) {
            const errorMessage =
              err instanceof Error ? err.message : String(err);
            this.logger.error(
              `Error deleting cron job ${jobId}: ${errorMessage}`,
            );
          }
        }
      }
    });

    this.scheduledJobs.set(jobId, job);
    this.schedulerRegistry.addCronJob(jobId, job);
    job.start();

    this.logger.log(`Scheduled job ${jobId} for ${scheduledAt.toISOString()}`);
  }

  /**
   * Cancel a scheduled job
   * @param jobId - Unique identifier for the job
   */
  cancelJob(jobId: string): void {
    if (this.scheduledJobs.has(jobId)) {
      const job = this.scheduledJobs.get(jobId);
      if (!job) {
        this.logger.warn(`Job ${jobId} not found in scheduledJobs map`);
        this.scheduledJobs.delete(jobId);
      } else {
        void Promise.resolve(job.stop()).catch((error: unknown) => {
          this.logger.error(
            `Error stopping job ${jobId}: ${error instanceof Error ? error.message : String(error)}`,
          );
        });
        this.scheduledJobs.delete(jobId);
      }
    }

    if (this.schedulerRegistry.doesExist('cron', jobId)) {
      try {
        this.schedulerRegistry.deleteCronJob(jobId);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        this.logger.error(`Error deleting cron job ${jobId}: ${errorMessage}`);
      }
    }
  }

  /**
   * Get all scheduled job IDs
   */
  getScheduledJobIds(): string[] {
    return Array.from(this.scheduledJobs.keys());
  }

  /**
   * Stop all scheduled jobs (used during shutdown)
   */
  stopAllJobs(): void {
    for (const [jobId, job] of this.scheduledJobs.entries()) {
      void Promise.resolve(job.stop()).catch((error: unknown) => {
        this.logger.error(
          `Error stopping job ${jobId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
      if (this.schedulerRegistry.doesExist('cron', jobId)) {
        try {
          this.schedulerRegistry.deleteCronJob(jobId);
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          this.logger.error(
            `Error deleting cron job ${jobId}: ${errorMessage}`,
          );
        }
      }
      this.logger.log(`Stopped scheduled job: ${jobId}`);
    }
    this.scheduledJobs.clear();
  }

  /**
   * Convert a Date to a cron expression
   * Format: second minute hour day month dayOfWeek
   * Note: For one-time jobs, we use a specific date/time
   */
  private dateToCronExpression(date: Date): string {
    const second = date.getSeconds();
    const minute = date.getMinutes();
    const hour = date.getHours();
    const day = date.getDate();
    const month = date.getMonth() + 1; // JavaScript months are 0-indexed

    // For a one-time job, we use the specific date (dayOfWeek = *)
    return `${second} ${minute} ${hour} ${day} ${month} *`;
  }
}
