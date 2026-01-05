import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ScheduledTrackerProcessing,
  ScheduledProcessingStatus,
  Prisma,
} from '@prisma/client';

/**
 * ScheduledTrackerProcessingRepository - Handles all database operations for ScheduledTrackerProcessing entity
 * Single Responsibility: Data access layer for ScheduledTrackerProcessing entity
 */
@Injectable()
export class ScheduledTrackerProcessingRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new scheduled processing entry
   */
  async create(data: {
    guildId: string;
    scheduledAt: Date;
    createdBy: string;
    status?: ScheduledProcessingStatus;
    metadata?: Prisma.InputJsonValue;
  }): Promise<ScheduledTrackerProcessing> {
    return this.prisma.scheduledTrackerProcessing.create({
      data: {
        ...data,
        status: data.status || ScheduledProcessingStatus.PENDING,
      },
    });
  }

  /**
   * Find by ID
   */
  async findById(id: string): Promise<ScheduledTrackerProcessing | null> {
    return this.prisma.scheduledTrackerProcessing.findUnique({
      where: { id },
    });
  }

  /**
   * Find all with filters
   */
  async findMany(where: {
    guildId: string;
    status?: ScheduledProcessingStatus | { not: ScheduledProcessingStatus };
  }): Promise<ScheduledTrackerProcessing[]> {
    return this.prisma.scheduledTrackerProcessing.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
    });
  }

  /**
   * Find pending schedules
   */
  async findPending(): Promise<ScheduledTrackerProcessing[]> {
    return this.prisma.scheduledTrackerProcessing.findMany({
      where: {
        status: ScheduledProcessingStatus.PENDING,
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  /**
   * Update a scheduled processing entry
   */
  async update(
    id: string,
    data: {
      status?: ScheduledProcessingStatus;
      executedAt?: Date | null;
      errorMessage?: string | null;
      metadata?: Prisma.InputJsonValue;
    },
  ): Promise<ScheduledTrackerProcessing> {
    return this.prisma.scheduledTrackerProcessing.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a scheduled processing entry
   */
  async delete(id: string): Promise<ScheduledTrackerProcessing> {
    return this.prisma.scheduledTrackerProcessing.delete({
      where: { id },
    });
  }
}
