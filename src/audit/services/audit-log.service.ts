import { Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { RequestContextService } from '../../common/services/request-context.service';
import { AuditEvent, AuditAction } from '../interfaces/audit-event.interface';

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
    private repository: AuditLogRepository,
    private contextService: RequestContextService
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
      await this.repository.create({
        userId: event.userId,
        guildId: event.guildId,
        action: event.action,
        resource: event.resource,
        result: event.result,
        metadata: event.metadata,
        ipAddress: this.contextService.getIpAddress(request),
        userAgent: this.contextService.getUserAgent(request),
        requestId: this.contextService.getRequestId(request),
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
      await this.repository.create({
        userId: event.userId,
        guildId: event.guildId,
        action: event.action,
        resource: event.resource,
        result: event.result,
        metadata: { ...event.metadata, adminAction: true },
        ipAddress: this.contextService.getIpAddress(request),
        userAgent: this.contextService.getUserAgent(request),
        requestId: this.contextService.getRequestId(request),
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
    const logs = await this.repository.findByGuild(guildId, filters);
    // Note: For production, implement proper count query for total
    return {
      logs,
      total: logs.length,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    };
  }
}

