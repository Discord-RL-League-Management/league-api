import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, ActivityLog } from '@prisma/client';

/**
 * ActivityLogRepository - Single Responsibility: Data access layer for ActivityLog entity
 *
 * Pure data access layer with no business logic.
 * Handles all database operations for ActivityLog model.
 */
@Injectable()
export class ActivityLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new activity log entry
   * Supports optional transaction client for use within transactions
   */
  async create(
    data: Prisma.ActivityLogCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<ActivityLog> {
    const client = tx || this.prisma;
    return client.activityLog.create({ data });
  }

  /**
   * Find activity logs by entity
   */
  async findByEntity(
    entityType: string,
    entityId: string,
  ): Promise<ActivityLog[]> {
    return this.prisma.activityLog.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  /**
   * Find activity logs by user
   */
  async findByUser(userId: string): Promise<ActivityLog[]> {
    return this.prisma.activityLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
    });
  }

  /**
   * Find activity logs by guild
   */
  async findByGuild(guildId: string): Promise<ActivityLog[]> {
    return this.prisma.activityLog.findMany({
      where: { guildId },
      orderBy: { timestamp: 'desc' },
    });
  }

  /**
   * Find activity logs with filters
   */
  async findWithFilters(filters: {
    entityType?: string;
    entityId?: string;
    userId?: string;
    guildId?: string;
    eventType?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: ActivityLog[]; total: number }> {
    const where: Prisma.ActivityLogWhereInput = {};
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.guildId) where.guildId = filters.guildId;
    if (filters.eventType) where.eventType = filters.eventType;

    const [logs, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return { logs, total };
  }
}
