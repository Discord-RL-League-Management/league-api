import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
  OnApplicationShutdown,
} from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { TrackerProcessingService } from './tracker-processing.service';
import { ScheduledProcessingStatus, Prisma } from '@prisma/client';
import { ScheduledTrackerProcessingRepository } from '../repositories/scheduled-tracker-processing.repository';
import { GuildRepository } from '../../guilds/repositories/guild.repository';

/**
 * ScheduledTrackerProcessingService
 * Single Responsibility: Manage scheduled tracker processing jobs
 *
 * Allows admins to schedule tracker processing for specific guilds at specific times.
 * Useful for scenarios like season start dates where trackers need to be updated
 * autonomously without admin intervention.
 */
@Injectable()
export class ScheduledTrackerProcessingService
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger(ScheduledTrackerProcessingService.name);
  private readonly scheduledJobs = new Map<string, CronJob>();

  constructor(
    private readonly scheduleRepository: ScheduledTrackerProcessingRepository,
    private readonly guildRepository: GuildRepository,
    private readonly trackerProcessingService: TrackerProcessingService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  /**
   * Safely stop a CronJob, handling both sync and async stop methods
   * @param job - The CronJob instance to stop
   * @param jobId - Job ID for logging purposes
   */
  private async stopJobSafely(job: CronJob, jobId: string): Promise<void> {
    try {
      const stopResult = job.stop();
      // CronJob.stop() returns void or Promise<void>, handle both
      if (stopResult && typeof stopResult.then === 'function') {
        await stopResult;
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error stopping job ${jobId}: ${errorMessage}`);
    }
  }

  /**
   * Initialize scheduled jobs on module start
   * Loads all pending scheduled jobs from database and schedules them
   */
  async onModuleInit() {
    this.logger.log('Initializing scheduled tracker processing service');
    await this.loadPendingSchedules();
  }

  /**
   * Clean up scheduled jobs on shutdown
   */
  async onApplicationShutdown() {
    this.logger.log('Shutting down scheduled tracker processing service');
    for (const [jobId, job] of this.scheduledJobs.entries()) {
      await this.stopJobSafely(job, jobId);
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
   * Create a new scheduled tracker processing job
   * @param guildId - Discord guild ID
   * @param scheduledAt - When to process trackers (ISO date string or Date)
   * @param createdBy - Discord user ID who created the schedule
   * @param metadata - Optional metadata (e.g., reason, season info)
   * @returns Created schedule
   */
  async createSchedule(
    guildId: string,
    scheduledAt: Date | string,
    createdBy: string,
    metadata?: Record<string, unknown>,
  ) {
    const scheduledDate =
      scheduledAt instanceof Date ? scheduledAt : new Date(scheduledAt);

    if (scheduledDate <= new Date()) {
      throw new BadRequestException('Scheduled date must be in the future');
    }

    const guild = await this.guildRepository.findById(guildId);

    if (!guild) {
      throw new NotFoundException(`Guild ${guildId} not found`);
    }

    const schedule = await this.scheduleRepository.create({
      guildId,
      scheduledAt: scheduledDate,
      createdBy,
      status: ScheduledProcessingStatus.PENDING,
      metadata: (metadata || {}) as Prisma.InputJsonValue,
    });

    this.scheduleJob(schedule.id, scheduledDate, guildId);

    this.logger.log(
      `Created scheduled tracker processing for guild ${guildId} at ${scheduledDate.toISOString()}`,
    );

    return schedule;
  }

  /**
   * Get all scheduled jobs for a guild
   */
  async getSchedulesForGuild(
    guildId: string,
    options?: {
      status?: ScheduledProcessingStatus;
      includeCompleted?: boolean;
    },
  ) {
    const where: {
      guildId: string;
      status?: ScheduledProcessingStatus | { not: ScheduledProcessingStatus };
    } = {
      guildId,
    };

    // If status is explicitly provided, use it (takes precedence)
    if (options?.status) {
      where.status = options.status;
    } else if (options?.includeCompleted === false) {
      // Only apply includeCompleted filter if status wasn't explicitly provided
      where.status = {
        not: ScheduledProcessingStatus.COMPLETED,
      };
    }

    return this.scheduleRepository.findMany(where);
  }

  /**
   * Get a specific schedule by ID
   */
  async getSchedule(id: string) {
    const schedule = await this.scheduleRepository.findById(id);

    if (!schedule) {
      throw new NotFoundException(`Schedule ${id} not found`);
    }

    return schedule;
  }

  /**
   * Cancel a scheduled job
   */
  async cancelSchedule(id: string) {
    const schedule = await this.getSchedule(id);

    if (schedule.status !== ScheduledProcessingStatus.PENDING) {
      throw new BadRequestException(
        `Cannot cancel schedule with status ${schedule.status}`,
      );
    }

    const jobId = `scheduled-processing-${id}`;
    if (this.scheduledJobs.has(jobId)) {
      const job = this.scheduledJobs.get(jobId);
      if (!job) {
        this.logger.warn(`Job ${jobId} not found in scheduledJobs map`);
        this.scheduledJobs.delete(jobId);
      } else {
        await this.stopJobSafely(job, jobId);
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

    const updated = await this.scheduleRepository.update(id, {
      status: ScheduledProcessingStatus.CANCELLED,
    });

    this.logger.log(`Cancelled scheduled processing ${id}`);

    return updated;
  }

  /**
   * Load all pending schedules from database and schedule them
   */
  private async loadPendingSchedules() {
    const allPending = await this.scheduleRepository.findPending();
    // Filter to only future schedules
    const pendingSchedules = allPending.filter(
      (schedule) => schedule.scheduledAt > new Date(),
    );

    this.logger.log(
      `Loading ${pendingSchedules.length} pending scheduled jobs`,
    );

    for (const schedule of pendingSchedules) {
      this.scheduleJob(schedule.id, schedule.scheduledAt, schedule.guildId);
    }
  }

  /**
   * Schedule a job using CronJob
   */
  private scheduleJob(
    scheduleId: string,
    scheduledAt: Date,
    guildId: string,
  ): void {
    const jobId = `scheduled-processing-${scheduleId}`;

    const cronExpression = this.dateToCronExpression(scheduledAt);

    const job = new CronJob(cronExpression, async () => {
      try {
        this.logger.log(
          `Executing scheduled tracker processing ${scheduleId} for guild ${guildId}`,
        );

        await this.scheduleRepository.update(scheduleId, {
          status: ScheduledProcessingStatus.PENDING, // Keep as pending until execution completes
          executedAt: new Date(),
        });

        await this.trackerProcessingService.processPendingTrackersForGuild(
          guildId,
        );

        await this.scheduleRepository.update(scheduleId, {
          status: ScheduledProcessingStatus.COMPLETED,
        });

        this.logger.log(
          `Completed scheduled tracker processing ${scheduleId} for guild ${guildId}`,
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Error executing scheduled tracker processing ${scheduleId}: ${errorMessage}`,
        );

        await this.scheduleRepository
          .update(scheduleId, {
            status: ScheduledProcessingStatus.FAILED,
            errorMessage: errorMessage,
          })
          .catch((dbError: unknown) => {
            const dbErrorMessage =
              dbError instanceof Error ? dbError.message : String(dbError);
            this.logger.error(
              `Failed to update schedule status to FAILED for ${scheduleId}: ${dbErrorMessage}`,
            );
          });
      } finally {
        // Ensure cleanup always runs regardless of success or failure
        await this.stopJobSafely(job, jobId);
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
   * Convert a Date to a cron expression
   * Format: second minute hour day month dayOfWeek
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
