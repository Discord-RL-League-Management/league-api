/**
 * ActivityLogRepository Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ActivityLogRepository } from './activity-log.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { ActivityLog, Prisma } from '@prisma/client';

describe('ActivityLogRepository', () => {
  let repository: ActivityLogRepository;
  let mockPrisma: PrismaService;

  const mockActivityLog: ActivityLog = {
    id: 'log_123',
    entityType: 'League',
    entityId: 'league_123',
    eventType: 'UPDATE',
    action: 'league.updated',
    userId: 'user_123',
    guildId: 'guild_123',
    changes: { name: { old: 'Old', new: 'New' } },
    metadata: null,
    timestamp: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrisma = {
      activityLog: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
    } as unknown as PrismaService;

    repository = new ActivityLogRepository(mockPrisma);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('create', () => {
    it('should_create_activity_log_without_transaction', async () => {
      const data: Prisma.ActivityLogCreateInput = {
        entityType: 'League',
        entityId: 'league_123',
        eventType: 'UPDATE',
        action: 'league.updated',
      };

      vi.mocked(mockPrisma.activityLog.create).mockResolvedValue(
        mockActivityLog,
      );

      const result = await repository.create(data);

      expect(result).toEqual(mockActivityLog);
      expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({ data });
    });

    it('should_create_activity_log_with_transaction', async () => {
      const data: Prisma.ActivityLogCreateInput = {
        entityType: 'League',
        entityId: 'league_123',
        eventType: 'UPDATE',
        action: 'league.updated',
      };
      const mockTx = {
        activityLog: {
          create: vi.fn().mockResolvedValue(mockActivityLog),
        },
      } as unknown as Prisma.TransactionClient;

      const result = await repository.create(data, mockTx);

      expect(result).toEqual(mockActivityLog);
      expect(mockTx.activityLog.create).toHaveBeenCalledWith({ data });
      expect(mockPrisma.activityLog.create).not.toHaveBeenCalled();
    });
  });

  describe('findByEntity', () => {
    it('should_return_activity_logs_for_entity', async () => {
      const entityType = 'League';
      const entityId = 'league_123';
      const logs = [mockActivityLog];

      vi.mocked(mockPrisma.activityLog.findMany).mockResolvedValue(logs);

      const result = await repository.findByEntity(entityType, entityId);

      expect(result).toEqual(logs);
      expect(mockPrisma.activityLog.findMany).toHaveBeenCalledWith({
        where: {
          entityType,
          entityId,
        },
        orderBy: { timestamp: 'desc' },
      });
    });

    it('should_return_empty_array_when_no_logs_exist', async () => {
      const entityType = 'League';
      const entityId = 'league_123';

      vi.mocked(mockPrisma.activityLog.findMany).mockResolvedValue([]);

      const result = await repository.findByEntity(entityType, entityId);

      expect(result).toEqual([]);
      expect(mockPrisma.activityLog.findMany).toHaveBeenCalledWith({
        where: {
          entityType,
          entityId,
        },
        orderBy: { timestamp: 'desc' },
      });
    });
  });

  describe('findByUser', () => {
    it('should_return_activity_logs_for_user', async () => {
      const userId = 'user_123';
      const logs = [mockActivityLog];

      vi.mocked(mockPrisma.activityLog.findMany).mockResolvedValue(logs);

      const result = await repository.findByUser(userId);

      expect(result).toEqual(logs);
      expect(mockPrisma.activityLog.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { timestamp: 'desc' },
      });
    });
  });

  describe('findByGuild', () => {
    it('should_return_activity_logs_for_guild', async () => {
      const guildId = 'guild_123';
      const logs = [mockActivityLog];

      vi.mocked(mockPrisma.activityLog.findMany).mockResolvedValue(logs);

      const result = await repository.findByGuild(guildId);

      expect(result).toEqual(logs);
      expect(mockPrisma.activityLog.findMany).toHaveBeenCalledWith({
        where: { guildId },
        orderBy: { timestamp: 'desc' },
      });
    });
  });

  describe('findWithFilters', () => {
    it('should_return_filtered_logs_with_all_filters', async () => {
      const filters = {
        entityType: 'League',
        entityId: 'league_123',
        userId: 'user_123',
        guildId: 'guild_123',
        eventType: 'UPDATE',
        limit: 10,
        offset: 0,
      };
      const logs = [mockActivityLog];
      const total = 1;

      vi.mocked(mockPrisma.activityLog.findMany).mockResolvedValue(logs);
      vi.mocked(mockPrisma.activityLog.count).mockResolvedValue(total);

      const result = await repository.findWithFilters(filters);

      expect(result).toEqual({ logs, total });
      expect(mockPrisma.activityLog.findMany).toHaveBeenCalledWith({
        where: {
          entityType: filters.entityType,
          entityId: filters.entityId,
          userId: filters.userId,
          guildId: filters.guildId,
          eventType: filters.eventType,
        },
        orderBy: { timestamp: 'desc' },
        take: filters.limit,
        skip: filters.offset,
      });
      expect(mockPrisma.activityLog.count).toHaveBeenCalledWith({
        where: {
          entityType: filters.entityType,
          entityId: filters.entityId,
          userId: filters.userId,
          guildId: filters.guildId,
          eventType: filters.eventType,
        },
      });
    });

    it('should_use_default_limit_and_offset_when_not_provided', async () => {
      const filters = {
        entityType: 'League',
      };
      const logs = [mockActivityLog];
      const total = 1;

      vi.mocked(mockPrisma.activityLog.findMany).mockResolvedValue(logs);
      vi.mocked(mockPrisma.activityLog.count).mockResolvedValue(total);

      const result = await repository.findWithFilters(filters);

      expect(result).toEqual({ logs, total });
      expect(mockPrisma.activityLog.findMany).toHaveBeenCalledWith({
        where: {
          entityType: filters.entityType,
        },
        orderBy: { timestamp: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('should_apply_partial_filters', async () => {
      const filters = {
        userId: 'user_123',
        limit: 20,
      };
      const logs = [mockActivityLog];
      const total = 1;

      vi.mocked(mockPrisma.activityLog.findMany).mockResolvedValue(logs);
      vi.mocked(mockPrisma.activityLog.count).mockResolvedValue(total);

      const result = await repository.findWithFilters(filters);

      expect(result).toEqual({ logs, total });
      expect(mockPrisma.activityLog.findMany).toHaveBeenCalledWith({
        where: {
          userId: filters.userId,
        },
        orderBy: { timestamp: 'desc' },
        take: filters.limit,
        skip: 0,
      });
    });
  });
});
