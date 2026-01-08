import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, AuditLog } from '@prisma/client';

/**
 * AuditLogRepository - Single Responsibility: Data access layer for AuditLog entity
 *
 * Pure data access layer with no business logic.
 * Handles all database operations for AuditLog model.
 */
@Injectable()
export class AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new audit log entry
   * Supports optional transaction client for use within transactions
   */
  async create(
    data: Prisma.AuditLogCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<AuditLog> {
    const client = tx || this.prisma;
    return client.auditLog.create({ data });
  }

  /**
   * Find audit logs by user
   */
  async findByUser(
    userId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
  ): Promise<AuditLog[]> {
    const where: Prisma.AuditLogWhereInput = {
      userId,
    };

    if (filters?.startDate || filters?.endDate) {
      where.timestamp = {};
      if (filters.startDate) {
        where.timestamp.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.timestamp.lte = filters.endDate;
      }
    }

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    });
  }

  /**
   * Find audit logs by bot
   */
  async findByBot(
    botId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
  ): Promise<AuditLog[]> {
    const where: Prisma.AuditLogWhereInput = {
      botId,
    };

    if (filters?.startDate || filters?.endDate) {
      where.timestamp = {};
      if (filters.startDate) {
        where.timestamp.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.timestamp.lte = filters.endDate;
      }
    }

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    });
  }

  /**
   * Find audit logs by resource
   */
  async findByResource(
    resourceType: string,
    resourceId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
  ): Promise<AuditLog[]> {
    const where: Prisma.AuditLogWhereInput = {
      resourceType,
      resourceId,
    };

    if (filters?.startDate || filters?.endDate) {
      where.timestamp = {};
      if (filters.startDate) {
        where.timestamp.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.timestamp.lte = filters.endDate;
      }
    }

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    });
  }

  /**
   * Find audit logs with filters
   */
  async findWithFilters(filters: {
    userId?: string;
    botId?: string;
    resourceType?: string;
    resourceId?: string;
    method?: string;
    endpoint?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLog[]; total: number }> {
    const where: Prisma.AuditLogWhereInput = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.botId) where.botId = filters.botId;
    if (filters.resourceType) where.resourceType = filters.resourceType;
    if (filters.resourceId) where.resourceId = filters.resourceId;
    if (filters.method) where.method = filters.method;
    if (filters.endpoint) where.endpoint = { contains: filters.endpoint };

    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) {
        where.timestamp.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.timestamp.lte = filters.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }
}
