import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLog } from '@prisma/client';

/**
 * Audit Log Repository - Single Responsibility: Data persistence for audit logs
 * 
 * Repository pattern: Handles only database operations.
 * No business logic, pure data access layer.
 */
@Injectable()
export class AuditLogRepository {
  constructor(private prisma: PrismaService) {}

  /**
   * Create audit log entry
   * Single Responsibility: Insert audit log
   */
  async create(data: {
    userId?: string;
    guildId?: string;
    action: string;
    resource: string;
    result: string;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
  }): Promise<AuditLog> {
    return this.prisma.auditLog.create({
      data,
    });
  }

  /**
   * Find audit logs by guild with filters
   * Single Responsibility: Query audit logs by guild
   */
  async findByGuild(
    guildId: string,
    filters: {
      userId?: string;
      action?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<AuditLog[]> {
    const where: any = { guildId };

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 50,
      skip: filters.offset || 0,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            globalName: true,
          },
        },
      },
    });
  }

  /**
   * Find audit logs by user with filters
   * Single Responsibility: Query audit logs by user
   */
  async findByUser(
    userId: string,
    filters: {
      guildId?: string;
      action?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<AuditLog[]> {
    const where: any = { userId };

    if (filters.guildId) {
      where.guildId = filters.guildId;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 50,
      skip: filters.offset || 0,
    });
  }
}

