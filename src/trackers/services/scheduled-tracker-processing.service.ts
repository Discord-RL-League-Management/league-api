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
import { PrismaService } from '../../prisma/prisma.service';
import { TrackerService } from './tracker.service';
import { ScheduledProcessingStatus, Prisma } from '@prisma/client';

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
    private readonly prisma: PrismaService,
    private readonly trackerService: TrackerService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

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
  onApplicationShutdown() {
    this.logger.log('Shutting down scheduled tracker processing service');
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

    const guild = await this.prisma.guild.findUnique({
      where: { id: guildId },
    });

    if (!guild) {
      throw new NotFoundException(`Guild ${guildId} not found`);
    }

    const schedule = await this.prisma.scheduledTrackerProcessing.create({
      data: {
        guildId,
        scheduledAt: scheduledDate,
        createdBy,
        status: ScheduledProcessingStatus.PENDING,
        metadata: (metadata || {}) as Prisma.InputJsonValue,
      },
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
    const where: Prisma.ScheduledTrackerProcessingWhereInput = {
      guildId,
      ...(options?.status && { status: options.status }),
      ...(options?.includeCompleted === false && {
        status: {
          not: ScheduledProcessingStatus.COMPLETED,
        },
      }),
    };

    return this.prisma.scheduledTrackerProcessing.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
    });
  }

  /**
   * Get a specific schedule by ID
   */
  async getSchedule(id: string) {
    const schedule = await this.prisma.scheduledTrackerProcessing.findUnique({
      where: { id },
    });

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

    const updated = await this.prisma.scheduledTrackerProcessing.update({
      where: { id },
      data: {
        status: ScheduledProcessingStatus.CANCELLED,
      },
    });

    this.logger.log(`Cancelled scheduled processing ${id}`);

    return updated;
  }

  /**
   * Load all pending schedules from database and schedule them
   */
  private async loadPendingSchedules() {
    const pendingSchedules =
      await this.prisma.scheduledTrackerProcessing.findMany({
        where: {
          status: ScheduledProcessingStatus.PENDING,
          scheduledAt: {
            gt: new Date(), // Only future schedules
          },
        },
      });

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

        await this.prisma.scheduledTrackerProcessing.update({
          where: { id: scheduleId },
          data: {
            status: ScheduledProcessingStatus.PENDING, // Keep as pending until execution completes
            executedAt: new Date(),
          },
        });

        await this.trackerService.processPendingTrackersForGuild(guildId);

        await this.prisma.scheduledTrackerProcessing.update({
          where: { id: scheduleId },
          data: {
            status: ScheduledProcessingStatus.COMPLETED,
          },
        });

        this.logger.log(
          `Completed scheduled tracker processing ${scheduleId} for guild ${guildId}`,
        );

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
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Error executing scheduled tracker processing ${scheduleId}: ${errorMessage}`,
        );

        await this.prisma.scheduledTrackerProcessing.update({
          where: { id: scheduleId },
          data: {
            status: ScheduledProcessingStatus.FAILED,
            errorMessage: errorMessage,
          },
        });

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
