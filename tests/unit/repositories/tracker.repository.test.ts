/**
 * TrackerRepository Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TrackerRepository } from '@/trackers/repositories/tracker.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { TrackerScrapingStatus } from '@prisma/client';

describe('TrackerRepository', () => {
  let repository: TrackerRepository;
  let mockPrisma: PrismaService;

  beforeEach(() => {
    mockPrisma = {
      tracker: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    } as unknown as PrismaService;

    repository = new TrackerRepository(mockPrisma);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findPendingAndStaleForGuild', () => {
    const guildId = 'guild_123';
    const refreshIntervalHours = 24;

    it('should_use_flattened_or_structure_with_three_conditions', async () => {
      const mockResult = [{ id: 'tracker_1' }];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockResult as never,
      );

      await repository.findPendingAndStaleForGuild(
        guildId,
        refreshIntervalHours,
      );

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      expect(callArgs?.where?.OR).toHaveLength(3);
    });

    it('should_include_pending_null_and_stale_conditions_in_or_array', async () => {
      const mockResult = [{ id: 'tracker_1' }];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockResult as never,
      );

      await repository.findPendingAndStaleForGuild(
        guildId,
        refreshIntervalHours,
      );

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      expect(callArgs?.where?.OR?.[0]).toEqual({
        scrapingStatus: TrackerScrapingStatus.PENDING,
      });
      expect(callArgs?.where?.OR?.[1]).toEqual({ lastScrapedAt: null });
      expect(callArgs?.where?.OR?.[2]).toHaveProperty('lastScrapedAt');
      expect(callArgs?.where?.OR?.[2]?.lastScrapedAt).toHaveProperty('lt');
    });

    it('should_not_have_nested_or_structure', async () => {
      const mockResult = [{ id: 'tracker_1' }];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockResult as never,
      );

      await repository.findPendingAndStaleForGuild(
        guildId,
        refreshIntervalHours,
      );

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      expect(callArgs?.where?.OR?.[1]).not.toHaveProperty('OR');
      expect(callArgs?.where?.OR?.[2]).not.toHaveProperty('OR');
    });

    it('should_calculate_cutoff_time_correctly', async () => {
      const mockResult = [{ id: 'tracker_1' }];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockResult as never,
      );

      await repository.findPendingAndStaleForGuild(
        guildId,
        refreshIntervalHours,
      );

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      const cutoffTime = (callArgs?.where?.OR?.[2] as any)?.lastScrapedAt
        ?.lt as Date | undefined;

      // Cutoff should be approximately (now - 24 hours)
      const expectedCutoff = new Date();
      expectedCutoff.setHours(expectedCutoff.getHours() - refreshIntervalHours);

      // Allow 1 second tolerance for execution time
      expect(cutoffTime).toBeDefined();
      expect(cutoffTime).toBeTruthy();
      const timeDiff = Math.abs(
        cutoffTime!.getTime() - expectedCutoff.getTime(),
      );
      expect(timeDiff).toBeLessThan(1000);
    });

    it('should_filter_by_guild_id', async () => {
      const mockResult = [{ id: 'tracker_1' }];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockResult as never,
      );

      await repository.findPendingAndStaleForGuild(
        guildId,
        refreshIntervalHours,
      );

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      expect((callArgs?.where as any)?.user?.guildMembers?.some?.guildId).toBe(
        guildId,
      );
    });

    it('should_exclude_in_progress_trackers', async () => {
      const mockResult = [{ id: 'tracker_1' }];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockResult as never,
      );

      await repository.findPendingAndStaleForGuild(
        guildId,
        refreshIntervalHours,
      );

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      expect((callArgs?.where as any)?.scrapingStatus?.not).toBe(
        TrackerScrapingStatus.IN_PROGRESS,
      );
    });

    it('should_return_tracker_ids_only', async () => {
      const mockResult = [{ id: 'tracker_1' }, { id: 'tracker_2' }];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockResult as never,
      );

      const result = await repository.findPendingAndStaleForGuild(
        guildId,
        refreshIntervalHours,
      );

      expect(result).toEqual([{ id: 'tracker_1' }, { id: 'tracker_2' }]);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).not.toHaveProperty('url');
      expect(result[0]).not.toHaveProperty('userId');
    });

    it('should_include_pending_trackers_in_query', async () => {
      const mockResult = [{ id: 'tracker_1' }];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockResult as never,
      );

      await repository.findPendingAndStaleForGuild(
        guildId,
        refreshIntervalHours,
      );

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      const orConditions = callArgs?.where?.OR;
      const hasPendingCondition =
        orConditions &&
        Array.isArray(orConditions) &&
        orConditions.some(
          (condition: unknown) =>
            typeof condition === 'object' &&
            condition !== null &&
            'scrapingStatus' in condition &&
            condition.scrapingStatus === TrackerScrapingStatus.PENDING,
        );
      expect(hasPendingCondition).toBe(true);
    });

    it('should_include_null_lastScrapedAt_condition_in_query', async () => {
      const mockResult = [{ id: 'tracker_1' }];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockResult as never,
      );

      await repository.findPendingAndStaleForGuild(
        guildId,
        refreshIntervalHours,
      );

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      const orConditions = callArgs?.where?.OR;
      const hasNullCondition =
        orConditions &&
        Array.isArray(orConditions) &&
        orConditions.some(
          (condition: unknown) =>
            typeof condition === 'object' &&
            condition !== null &&
            'lastScrapedAt' in condition &&
            condition.lastScrapedAt === null,
        );
      expect(hasNullCondition).toBe(true);
    });

    it('should_include_stale_lastScrapedAt_condition_in_query', async () => {
      const mockResult = [{ id: 'tracker_1' }];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockResult as never,
      );

      await repository.findPendingAndStaleForGuild(
        guildId,
        refreshIntervalHours,
      );

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      const orConditions = callArgs?.where?.OR;
      const hasStaleCondition =
        orConditions &&
        Array.isArray(orConditions) &&
        orConditions.some(
          (condition: unknown) =>
            typeof condition === 'object' &&
            condition !== null &&
            'lastScrapedAt' in condition &&
            typeof condition.lastScrapedAt === 'object' &&
            condition.lastScrapedAt !== null &&
            'lt' in condition.lastScrapedAt,
        );
      expect(hasStaleCondition).toBe(true);
    });

    it('should_handle_different_refresh_intervals', async () => {
      const mockResult = [{ id: 'tracker_1' }];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockResult as never,
      );
      const customRefreshHours = 48;

      await repository.findPendingAndStaleForGuild(guildId, customRefreshHours);

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      const cutoffTime = (callArgs?.where?.OR?.[2] as any)?.lastScrapedAt
        ?.lt as Date | undefined;

      const expectedCutoff = new Date();
      expectedCutoff.setHours(expectedCutoff.getHours() - customRefreshHours);

      expect(cutoffTime).toBeDefined();
      expect(cutoffTime).toBeTruthy();
      const timeDiff = Math.abs(
        (cutoffTime as Date).getTime() - expectedCutoff.getTime(),
      );
      expect(timeDiff).toBeLessThan(1000);
    });
  });
});
