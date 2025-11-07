import { Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import { RequestContextService } from '../../common/services/request-context.service';
import { AuditEvent, AuditAction } from '../interfaces/audit-event.interface';
import { ActivityLogService } from '../../infrastructure/activity-log/services/activity-log.service';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Audit Log Service - Single Responsibility: Business logic for audit logging
 * 
 * Separation of Concerns: Business logic separate from persistence.
 * Coordinates between repository and context services.
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    private activityLogService: ActivityLogService,
    private contextService: RequestContextService,
    private prisma: PrismaService,
  ) {}

  /**
   * Log permission check event
   * Single Responsibility: Log permission-related events
   */
  async logPermissionCheck(
    event: AuditEvent,
    request: Request
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.activityLogService.logActivity(
          tx,
          event.resource || 'permission',
          event.resource || 'unknown',
          'PERMISSION_CHECK',
          event.action,
          event.userId,
          event.guildId,
          { result: event.result },
          {
            ...event.metadata,
            ipAddress: this.contextService.getIpAddress(request),
            userAgent: this.contextService.getUserAgent(request),
            requestId: this.contextService.getRequestId(request),
          },
        );
      });
    } catch (error) {
      this.logger.error('Failed to log audit event:', error);
      // Don't throw - audit logging failure shouldn't break the request
    }
  }

  /**
   * Log admin action event
   * Single Responsibility: Log admin-related events
   */
  async logAdminAction(
    event: AuditEvent,
    request: Request
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.activityLogService.logActivity(
          tx,
          event.resource || 'admin',
          event.resource || 'unknown',
          'ADMIN_ACTION',
          event.action,
          event.userId,
          event.guildId,
          { result: event.result },
          {
            ...event.metadata,
            adminAction: true,
            ipAddress: this.contextService.getIpAddress(request),
            userAgent: this.contextService.getUserAgent(request),
            requestId: this.contextService.getRequestId(request),
          },
        );
      });
    } catch (error) {
      this.logger.error('Failed to log admin action:', error);
      // Don't throw - audit logging failure shouldn't break the request
    }
  }

  /**
   * Query audit logs for a guild
   * Single Responsibility: Retrieve audit logs with filters
   */
  async queryLogs(
    guildId: string,
    filters: {
      userId?: string;
      action?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    logs: any[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const result = await this.activityLogService.findWithFilters({
      guildId,
      userId: filters.userId,
      eventType: filters.action,
      limit: filters.limit,
      offset: filters.offset,
    });
    return {
      logs: result.logs,
      total: result.total,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    };
  }
}










