import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Prisma,
  ScheduledTrackerProcessing,
  ScheduledProcessingStatus,
} from '@prisma/client';

/**
 * ScheduledTrackerProcessingRepository - Handles all database operations for ScheduledTrackerProcessing entity
 * Single Responsibility: Data access layer for ScheduledTrackerProcessing entity
 *
 * Separates data access concerns from business logic,
 * making services more focused and testable.
 */
@Injectable()
export class ScheduledTrackerProcessingRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new scheduled tracker processing record
   */
  async create(data: {
    guildId: string;
    scheduledAt: Date;
    createdBy: string;
    status: ScheduledProcessingStatus;
    metadata?: Prisma.InputJsonValue;
  }): Promise<ScheduledTrackerProcessing> {
    return this.prisma.scheduledTrackerProcessing.create({
      data,
    });
  }

  /**
   * Find a schedule by ID
   */
  async findById(id: string): Promise<ScheduledTrackerProcessing | null> {
    return this.prisma.scheduledTrackerProcessing.findUnique({
      where: { id },
    });
  }

  /**
   * Find all schedules for a guild with optional filtering
   */
  async findManyForGuild(
    guildId: string,
    options?: {
      status?: ScheduledProcessingStatus;
      includeCompleted?: boolean;
    },
  ): Promise<ScheduledTrackerProcessing[]> {
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
   * Find all pending schedules that are scheduled in the future
   */
  async findPendingSchedules(): Promise<ScheduledTrackerProcessing[]> {
    return this.prisma.scheduledTrackerProcessing.findMany({
      where: {
        status: ScheduledProcessingStatus.PENDING,
        scheduledAt: {
          gt: new Date(),
        },
      },
    });
  }

  /**
   * Update a schedule
   */
  async update(
    id: string,
    data: Prisma.ScheduledTrackerProcessingUpdateInput,
  ): Promise<ScheduledTrackerProcessing> {
    return this.prisma.scheduledTrackerProcessing.update({
      where: { id },
      data,
    });
  }
}
