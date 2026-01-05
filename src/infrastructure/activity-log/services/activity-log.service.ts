import { Injectable } from '@nestjs/common';
import { ActivityLogRepository } from '../repositories/activity-log.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, ActivityLog } from '@prisma/client';

/**
 * ActivityLogService - Single Responsibility: Activity logging
 *
 * Handles all activity logging operations.
 * Replaces both AuditLog and SettingsHistory with unified activity logging.
 */
@Injectable()
export class ActivityLogService {
  constructor(
    private readonly repository: ActivityLogRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Log an activity
   */
  async logActivity(
    tx: Prisma.TransactionClient,
    entityType: string,
    entityId: string,
    eventType: string,
    action: string,
    userId?: string,
    guildId?: string,
    changes?: Prisma.InputJsonValue,
    metadata?: Prisma.InputJsonValue,
  ): Promise<ActivityLog> {
    return this.repository.create(
      {
        entityType,
        entityId,
        eventType,
        action,
        userId,
        guildId,
        changes,
        metadata,
      },
      tx,
    );
  }

  /**
   * Find activity logs by entity
   */
  async findByEntity(
    entityType: string,
    entityId: string,
  ): Promise<ActivityLog[]> {
    return this.repository.findByEntity(entityType, entityId);
  }

  /**
   * Find activity logs by user
   */
  async findByUser(userId: string): Promise<ActivityLog[]> {
    return this.repository.findByUser(userId);
  }

  /**
   * Find activity logs by guild
   */
  async findByGuild(guildId: string): Promise<ActivityLog[]> {
    return this.repository.findByGuild(guildId);
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
    return this.repository.findWithFilters(filters);
  }

  /**
   * Log an activity with its own transaction (for standalone audit logging)
   * Use this method when logging activities outside of an existing transaction.
   * For logging within an existing transaction, use logActivity() with the transaction client.
   */
  async logActivityStandalone(
    entityType: string,
    entityId: string,
    eventType: string,
    action: string,
    userId?: string,
    guildId?: string,
    changes?: Prisma.InputJsonValue,
    metadata?: Prisma.InputJsonValue,
  ): Promise<ActivityLog> {
    return this.prisma.$transaction(async (tx) => {
      return this.logActivity(
        tx,
        entityType,
        entityId,
        eventType,
        action,
        userId,
        guildId,
        changes,
        metadata,
      );
    });
  }
}
