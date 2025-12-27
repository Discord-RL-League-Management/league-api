import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TrackerService } from './tracker.service';
import { ScheduledProcessingStatus, Prisma } from '@prisma/client';
import { ScheduledTrackerProcessingRepository } from '../repositories/scheduled-tracker-processing.repository';
import { GuildRepository } from '../../guilds/repositories/guild.repository';
import { CronJobSchedulerService } from './cron-job-scheduler.service';

/**
 * ScheduledTrackerProcessingService
 * Single Responsibility: Manage scheduled tracker processing jobs
 *
 * Allows admins to schedule tracker processing for specific guilds at specific times.
 * Useful for scenarios like season start dates where trackers need to be updated
 * autonomously without admin intervention.
 */
@Injectable()
export class ScheduledTrackerProcessingService {
  private readonly logger = new Logger(ScheduledTrackerProcessingService.name);

  constructor(
    private readonly repository: ScheduledTrackerProcessingRepository,
    private readonly guildRepository: GuildRepository,
    private readonly trackerService: TrackerService,
    private readonly schedulerService: CronJobSchedulerService,
  ) {}

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

    const schedule = await this.repository.create({
      guildId,
      scheduledAt: scheduledDate,
      createdBy,
      status: ScheduledProcessingStatus.PENDING,
      metadata: (metadata || {}) as Prisma.InputJsonValue,
    });

    const jobId = `scheduled-processing-${schedule.id}`;
    this.schedulerService.scheduleJob(
      jobId,
      scheduledDate,
      this.createExecutionCallback(schedule.id, guildId),
    );

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
    return this.repository.findManyForGuild(guildId, options);
  }

  /**
   * Get a specific schedule by ID
   */
  async getSchedule(id: string) {
    const schedule = await this.repository.findById(id);

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
    this.schedulerService.cancelJob(jobId);

    const updated = await this.repository.update(id, {
      status: ScheduledProcessingStatus.CANCELLED,
    });

    this.logger.log(`Cancelled scheduled processing ${id}`);

    return updated;
  }

  /**
   * Load all pending schedules from database and schedule them
   * Public method for lifecycle manager to call
   */
  async loadPendingSchedules() {
    const pendingSchedules = await this.repository.findPendingSchedules();

    this.logger.log(
      `Loading ${pendingSchedules.length} pending scheduled jobs`,
    );

    for (const schedule of pendingSchedules) {
      const jobId = `scheduled-processing-${schedule.id}`;
      this.schedulerService.scheduleJob(
        jobId,
        schedule.scheduledAt,
        this.createExecutionCallback(schedule.id, schedule.guildId),
      );
    }
  }

  /**
   * Create an execution callback for scheduled job
   * Handles business logic: status updates, tracker processing, error handling
   */
  private createExecutionCallback(
    scheduleId: string,
    guildId: string,
  ): () => Promise<void> {
    return async () => {
      try {
        this.logger.log(
          `Executing scheduled tracker processing ${scheduleId} for guild ${guildId}`,
        );

        await this.repository.update(scheduleId, {
          status: ScheduledProcessingStatus.PENDING, // Keep as pending until execution completes
          executedAt: new Date(),
        });

        await this.trackerService.processPendingTrackersForGuild(guildId);

        await this.repository.update(scheduleId, {
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

        await this.repository.update(scheduleId, {
          status: ScheduledProcessingStatus.FAILED,
          errorMessage: errorMessage,
        });

        throw error; // Re-throw to allow scheduler to handle cleanup
      }
    };
  }
}
