/**
 * TrackerScrapingLogRepository Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TrackerScrapingLogRepository } from './tracker-scraping-log.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { TrackerScrapingStatus, Prisma } from '@prisma/client';

describe('TrackerScrapingLogRepository', () => {
  let repository: TrackerScrapingLogRepository;
  let mockPrisma: PrismaService;
  let mockTx: Prisma.TransactionClient;

  const mockScrapingLog = {
    id: 'log-123',
    trackerId: 'tracker-123',
    status: TrackerScrapingStatus.COMPLETED,
    seasonsScraped: 5,
    seasonsFailed: 0,
    startedAt: new Date('2024-01-01'),
    completedAt: new Date('2024-01-01'),
    errorMessage: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrisma = {
      trackerScrapingLog: {
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
      },
    } as unknown as PrismaService;

    mockTx = {
      trackerScrapingLog: {
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
      },
    } as unknown as Prisma.TransactionClient;

    repository = new TrackerScrapingLogRepository(mockPrisma);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('create', () => {
    it('should_create_log_when_valid_data_provided_without_transaction', async () => {
      const createData = {
        trackerId: 'tracker-123',
        status: TrackerScrapingStatus.COMPLETED,
        seasonsScraped: 5,
        seasonsFailed: 0,
        startedAt: new Date('2024-01-01'),
      };
      vi.mocked(mockPrisma.trackerScrapingLog.create).mockResolvedValue(
        mockScrapingLog as never,
      );

      const result = await repository.create(createData);

      expect(result).toEqual(mockScrapingLog);
      expect(mockPrisma.trackerScrapingLog.create).toHaveBeenCalledWith({
        data: createData,
      });
    });

    it('should_create_log_when_valid_data_provided_with_transaction', async () => {
      const createData = {
        trackerId: 'tracker-123',
        status: TrackerScrapingStatus.COMPLETED,
        seasonsScraped: 5,
        seasonsFailed: 0,
        startedAt: new Date('2024-01-01'),
      };
      vi.mocked(mockTx.trackerScrapingLog.create).mockResolvedValue(
        mockScrapingLog as never,
      );

      const result = await repository.create(createData, mockTx);

      expect(result).toEqual(mockScrapingLog);
      expect(mockTx.trackerScrapingLog.create).toHaveBeenCalledWith({
        data: createData,
      });
    });

    it('should_create_log_when_errorMessage_provided', async () => {
      const createData = {
        trackerId: 'tracker-123',
        status: TrackerScrapingStatus.FAILED,
        seasonsScraped: 0,
        seasonsFailed: 1,
        startedAt: new Date('2024-01-01'),
        errorMessage: 'Network error',
      };
      const logWithError = {
        ...mockScrapingLog,
        status: TrackerScrapingStatus.FAILED,
        errorMessage: 'Network error',
      };
      vi.mocked(mockPrisma.trackerScrapingLog.create).mockResolvedValue(
        logWithError as never,
      );

      const result = await repository.create(createData);

      expect(result).toEqual(logWithError);
      expect(result.errorMessage).toBe('Network error');
    });

    it('should_create_log_when_metadata_provided', async () => {
      const createData = {
        trackerId: 'tracker-123',
        status: TrackerScrapingStatus.COMPLETED,
        seasonsScraped: 5,
        seasonsFailed: 0,
        startedAt: new Date('2024-01-01'),
        metadata: { retryCount: 2 } as Prisma.InputJsonValue,
      };
      const logWithMetadata = {
        ...mockScrapingLog,
        metadata: { retryCount: 2 },
      };
      vi.mocked(mockPrisma.trackerScrapingLog.create).mockResolvedValue(
        logWithMetadata as never,
      );

      const result = await repository.create(createData);

      expect(result).toEqual(logWithMetadata);
      expect(result.metadata).toEqual({ retryCount: 2 });
    });

    it('should_create_log_when_errorMessage_and_metadata_provided', async () => {
      const createData = {
        trackerId: 'tracker-123',
        status: TrackerScrapingStatus.FAILED,
        seasonsScraped: 0,
        seasonsFailed: 1,
        startedAt: new Date('2024-01-01'),
        errorMessage: 'Network error',
        metadata: { retryCount: 3 } as Prisma.InputJsonValue,
      };
      const logWithBoth = {
        ...mockScrapingLog,
        status: TrackerScrapingStatus.FAILED,
        errorMessage: 'Network error',
        metadata: { retryCount: 3 },
      };
      vi.mocked(mockPrisma.trackerScrapingLog.create).mockResolvedValue(
        logWithBoth as never,
      );

      const result = await repository.create(createData);

      expect(result).toEqual(logWithBoth);
      expect(result.errorMessage).toBe('Network error');
      expect(result.metadata).toEqual({ retryCount: 3 });
    });
  });

  describe('update', () => {
    it('should_update_log_when_data_provided_without_transaction', async () => {
      const updateData = {
        status: TrackerScrapingStatus.COMPLETED,
        completedAt: new Date('2024-01-01'),
      };
      const updatedLog = {
        ...mockScrapingLog,
        ...updateData,
      };
      vi.mocked(mockPrisma.trackerScrapingLog.update).mockResolvedValue(
        updatedLog as never,
      );

      const result = await repository.update('log-123', updateData);

      expect(result).toEqual(updatedLog);
      expect(mockPrisma.trackerScrapingLog.update).toHaveBeenCalledWith({
        where: { id: 'log-123' },
        data: updateData,
      });
    });

    it('should_update_log_when_data_provided_with_transaction', async () => {
      const updateData = {
        status: TrackerScrapingStatus.COMPLETED,
        completedAt: new Date('2024-01-01'),
      };
      const updatedLog = {
        ...mockScrapingLog,
        ...updateData,
      };
      vi.mocked(mockTx.trackerScrapingLog.update).mockResolvedValue(
        updatedLog as never,
      );

      const result = await repository.update('log-123', updateData, mockTx);

      expect(result).toEqual(updatedLog);
      expect(mockTx.trackerScrapingLog.update).toHaveBeenCalledWith({
        where: { id: 'log-123' },
        data: updateData,
      });
    });

    it('should_update_log_when_partial_data_provided', async () => {
      const updateData = {
        status: TrackerScrapingStatus.FAILED,
        errorMessage: 'Update error',
      };
      const updatedLog = {
        ...mockScrapingLog,
        status: TrackerScrapingStatus.FAILED,
        errorMessage: 'Update error',
      };
      vi.mocked(mockPrisma.trackerScrapingLog.update).mockResolvedValue(
        updatedLog as never,
      );

      const result = await repository.update('log-123', updateData);

      expect(result).toEqual(updatedLog);
      expect(result.status).toBe(TrackerScrapingStatus.FAILED);
      expect(result.errorMessage).toBe('Update error');
    });

    it('should_update_log_when_completedAt_set_to_null', async () => {
      const updateData = {
        completedAt: null,
      };
      const updatedLog = {
        ...mockScrapingLog,
        completedAt: null,
      };
      vi.mocked(mockPrisma.trackerScrapingLog.update).mockResolvedValue(
        updatedLog as never,
      );

      const result = await repository.update('log-123', updateData);

      expect(result).toEqual(updatedLog);
      expect(result.completedAt).toBeNull();
    });

    it('should_update_log_when_metadata_provided', async () => {
      const updateData = {
        metadata: { updated: true } as Prisma.InputJsonValue,
      };
      const updatedLog = {
        ...mockScrapingLog,
        metadata: { updated: true },
      };
      vi.mocked(mockPrisma.trackerScrapingLog.update).mockResolvedValue(
        updatedLog as never,
      );

      const result = await repository.update('log-123', updateData);

      expect(result).toEqual(updatedLog);
      expect(result.metadata).toEqual({ updated: true });
    });
  });

  describe('findByTrackerId', () => {
    it('should_return_logs_when_tracker_exists_without_options', async () => {
      const logs = [mockScrapingLog];
      vi.mocked(mockPrisma.trackerScrapingLog.findMany).mockResolvedValue(
        logs as never,
      );

      const result = await repository.findByTrackerId('tracker-123');

      expect(result).toEqual(logs);
      expect(mockPrisma.trackerScrapingLog.findMany).toHaveBeenCalledWith({
        where: { trackerId: 'tracker-123' },
        orderBy: { startedAt: 'desc' },
        take: undefined,
      });
    });

    it('should_return_logs_when_tracker_exists_with_transaction', async () => {
      const logs = [mockScrapingLog];
      vi.mocked(mockTx.trackerScrapingLog.findMany).mockResolvedValue(
        logs as never,
      );

      const result = await repository.findByTrackerId(
        'tracker-123',
        undefined,
        mockTx,
      );

      expect(result).toEqual(logs);
      expect(mockTx.trackerScrapingLog.findMany).toHaveBeenCalledWith({
        where: { trackerId: 'tracker-123' },
        orderBy: { startedAt: 'desc' },
        take: undefined,
      });
    });

    it('should_return_logs_when_limit_provided', async () => {
      const logs = [mockScrapingLog];
      vi.mocked(mockPrisma.trackerScrapingLog.findMany).mockResolvedValue(
        logs as never,
      );

      const result = await repository.findByTrackerId('tracker-123', {
        limit: 10,
      });

      expect(result).toEqual(logs);
      expect(mockPrisma.trackerScrapingLog.findMany).toHaveBeenCalledWith({
        where: { trackerId: 'tracker-123' },
        orderBy: { startedAt: 'desc' },
        take: 10,
      });
    });

    it('should_return_logs_when_orderBy_asc_provided', async () => {
      const logs = [mockScrapingLog];
      vi.mocked(mockPrisma.trackerScrapingLog.findMany).mockResolvedValue(
        logs as never,
      );

      const result = await repository.findByTrackerId('tracker-123', {
        orderBy: 'asc',
      });

      expect(result).toEqual(logs);
      expect(mockPrisma.trackerScrapingLog.findMany).toHaveBeenCalledWith({
        where: { trackerId: 'tracker-123' },
        orderBy: { startedAt: 'asc' },
        take: undefined,
      });
    });

    it('should_return_logs_when_orderBy_desc_provided', async () => {
      const logs = [mockScrapingLog];
      vi.mocked(mockPrisma.trackerScrapingLog.findMany).mockResolvedValue(
        logs as never,
      );

      const result = await repository.findByTrackerId('tracker-123', {
        orderBy: 'desc',
      });

      expect(result).toEqual(logs);
      expect(mockPrisma.trackerScrapingLog.findMany).toHaveBeenCalledWith({
        where: { trackerId: 'tracker-123' },
        orderBy: { startedAt: 'desc' },
        take: undefined,
      });
    });

    it('should_return_logs_when_limit_and_orderBy_provided', async () => {
      const logs = [mockScrapingLog];
      vi.mocked(mockPrisma.trackerScrapingLog.findMany).mockResolvedValue(
        logs as never,
      );

      const result = await repository.findByTrackerId('tracker-123', {
        limit: 5,
        orderBy: 'asc',
      });

      expect(result).toEqual(logs);
      expect(mockPrisma.trackerScrapingLog.findMany).toHaveBeenCalledWith({
        where: { trackerId: 'tracker-123' },
        orderBy: { startedAt: 'asc' },
        take: 5,
      });
    });

    it('should_return_empty_array_when_no_logs_exist', async () => {
      vi.mocked(mockPrisma.trackerScrapingLog.findMany).mockResolvedValue(
        [] as never,
      );

      const result = await repository.findByTrackerId('tracker-123');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });
});
