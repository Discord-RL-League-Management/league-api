/**
 * TrackerRepository Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TrackerRepository } from '@/trackers/repositories/tracker.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { TrackerScrapingStatus } from '@prisma/client';

describe('TrackerRepository', () => {
  let repository: TrackerRepository;
  let mockPrisma: PrismaService;

  beforeEach(() => {
    // ARRANGE: Setup test dependencies
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
      // ARRANGE
      const mockResult = [{ id: 'tracker_1' }];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(mockResult);

      // ACT
      await repository.findPendingAndStaleForGuild(
        guildId,
        refreshIntervalHours,
      );

      // ASSERT: Verify OR array has 3 elements (flattened structure)
      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock.calls[0][0];
      expect(callArgs.where.OR).toHaveLength(3);
    });

    it('should_include_pending_null_and_stale_conditions_in_or_array', async () => {
      // ARRANGE
      const mockResult = [{ id: 'tracker_1' }];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(mockResult);

      // ACT
      await repository.findPendingAndStaleForGuild(
        guildId,
        refreshIntervalHours,
      );

      // ASSERT: Verify each condition is present
      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock.calls[0][0];
      expect(callArgs.where.OR[0]).toEqual({
        scrapingStatus: TrackerScrapingStatus.PENDING,
      });
      expect(callArgs.where.OR[1]).toEqual({ lastScrapedAt: null });
      expect(callArgs.where.OR[2]).toHaveProperty('lastScrapedAt');
      expect(callArgs.where.OR[2].lastScrapedAt).toHaveProperty('lt');
    });

    it('should_not_have_nested_or_structure', async () => {
      // ARRANGE
      const mockResult = [{ id: 'tracker_1' }];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(mockResult);

      // ACT
      await repository.findPendingAndStaleForGuild(
        guildId,
        refreshIntervalHours,
      );

      // ASSERT: Verify no nested OR structure
      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock.calls[0][0];
      expect(callArgs.where.OR[1]).not.toHaveProperty('OR');
      expect(callArgs.where.OR[2]).not.toHaveProperty('OR');
    });

    it('should_calculate_cutoff_time_correctly', async () => {
      // ARRANGE
      const mockResult = [{ id: 'tracker_1' }];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(mockResult);

      // ACT
      await repository.findPendingAndStaleForGuild(
        guildId,
        refreshIntervalHours,
      );

      // ASSERT: Verify cutoff time is calculated correctly (flattened structure)
      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock.calls[0][0];
      const cutoffTime = callArgs.where.OR[2].lastScrapedAt.lt;

      // Cutoff should be approximately (now - 24 hours)
      const expectedCutoff = new Date();
      expectedCutoff.setHours(expectedCutoff.getHours() - refreshIntervalHours);

      // Allow 1 second tolerance for execution time
      const timeDiff = Math.abs(
        cutoffTime.getTime() - expectedCutoff.getTime(),
      );
      expect(timeDiff).toBeLessThan(1000);
    });

    it('should_filter_by_guild_id', async () => {
      // ARRANGE
      const mockResult = [{ id: 'tracker_1' }];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(mockResult);

      // ACT
      await repository.findPendingAndStaleForGuild(
        guildId,
        refreshIntervalHours,
      );

      // ASSERT: Verify guild filter
      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock.calls[0][0];
      expect(callArgs.where.user.guildMembers.some.guildId).toBe(guildId);
    });

    it('should_exclude_in_progress_trackers', async () => {
      // ARRANGE
      const mockResult = [{ id: 'tracker_1' }];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(mockResult);

      // ACT
      await repository.findPendingAndStaleForGuild(
        guildId,
        refreshIntervalHours,
      );

      // ASSERT: Verify IN_PROGRESS exclusion
      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock.calls[0][0];
      expect(callArgs.where.scrapingStatus.not).toBe(
        TrackerScrapingStatus.IN_PROGRESS,
      );
    });

    it('should_return_tracker_ids_only', async () => {
      // ARRANGE
      const mockResult = [{ id: 'tracker_1' }, { id: 'tracker_2' }];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(mockResult);

      // ACT
      const result = await repository.findPendingAndStaleForGuild(
        guildId,
        refreshIntervalHours,
      );

      // ASSERT: Verify return structure
      expect(result).toEqual([{ id: 'tracker_1' }, { id: 'tracker_2' }]);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).not.toHaveProperty('url');
      expect(result[0]).not.toHaveProperty('userId');
    });

    it('should_include_pending_trackers_in_query', async () => {
      // ARRANGE
      const mockResult = [{ id: 'tracker_1' }];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(mockResult);

      // ACT
      await repository.findPendingAndStaleForGuild(
        guildId,
        refreshIntervalHours,
      );

      // ASSERT: Verify PENDING condition is in OR array
      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock.calls[0][0];
      const orConditions = callArgs.where.OR;
      const hasPendingCondition = orConditions.some(
        (condition: unknown) =>
          typeof condition === 'object' &&
          condition !== null &&
          'scrapingStatus' in condition &&
          condition.scrapingStatus === TrackerScrapingStatus.PENDING,
      );
      expect(hasPendingCondition).toBe(true);
    });

    it('should_include_null_lastScrapedAt_condition_in_query', async () => {
      // ARRANGE
      const mockResult = [{ id: 'tracker_1' }];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(mockResult);

      // ACT
      await repository.findPendingAndStaleForGuild(
        guildId,
        refreshIntervalHours,
      );

      // ASSERT: Verify null condition is in flattened OR array
      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock.calls[0][0];
      const orConditions = callArgs.where.OR;
      const hasNullCondition = orConditions.some(
        (condition: unknown) =>
          typeof condition === 'object' &&
          condition !== null &&
          'lastScrapedAt' in condition &&
          condition.lastScrapedAt === null,
      );
      expect(hasNullCondition).toBe(true);
    });

    it('should_include_stale_lastScrapedAt_condition_in_query', async () => {
      // ARRANGE
      const mockResult = [{ id: 'tracker_1' }];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(mockResult);

      // ACT
      await repository.findPendingAndStaleForGuild(
        guildId,
        refreshIntervalHours,
      );

      // ASSERT: Verify stale condition is in flattened OR array
      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock.calls[0][0];
      const orConditions = callArgs.where.OR;
      const hasStaleCondition = orConditions.some(
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
      // ARRANGE
      const mockResult = [{ id: 'tracker_1' }];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(mockResult);
      const customRefreshHours = 48;

      // ACT
      await repository.findPendingAndStaleForGuild(guildId, customRefreshHours);

      // ASSERT: Verify cutoff time uses custom interval (flattened structure)
      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock.calls[0][0];
      const cutoffTime = callArgs.where.OR[2].lastScrapedAt.lt;

      const expectedCutoff = new Date();
      expectedCutoff.setHours(expectedCutoff.getHours() - customRefreshHours);

      const timeDiff = Math.abs(
        cutoffTime.getTime() - expectedCutoff.getTime(),
      );
      expect(timeDiff).toBeLessThan(1000);
    });
  });
});
