import { Injectable, Logger } from '@nestjs/common';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, AuditLog } from '@prisma/client';
import type {
  CreateAuditLogInput,
  QueryFilters,
} from '../interfaces/audit-log.interface';

/**
 * AuditLogService - Single Responsibility: Audit logging operations
 *
 * Handles all audit logging operations for HTTP requests.
 * Uses fire-and-forget pattern to avoid blocking requests.
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    private readonly repository: AuditLogRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Log an audit entry
   * Uses fire-and-forget pattern - errors are logged but don't throw
   */
  async logAuditEntry(auditData: CreateAuditLogInput): Promise<AuditLog> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        return this.repository.create(
          {
            userId: auditData.userId,
            botId: auditData.botId,
            ipAddress: auditData.ipAddress,
            userAgent: auditData.userAgent,
            method: auditData.method,
            endpoint: auditData.endpoint,
            action: auditData.action,
            resourceType: auditData.resourceType,
            resourceId: auditData.resourceId,
            requestBody: auditData.requestBody as Prisma.InputJsonValue,
            responseStatus: auditData.responseStatus,
          },
          tx,
        );
      });
    } catch (error) {
      // Log error before re-throwing - interceptor will catch and handle it without blocking requests
      this.logger.error('Failed to log audit entry', error);
      throw error; // Re-throw for caller to handle if needed
    }
  }

  /**
   * Find audit logs by user
   */
  async findByUser(
    userId: string,
    filters?: QueryFilters,
  ): Promise<AuditLog[]> {
    return this.repository.findByUser(userId, filters);
  }

  /**
   * Find audit logs by bot
   */
  async findByBot(botId: string, filters?: QueryFilters): Promise<AuditLog[]> {
    return this.repository.findByBot(botId, filters);
  }

  /**
   * Find audit logs by resource
   */
  async findByResource(
    resourceType: string,
    resourceId: string,
    filters?: QueryFilters,
  ): Promise<AuditLog[]> {
    return this.repository.findByResource(resourceType, resourceId, filters);
  }

  /**
   * Find audit logs with filters
   */
  async findWithFilters(
    filters: QueryFilters,
  ): Promise<{ logs: AuditLog[]; total: number }> {
    return this.repository.findWithFilters(filters);
  }
}
