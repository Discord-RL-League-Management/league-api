/**
 * ActivityLogService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ActivityLogService } from './activity-log.service';
import { ActivityLogRepository } from '../repositories/activity-log.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { ActivityLog, Prisma } from '@prisma/client';

describe('ActivityLogService', () => {
  let service: ActivityLogService;
  let mockRepository: ActivityLogRepository;
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
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockRepository = {
      create: vi.fn(),
      findByEntity: vi.fn(),
      findByUser: vi.fn(),
      findByGuild: vi.fn(),
      findWithFilters: vi.fn(),
    } as unknown as ActivityLogRepository;

    mockPrisma = {
      $transaction: vi.fn(),
    } as unknown as PrismaService;

    service = new ActivityLogService(mockRepository, mockPrisma);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('logActivity', () => {
    it('should_create_activity_log_with_all_fields', async () => {
      const entityType = 'League';
      const entityId = 'league_123';
      const eventType = 'UPDATE';
      const action = 'league.updated';
      const userId = 'user_123';
      const guildId = 'guild_123';
      const changes = { name: { old: 'Old', new: 'New' } };
      const metadata = { source: 'api' };
      const mockTx = {} as Prisma.TransactionClient;

      vi.mocked(mockRepository.create).mockResolvedValue(mockActivityLog);

      const result = await service.logActivity(
        mockTx,
        entityType,
        entityId,
        eventType,
        action,
        userId,
        guildId,
        changes,
        metadata,
      );

      expect(result).toEqual(mockActivityLog);
      expect(mockRepository.create).toHaveBeenCalledWith(
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
        mockTx,
      );
    });

    it('should_create_activity_log_with_optional_fields', async () => {
      const entityType = 'League';
      const entityId = 'league_123';
      const eventType = 'UPDATE';
      const action = 'league.updated';
      const mockTx = {} as Prisma.TransactionClient;

      vi.mocked(mockRepository.create).mockResolvedValue(mockActivityLog);

      const result = await service.logActivity(
        mockTx,
        entityType,
        entityId,
        eventType,
        action,
      );

      expect(result).toEqual(mockActivityLog);
      expect(mockRepository.create).toHaveBeenCalledWith(
        {
          entityType,
          entityId,
          eventType,
          action,
          userId: undefined,
          guildId: undefined,
          changes: undefined,
          metadata: undefined,
        },
        mockTx,
      );
    });
  });

  describe('findByEntity', () => {
    it('should_return_activity_logs_for_entity', async () => {
      const entityType = 'League';
      const entityId = 'league_123';
      const logs = [mockActivityLog];

      vi.mocked(mockRepository.findByEntity).mockResolvedValue(logs);

      const result = await service.findByEntity(entityType, entityId);

      expect(result).toEqual(logs);
      expect(mockRepository.findByEntity).toHaveBeenCalledWith(
        entityType,
        entityId,
      );
    });

    it('should_return_empty_array_when_no_logs_exist', async () => {
      const entityType = 'League';
      const entityId = 'league_123';

      vi.mocked(mockRepository.findByEntity).mockResolvedValue([]);

      const result = await service.findByEntity(entityType, entityId);

      expect(result).toEqual([]);
      expect(mockRepository.findByEntity).toHaveBeenCalledWith(
        entityType,
        entityId,
      );
    });
  });

  describe('findByUser', () => {
    it('should_return_activity_logs_for_user', async () => {
      const userId = 'user_123';
      const logs = [mockActivityLog];

      vi.mocked(mockRepository.findByUser).mockResolvedValue(logs);

      const result = await service.findByUser(userId);

      expect(result).toEqual(logs);
      expect(mockRepository.findByUser).toHaveBeenCalledWith(userId);
    });
  });

  describe('findByGuild', () => {
    it('should_return_activity_logs_for_guild', async () => {
      const guildId = 'guild_123';
      const logs = [mockActivityLog];

      vi.mocked(mockRepository.findByGuild).mockResolvedValue(logs);

      const result = await service.findByGuild(guildId);

      expect(result).toEqual(logs);
      expect(mockRepository.findByGuild).toHaveBeenCalledWith(guildId);
    });
  });

  describe('findWithFilters', () => {
    it('should_return_filtered_activity_logs', async () => {
      const filters = {
        entityType: 'League',
        entityId: 'league_123',
        userId: 'user_123',
        limit: 10,
        offset: 0,
      };
      const result = {
        logs: [mockActivityLog],
        total: 1,
      };

      vi.mocked(mockRepository.findWithFilters).mockResolvedValue(result);

      const response = await service.findWithFilters(filters);

      expect(response).toEqual(result);
      expect(mockRepository.findWithFilters).toHaveBeenCalledWith(filters);
    });

    it('should_return_empty_result_when_no_logs_match_filters', async () => {
      const filters = {
        entityType: 'League',
        limit: 10,
      };
      const result = {
        logs: [],
        total: 0,
      };

      vi.mocked(mockRepository.findWithFilters).mockResolvedValue(result);

      const response = await service.findWithFilters(filters);

      expect(response).toEqual(result);
      expect(mockRepository.findWithFilters).toHaveBeenCalledWith(filters);
    });
  });

  describe('logActivityStandalone', () => {
    it('should_create_activity_log_with_transaction', async () => {
      const entityType = 'League';
      const entityId = 'league_123';
      const eventType = 'UPDATE';
      const action = 'league.updated';

      const mockTransaction = vi.fn();
      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback: any) => {
          return callback(mockTransaction);
        },
      );
      vi.mocked(mockRepository.create).mockResolvedValue(mockActivityLog);

      const result = await service.logActivityStandalone(
        entityType,
        entityId,
        eventType,
        action,
      );

      expect(result).toEqual(mockActivityLog);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockRepository.create).toHaveBeenCalledWith(
        {
          entityType,
          entityId,
          eventType,
          action,
          userId: undefined,
          guildId: undefined,
          changes: undefined,
          metadata: undefined,
        },
        mockTransaction,
      );
    });

    it('should_handle_transaction_errors', async () => {
      const entityType = 'League';
      const entityId = 'league_123';
      const eventType = 'UPDATE';
      const action = 'league.updated';
      const error = new Error('Transaction failed');

      vi.mocked(mockPrisma.$transaction).mockRejectedValue(error);

      await expect(
        service.logActivityStandalone(entityType, entityId, eventType, action),
      ).rejects.toThrow('Transaction failed');
    });
  });
});
