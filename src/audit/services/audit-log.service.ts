import { Injectable, Inject } from '@nestjs/common';
import { Request } from 'express';
import { RequestContextService } from '../../common/services/request-context.service';
import { AuditEvent } from '../interfaces/audit-event.interface';
import { ActivityLogService } from '../../infrastructure/activity-log/services/activity-log.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ILoggingService } from '../../infrastructure/logging/interfaces/logging.interface';
import {
  ITransactionService,
  ITransactionClient,
} from '../../infrastructure/transactions/interfaces/transaction.interface';
import { Prisma } from '@prisma/client';

/**
 * Audit Log Service - Business logic for audit logging
 *
 * Coordinates between repository and context services.
 */
@Injectable()
export class AuditLogService {
  private readonly serviceName = AuditLogService.name;

  constructor(
    private activityLogService: ActivityLogService,
    private contextService: RequestContextService,
    private prisma: PrismaService,
    @Inject(ITransactionService)
    private transactionService: ITransactionService,
    @Inject(ILoggingService)
    private readonly loggingService: ILoggingService,
  ) {}

  /**
   * Log permission check event
   */
  async logPermissionCheck(event: AuditEvent, request: Request): Promise<void> {
    try {
      await this.transactionService.executeTransaction(
        async (tx: ITransactionClient) => {
          await this.activityLogService.logActivity(
            tx as Prisma.TransactionClient,
            'permission',
            event.resource || 'unknown',
            'PERMISSION_CHECK',
            event.action,
            event.userId,
            event.guildId,
            { result: event.result },
            {
              ...event.metadata,
              resource: event.resource,
              ipAddress: this.contextService.getIpAddress(request),
              userAgent: this.contextService.getUserAgent(request),
              requestId: this.contextService.getRequestId(request),
            },
          );
        },
      );
    } catch (_error) {
      this.loggingService.error(
        `Failed to log audit event: ${_error instanceof Error ? _error.message : String(_error)}`,
        _error instanceof Error ? _error.stack : undefined,
        this.serviceName,
      );
    }
  }

  /**
   * Log admin action event
   */
  async logAdminAction(event: AuditEvent, request: Request): Promise<void> {
    try {
      await this.transactionService.executeTransaction(
        async (tx: ITransactionClient) => {
          await this.activityLogService.logActivity(
            tx as Prisma.TransactionClient,
            'admin',
            event.resource || 'unknown',
            'ADMIN_ACTION',
            event.action,
            event.userId,
            event.guildId,
            { result: event.result },
            {
              ...event.metadata,
              resource: event.resource,
              adminAction: true,
              ipAddress: this.contextService.getIpAddress(request),
              userAgent: this.contextService.getUserAgent(request),
              requestId: this.contextService.getRequestId(request),
            },
          );
        },
      );
    } catch (error) {
      this.loggingService.error(
        `Failed to log admin action: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
    }
  }

  /**
   * Query audit logs for a guild
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
    },
  ): Promise<{
    logs: Array<Record<string, unknown>>;
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
