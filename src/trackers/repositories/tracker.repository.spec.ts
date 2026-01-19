/**
 * TrackerRepository Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TrackerRepository } from './tracker.repository';
import { PrismaService } from '@/prisma/prisma.service';
import {
  TrackerScrapingStatus,
  Game,
  GamePlatform,
  Tracker,
  TrackerSeason,
  TrackerScrapingLog,
} from '@prisma/client';

describe('TrackerRepository', () => {
  let repository: TrackerRepository;
  let mockPrisma: PrismaService;

  beforeEach(() => {
    mockPrisma = {
      tracker: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
        groupBy: vi.fn(),
      },
      trackerScrapingLog: {
        findMany: vi.fn(),
        count: vi.fn(),
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

      const expectedCutoff = new Date();
      expectedCutoff.setHours(expectedCutoff.getHours() - refreshIntervalHours);

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

  describe('findPending', () => {
    it('should_return_pending_trackers_when_trackers_exist', async () => {
      const mockResult = [{ id: 'tracker_1' }, { id: 'tracker_2' }];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockResult as never,
      );

      const result = await repository.findPending();

      expect(result).toEqual(mockResult);
      expect(mockPrisma.tracker.findMany).toHaveBeenCalledTimes(1);
    });

    it('should_return_empty_array_when_no_pending_trackers', async () => {
      const mockResult: Array<{ id: string }> = [];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockResult as never,
      );

      const result = await repository.findPending();

      expect(result).toEqual([]);
    });

    it('should_filter_by_pending_status_only', async () => {
      const mockResult = [{ id: 'tracker_1' }];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockResult as never,
      );

      await repository.findPending();

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      expect(callArgs?.where?.scrapingStatus).toBe(
        TrackerScrapingStatus.PENDING,
      );
    });

    it('should_include_only_active_and_not_deleted_trackers', async () => {
      const mockResult = [{ id: 'tracker_1' }];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockResult as never,
      );

      await repository.findPending();

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      expect(callArgs?.where?.isActive).toBe(true);
      expect(callArgs?.where?.isDeleted).toBe(false);
    });

    it('should_return_only_id_field', async () => {
      const mockResult = [{ id: 'tracker_1' }];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockResult as never,
      );

      const result = await repository.findPending();

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      expect(callArgs?.select).toEqual({ id: true });
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).not.toHaveProperty('url');
    });
  });

  describe('findPendingAndStale', () => {
    const refreshIntervalHours = 24;

    it('should_include_pending_stale_and_null_lastScrapedAt_when_refresh_interval_provided', async () => {
      const mockResult = [{ id: 'tracker_1' }];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockResult as never,
      );

      await repository.findPendingAndStale(refreshIntervalHours);

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      expect(callArgs?.where?.OR).toHaveLength(3);
      expect(callArgs?.where?.OR?.[0]).toEqual({
        scrapingStatus: TrackerScrapingStatus.PENDING,
      });
      expect(callArgs?.where?.OR?.[1]).toEqual({ lastScrapedAt: null });
      expect(callArgs?.where?.OR?.[2]).toHaveProperty('lastScrapedAt');
      expect(callArgs?.where?.OR?.[2]?.lastScrapedAt).toHaveProperty('lt');
    });

    it('should_calculate_cutoff_time_correctly', async () => {
      const mockResult = [{ id: 'tracker_1' }];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockResult as never,
      );

      await repository.findPendingAndStale(refreshIntervalHours);

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      const cutoffTime = (callArgs?.where?.OR?.[2] as any)?.lastScrapedAt
        ?.lt as Date | undefined;

      const expectedCutoff = new Date();
      expectedCutoff.setHours(expectedCutoff.getHours() - refreshIntervalHours);

      expect(cutoffTime).toBeDefined();
      expect(cutoffTime).toBeTruthy();
      const timeDiff = Math.abs(
        cutoffTime!.getTime() - expectedCutoff.getTime(),
      );
      expect(timeDiff).toBeLessThan(1000);
    });

    it('should_exclude_in_progress_trackers', async () => {
      const mockResult = [{ id: 'tracker_1' }];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockResult as never,
      );

      await repository.findPendingAndStale(refreshIntervalHours);

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      expect((callArgs?.where as any)?.scrapingStatus?.not).toBe(
        TrackerScrapingStatus.IN_PROGRESS,
      );
    });

    it('should_filter_by_active_and_not_deleted', async () => {
      const mockResult = [{ id: 'tracker_1' }];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockResult as never,
      );

      await repository.findPendingAndStale(refreshIntervalHours);

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      expect(callArgs?.where?.isActive).toBe(true);
      expect(callArgs?.where?.isDeleted).toBe(false);
    });

    it('should_return_only_id_field', async () => {
      const mockResult = [{ id: 'tracker_1' }];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockResult as never,
      );

      const result = await repository.findPendingAndStale(refreshIntervalHours);

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      expect(callArgs?.select).toEqual({ id: true });
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).not.toHaveProperty('url');
    });

    it('should_handle_different_refresh_intervals', async () => {
      const mockResult = [{ id: 'tracker_1' }];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockResult as never,
      );
      const customRefreshHours = 48;

      await repository.findPendingAndStale(customRefreshHours);

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      const cutoffTime = (callArgs?.where?.OR?.[2] as any)?.lastScrapedAt
        ?.lt as Date | undefined;

      const expectedCutoff = new Date();
      expectedCutoff.setHours(expectedCutoff.getHours() - customRefreshHours);

      expect(cutoffTime).toBeDefined();
      const timeDiff = Math.abs(
        cutoffTime!.getTime() - expectedCutoff.getTime(),
      );
      expect(timeDiff).toBeLessThan(1000);
    });
  });

  describe('findByIdsWithUserId', () => {
    it('should_return_trackers_with_user_ids_when_tracker_ids_provided', async () => {
      const trackerIds = ['tracker_1', 'tracker_2'];
      const mockResult = [
        { id: 'tracker_1', userId: 'user_1' },
        { id: 'tracker_2', userId: 'user_2' },
      ];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockResult as never,
      );

      const result = await repository.findByIdsWithUserId(trackerIds);

      expect(result).toEqual(mockResult);
      expect(mockPrisma.tracker.findMany).toHaveBeenCalledTimes(1);
    });

    it('should_return_empty_array_when_tracker_ids_array_is_empty', async () => {
      const trackerIds: string[] = [];

      const result = await repository.findByIdsWithUserId(trackerIds);

      expect(result).toEqual([]);
      expect(mockPrisma.tracker.findMany).not.toHaveBeenCalled();
    });

    it('should_filter_by_provided_ids_only', async () => {
      const trackerIds = ['tracker_1', 'tracker_2'];
      const mockResult = [
        { id: 'tracker_1', userId: 'user_1' },
        { id: 'tracker_2', userId: 'user_2' },
      ];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockResult as never,
      );

      await repository.findByIdsWithUserId(trackerIds);

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      expect(callArgs?.where?.id).toEqual({ in: trackerIds });
    });

    it('should_return_only_id_and_userId_fields', async () => {
      const trackerIds = ['tracker_1'];
      const mockResult = [{ id: 'tracker_1', userId: 'user_1' }];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockResult as never,
      );

      const result = await repository.findByIdsWithUserId(trackerIds);

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      expect(callArgs?.select).toEqual({ id: true, userId: true });
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('userId');
      expect(result[0]).not.toHaveProperty('url');
    });
  });

  describe('create', () => {
    it('should_create_tracker_when_valid_data_provided', async () => {
      const trackerData = {
        url: 'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview',
        game: Game.ROCKET_LEAGUE,
        platform: GamePlatform.STEAM,
        username: 'testuser',
        userId: 'user_123',
        displayName: 'Test User',
        registrationChannelId: 'channel_123',
        registrationInteractionToken: 'token_123',
      };
      const mockTracker: Tracker = {
        id: 'tracker_123',
        ...trackerData,
        guildId: null,
        isActive: true,
        isDeleted: false,
        lastScrapedAt: null,
        scrapingStatus: TrackerScrapingStatus.PENDING,
        scrapingError: null,
        scrapingAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(mockPrisma.tracker.create).mockResolvedValue(
        mockTracker as never,
      );

      const result = await repository.create(trackerData);

      expect(result).toEqual(mockTracker);
      expect(mockPrisma.tracker.create).toHaveBeenCalledWith({
        data: trackerData,
      });
    });

    it('should_create_tracker_without_optional_fields_when_not_provided', async () => {
      const trackerData = {
        url: 'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview',
        game: Game.ROCKET_LEAGUE,
        platform: GamePlatform.STEAM,
        username: 'testuser',
        userId: 'user_123',
      };
      const mockTracker: Tracker = {
        id: 'tracker_123',
        ...trackerData,
        displayName: null,
        registrationChannelId: null,
        registrationInteractionToken: null,
        guildId: null,
        isActive: true,
        isDeleted: false,
        lastScrapedAt: null,
        scrapingStatus: TrackerScrapingStatus.PENDING,
        scrapingError: null,
        scrapingAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(mockPrisma.tracker.create).mockResolvedValue(
        mockTracker as never,
      );

      const result = await repository.create(trackerData);

      expect(result).toEqual(mockTracker);
      expect(mockPrisma.tracker.create).toHaveBeenCalledWith({
        data: trackerData,
      });
    });
  });

  describe('findByUrl', () => {
    it('should_return_tracker_when_url_exists', async () => {
      const url =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview';
      const mockTracker: Tracker = {
        id: 'tracker_123',
        url,
        game: Game.ROCKET_LEAGUE,
        platform: GamePlatform.STEAM,
        username: 'testuser',
        userId: 'user_123',
        displayName: null,
        registrationChannelId: null,
        registrationInteractionToken: null,
        guildId: null,
        isActive: true,
        isDeleted: false,
        lastScrapedAt: null,
        scrapingStatus: TrackerScrapingStatus.PENDING,
        scrapingError: null,
        scrapingAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(mockPrisma.tracker.findUnique).mockResolvedValue(
        mockTracker as never,
      );

      const result = await repository.findByUrl(url);

      expect(result).toEqual(mockTracker);
      expect(mockPrisma.tracker.findUnique).toHaveBeenCalledWith({
        where: { url },
      });
    });

    it('should_return_null_when_url_does_not_exist', async () => {
      const url = 'https://nonexistent.url';
      vi.mocked(mockPrisma.tracker.findUnique).mockResolvedValue(null);

      const result = await repository.findByUrl(url);

      expect(result).toBeNull();
      expect(mockPrisma.tracker.findUnique).toHaveBeenCalledWith({
        where: { url },
      });
    });
  });

  describe('findById', () => {
    it('should_return_tracker_with_relations_when_id_exists', async () => {
      const id = 'tracker_123';
      const mockTracker = {
        id,
        url: 'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview',
        game: Game.ROCKET_LEAGUE,
        platform: GamePlatform.STEAM,
        username: 'testuser',
        userId: 'user_123',
        user: {
          id: 'user_123',
          username: 'testuser',
        },
        snapshots: [
          {
            id: 'snapshot_1',
            capturedAt: new Date(),
          },
        ],
      };
      vi.mocked(mockPrisma.tracker.findUnique).mockResolvedValue(
        mockTracker as never,
      );

      const result = await repository.findById(id);

      expect(result).toEqual(mockTracker);
      expect(mockPrisma.tracker.findUnique).toHaveBeenCalledWith({
        where: { id },
        include: {
          user: true,
          snapshots: {
            orderBy: { capturedAt: 'desc' },
            take: 10,
          },
        },
      });
    });

    it('should_return_null_when_id_does_not_exist', async () => {
      const id = 'nonexistent_id';
      vi.mocked(mockPrisma.tracker.findUnique).mockResolvedValue(null);

      const result = await repository.findById(id);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should_update_tracker_when_id_and_data_provided', async () => {
      const id = 'tracker_123';
      const updateData = {
        isActive: false,
        scrapingStatus: TrackerScrapingStatus.COMPLETED,
      };
      const mockUpdatedTracker: Tracker = {
        id,
        url: 'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview',
        game: Game.ROCKET_LEAGUE,
        platform: GamePlatform.STEAM,
        username: 'testuser',
        userId: 'user_123',
        displayName: null,
        registrationChannelId: null,
        registrationInteractionToken: null,
        guildId: null,
        isActive: false,
        isDeleted: false,
        lastScrapedAt: new Date(),
        scrapingStatus: TrackerScrapingStatus.COMPLETED,
        scrapingError: null,
        scrapingAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(mockPrisma.tracker.update).mockResolvedValue(
        mockUpdatedTracker as never,
      );

      const result = await repository.update(id, updateData);

      expect(result).toEqual(mockUpdatedTracker);
      expect(mockPrisma.tracker.update).toHaveBeenCalledWith({
        where: { id },
        data: updateData,
      });
    });
  });

  describe('softDelete', () => {
    it('should_set_isDeleted_to_true_when_called', async () => {
      const id = 'tracker_123';
      const mockDeletedTracker: Tracker = {
        id,
        url: 'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview',
        game: Game.ROCKET_LEAGUE,
        platform: GamePlatform.STEAM,
        username: 'testuser',
        userId: 'user_123',
        displayName: null,
        registrationChannelId: null,
        registrationInteractionToken: null,
        guildId: null,
        isActive: true,
        isDeleted: true,
        lastScrapedAt: null,
        scrapingStatus: TrackerScrapingStatus.PENDING,
        scrapingError: null,
        scrapingAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(mockPrisma.tracker.update).mockResolvedValue(
        mockDeletedTracker as never,
      );

      const result = await repository.softDelete(id);

      expect(result).toEqual(mockDeletedTracker);
      expect(result.isDeleted).toBe(true);
      expect(mockPrisma.tracker.update).toHaveBeenCalledWith({
        where: { id },
        data: { isDeleted: true },
      });
    });
  });

  describe('checkUrlUniqueness', () => {
    it('should_return_true_when_url_does_not_exist', async () => {
      const url = 'https://new.url';
      vi.mocked(mockPrisma.tracker.findUnique).mockResolvedValue(null);

      const result = await repository.checkUrlUniqueness(url);

      expect(result).toBe(true);
      expect(mockPrisma.tracker.findUnique).toHaveBeenCalledWith({
        where: { url },
      });
    });

    it('should_return_false_when_url_exists', async () => {
      const url = 'https://existing.url';
      const mockTracker: Tracker = {
        id: 'tracker_123',
        url,
        game: Game.ROCKET_LEAGUE,
        platform: GamePlatform.STEAM,
        username: 'testuser',
        userId: 'user_123',
        displayName: null,
        registrationChannelId: null,
        registrationInteractionToken: null,
        guildId: null,
        isActive: true,
        isDeleted: false,
        lastScrapedAt: null,
        scrapingStatus: TrackerScrapingStatus.PENDING,
        scrapingError: null,
        scrapingAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(mockPrisma.tracker.findUnique).mockResolvedValue(
        mockTracker as never,
      );

      const result = await repository.checkUrlUniqueness(url);

      expect(result).toBe(false);
    });
  });

  describe('findByUserId', () => {
    const userId = 'user_123';

    it('should_apply_default_pagination_when_options_not_provided', async () => {
      const mockTrackers: Tracker[] = [];
      const mockTotal = 0;
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockTrackers as never,
      );
      vi.mocked(mockPrisma.tracker.count).mockResolvedValue(mockTotal);

      const result = await repository.findByUserId(userId);

      expect(result.data).toEqual([]);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(50);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.pages).toBe(0);
    });

    it('should_filter_by_platform_when_single_platform_provided', async () => {
      const mockTrackers: Tracker[] = [];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockTrackers as never,
      );
      vi.mocked(mockPrisma.tracker.count).mockResolvedValue(0);

      await repository.findByUserId(userId, { platform: GamePlatform.STEAM });

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      expect(callArgs?.where?.platform).toBe(GamePlatform.STEAM);
    });

    it('should_filter_by_platform_array_when_multiple_platforms_provided', async () => {
      const mockTrackers: Tracker[] = [];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockTrackers as never,
      );
      vi.mocked(mockPrisma.tracker.count).mockResolvedValue(0);

      await repository.findByUserId(userId, {
        platform: [GamePlatform.STEAM, GamePlatform.EPIC],
      });

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      expect(callArgs?.where?.platform).toEqual({
        in: [GamePlatform.STEAM, GamePlatform.EPIC],
      });
    });

    it('should_filter_by_status_when_status_provided', async () => {
      const mockTrackers: Tracker[] = [];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockTrackers as never,
      );
      vi.mocked(mockPrisma.tracker.count).mockResolvedValue(0);

      await repository.findByUserId(userId, {
        status: TrackerScrapingStatus.COMPLETED,
      });

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      expect(callArgs?.where?.scrapingStatus).toBe(
        TrackerScrapingStatus.COMPLETED,
      );
    });

    it('should_filter_by_status_array_when_multiple_statuses_provided', async () => {
      const mockTrackers: Tracker[] = [];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockTrackers as never,
      );
      vi.mocked(mockPrisma.tracker.count).mockResolvedValue(0);

      await repository.findByUserId(userId, {
        status: [
          TrackerScrapingStatus.COMPLETED,
          TrackerScrapingStatus.PENDING,
        ],
      });

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      expect(callArgs?.where?.scrapingStatus).toEqual({
        in: [TrackerScrapingStatus.COMPLETED, TrackerScrapingStatus.PENDING],
      });
    });

    it('should_filter_by_isActive_when_isActive_provided', async () => {
      const mockTrackers: Tracker[] = [];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockTrackers as never,
      );
      vi.mocked(mockPrisma.tracker.count).mockResolvedValue(0);

      await repository.findByUserId(userId, { isActive: true });

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      expect(callArgs?.where?.isActive).toBe(true);
    });

    it('should_sort_by_createdAt_desc_by_default', async () => {
      const mockTrackers: Tracker[] = [];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockTrackers as never,
      );
      vi.mocked(mockPrisma.tracker.count).mockResolvedValue(0);

      await repository.findByUserId(userId);

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      expect(callArgs?.orderBy).toEqual({ createdAt: 'desc' });
    });

    it('should_sort_by_provided_sortBy_and_sortOrder', async () => {
      const mockTrackers: Tracker[] = [];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockTrackers as never,
      );
      vi.mocked(mockPrisma.tracker.count).mockResolvedValue(0);

      await repository.findByUserId(userId, {
        sortBy: 'lastScrapedAt',
        sortOrder: 'asc',
      });

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      expect(callArgs?.orderBy).toEqual({ lastScrapedAt: 'asc' });
    });

    it('should_limit_to_max_100_items_when_limit_exceeds_100', async () => {
      const mockTrackers: Tracker[] = [];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockTrackers as never,
      );
      vi.mocked(mockPrisma.tracker.count).mockResolvedValue(0);

      await repository.findByUserId(userId, { limit: 200 });

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      expect(callArgs?.take).toBe(100);
    });

    it('should_calculate_pagination_metadata_correctly', async () => {
      const mockTrackers: Tracker[] = [
        {
          id: 'tracker_1',
          url: 'https://test.url',
          game: Game.ROCKET_LEAGUE,
          platform: GamePlatform.STEAM,
          username: 'test',
          userId,
          displayName: null,
          registrationChannelId: null,
          registrationInteractionToken: null,
          guildId: null,
          isActive: true,
          isDeleted: false,
          lastScrapedAt: null,
          scrapingStatus: TrackerScrapingStatus.PENDING,
          scrapingError: null,
          scrapingAttempts: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const mockTotal = 25;
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockTrackers as never,
      );
      vi.mocked(mockPrisma.tracker.count).mockResolvedValue(mockTotal);

      const result = await repository.findByUserId(userId, {
        page: 2,
        limit: 10,
      });

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(25);
      expect(result.pagination.pages).toBe(3);
    });

    it('should_return_paginated_response_with_data_and_metadata', async () => {
      const mockTrackers: Tracker[] = [
        {
          id: 'tracker_1',
          url: 'https://test.url',
          game: Game.ROCKET_LEAGUE,
          platform: GamePlatform.STEAM,
          username: 'test',
          userId,
          displayName: null,
          registrationChannelId: null,
          registrationInteractionToken: null,
          guildId: null,
          isActive: true,
          isDeleted: false,
          lastScrapedAt: null,
          scrapingStatus: TrackerScrapingStatus.PENDING,
          scrapingError: null,
          scrapingAttempts: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const mockTotal = 1;
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockTrackers as never,
      );
      vi.mocked(mockPrisma.tracker.count).mockResolvedValue(mockTotal);

      const result = await repository.findByUserId(userId);

      expect(result.data).toEqual(mockTrackers);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 50,
        total: 1,
        pages: 1,
      });
    });

    it('should_use_parallel_queries_for_findMany_and_count', async () => {
      const mockTrackers: Tracker[] = [];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockTrackers as never,
      );
      vi.mocked(mockPrisma.tracker.count).mockResolvedValue(0);

      await repository.findByUserId(userId);

      expect(mockPrisma.tracker.findMany).toHaveBeenCalled();
      expect(mockPrisma.tracker.count).toHaveBeenCalled();
    });

    it('should_filter_by_userId_and_not_deleted', async () => {
      const mockTrackers: Tracker[] = [];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockTrackers as never,
      );
      vi.mocked(mockPrisma.tracker.count).mockResolvedValue(0);

      await repository.findByUserId(userId);

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      expect(callArgs?.where?.userId).toBe(userId);
      expect(callArgs?.where?.isDeleted).toBe(false);
    });
  });

  describe('findByGuildId', () => {
    const guildId = 'guild_123';

    it('should_filter_by_guild_id_through_user_relation', async () => {
      const mockTrackers: Tracker[] = [];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockTrackers as never,
      );

      await repository.findByGuildId(guildId);

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      expect((callArgs?.where as any)?.user?.guildMembers?.some?.guildId).toBe(
        guildId,
      );
    });

    it('should_include_user_data_in_response', async () => {
      const mockTrackers = [
        {
          id: 'tracker_1',
          url: 'https://test.url',
          game: Game.ROCKET_LEAGUE,
          platform: GamePlatform.STEAM,
          username: 'test',
          userId: 'user_123',
          user: {
            id: 'user_123',
            username: 'testuser',
          },
        },
      ];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockTrackers as never,
      );

      const result = await repository.findByGuildId(guildId);

      expect(result).toEqual(mockTrackers);
      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      expect(callArgs?.include).toEqual({ user: true });
    });

    it('should_exclude_deleted_and_banned_guild_members', async () => {
      const mockTrackers: Tracker[] = [];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockTrackers as never,
      );

      await repository.findByGuildId(guildId);

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      const guildMemberFilter = (callArgs?.where as any)?.user?.guildMembers
        ?.some;
      expect(guildMemberFilter.isDeleted).toBe(false);
      expect(guildMemberFilter.isBanned).toBe(false);
    });

    it('should_order_by_createdAt_desc', async () => {
      const mockTrackers: Tracker[] = [];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockTrackers as never,
      );

      await repository.findByGuildId(guildId);

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      expect(callArgs?.orderBy).toEqual({ createdAt: 'desc' });
    });

    it('should_exclude_deleted_trackers', async () => {
      const mockTrackers: Tracker[] = [];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockTrackers as never,
      );

      await repository.findByGuildId(guildId);

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      expect(callArgs?.where?.isDeleted).toBe(false);
    });
  });

  describe('findBestForUser', () => {
    const userId = 'user_123';

    it('should_return_tracker_with_seasons_when_tracker_with_seasons_exists', async () => {
      const mockTracker = {
        id: 'tracker_1',
        url: 'https://test.url',
        game: Game.ROCKET_LEAGUE,
        platform: GamePlatform.STEAM,
        username: 'test',
        userId,
        lastScrapedAt: new Date(),
        seasons: [
          {
            id: 'season_1',
            trackerId: 'tracker_1',
            seasonNumber: 15,
            seasonName: 'Season 15',
            playlist1v1: null,
            playlist2v2: null,
            playlist3v3: null,
            playlist4v4: null,
            scrapedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };
      vi.mocked(mockPrisma.tracker.findFirst).mockResolvedValueOnce(
        mockTracker as never,
      );

      const result = await repository.findBestForUser(userId);

      expect(result).toEqual(mockTracker);
      expect(mockPrisma.tracker.findFirst).toHaveBeenCalledTimes(1);
      const callArgs = vi.mocked(mockPrisma.tracker.findFirst).mock
        .calls[0]?.[0];
      expect(callArgs?.where?.seasons?.some).toEqual({});
    });

    it('should_return_fallback_tracker_without_seasons_when_no_tracker_with_seasons_exists', async () => {
      const mockTracker = {
        id: 'tracker_2',
        url: 'https://test.url',
        game: Game.ROCKET_LEAGUE,
        platform: GamePlatform.STEAM,
        username: 'test',
        userId,
        lastScrapedAt: new Date(),
        seasons: [],
      };
      vi.mocked(mockPrisma.tracker.findFirst)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockTracker as never);

      const result = await repository.findBestForUser(userId);

      expect(result).toEqual(mockTracker);
      expect(mockPrisma.tracker.findFirst).toHaveBeenCalledTimes(2);
      const secondCallArgs = vi.mocked(mockPrisma.tracker.findFirst).mock
        .calls[1]?.[0];
      expect(secondCallArgs?.where?.seasons).toBeUndefined();
    });

    it('should_order_by_lastScrapedAt_desc', async () => {
      vi.mocked(mockPrisma.tracker.findFirst).mockResolvedValueOnce(null);

      await repository.findBestForUser(userId);

      const callArgs = vi.mocked(mockPrisma.tracker.findFirst).mock
        .calls[0]?.[0];
      expect(callArgs?.orderBy).toEqual({ lastScrapedAt: 'desc' });
    });

    it('should_filter_by_active_and_not_deleted', async () => {
      vi.mocked(mockPrisma.tracker.findFirst).mockResolvedValueOnce(null);

      await repository.findBestForUser(userId);

      const callArgs = vi.mocked(mockPrisma.tracker.findFirst).mock
        .calls[0]?.[0];
      expect(callArgs?.where?.isActive).toBe(true);
      expect(callArgs?.where?.isDeleted).toBe(false);
    });

    it('should_return_null_when_no_active_trackers_exist', async () => {
      vi.mocked(mockPrisma.tracker.findFirst)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const result = await repository.findBestForUser(userId);

      expect(result).toBeNull();
    });
  });

  describe('findAllAdmin', () => {
    it('should_apply_default_pagination_when_options_not_provided', async () => {
      const mockTrackers: Array<
        Tracker & {
          user: { id: string; username: string; globalName: string | null };
          seasons: Array<{ seasonNumber: number }>;
        }
      > = [];
      const mockTotal = 0;
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockTrackers as never,
      );
      vi.mocked(mockPrisma.tracker.count).mockResolvedValue(mockTotal);

      const result = await repository.findAllAdmin();

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(50);
      expect(result.pagination.total).toBe(0);
    });

    it('should_filter_by_status_when_status_provided', async () => {
      const mockTrackers: Array<
        Tracker & {
          user: { id: string; username: string; globalName: string | null };
          seasons: Array<{ seasonNumber: number }>;
        }
      > = [];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockTrackers as never,
      );
      vi.mocked(mockPrisma.tracker.count).mockResolvedValue(0);

      await repository.findAllAdmin({
        status: TrackerScrapingStatus.COMPLETED,
      });

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      expect(callArgs?.where?.scrapingStatus).toBe(
        TrackerScrapingStatus.COMPLETED,
      );
    });

    it('should_filter_by_platform_when_platform_provided', async () => {
      const mockTrackers: Array<
        Tracker & {
          user: { id: string; username: string; globalName: string | null };
          seasons: Array<{ seasonNumber: number }>;
        }
      > = [];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockTrackers as never,
      );
      vi.mocked(mockPrisma.tracker.count).mockResolvedValue(0);

      await repository.findAllAdmin({ platform: GamePlatform.STEAM });

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      expect(callArgs?.where?.platform).toBe(GamePlatform.STEAM);
    });

    it('should_include_user_and_seasons_data', async () => {
      const mockTrackers: Array<
        Tracker & {
          user: { id: string; username: string; globalName: string | null };
          seasons: Array<{ seasonNumber: number }>;
        }
      > = [];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockTrackers as never,
      );
      vi.mocked(mockPrisma.tracker.count).mockResolvedValue(0);

      await repository.findAllAdmin();

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      expect(callArgs?.include?.user).toEqual({
        select: {
          id: true,
          username: true,
          globalName: true,
        },
      });
      expect(callArgs?.include?.seasons).toEqual({
        orderBy: { seasonNumber: 'desc' },
        take: 1,
      });
    });

    it('should_order_by_createdAt_desc', async () => {
      const mockTrackers: Array<
        Tracker & {
          user: { id: string; username: string; globalName: string | null };
          seasons: Array<{ seasonNumber: number }>;
        }
      > = [];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockTrackers as never,
      );
      vi.mocked(mockPrisma.tracker.count).mockResolvedValue(0);

      await repository.findAllAdmin();

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      expect(callArgs?.orderBy).toEqual({ createdAt: 'desc' });
    });

    it('should_exclude_deleted_trackers', async () => {
      const mockTrackers: Array<
        Tracker & {
          user: { id: string; username: string; globalName: string | null };
          seasons: Array<{ seasonNumber: number }>;
        }
      > = [];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockTrackers as never,
      );
      vi.mocked(mockPrisma.tracker.count).mockResolvedValue(0);

      await repository.findAllAdmin();

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      expect(callArgs?.where?.isDeleted).toBe(false);
    });
  });

  describe('getScrapingStatusOverview', () => {
    it('should_return_status_overview_with_all_statuses', async () => {
      const mockStatusCounts = [
        {
          scrapingStatus: TrackerScrapingStatus.PENDING,
          _count: { id: 10 },
        },
        {
          scrapingStatus: TrackerScrapingStatus.COMPLETED,
          _count: { id: 20 },
        },
        {
          scrapingStatus: TrackerScrapingStatus.FAILED,
          _count: { id: 5 },
        },
      ];
      const mockTotal = 35;
      vi.mocked(mockPrisma.tracker.groupBy).mockResolvedValue(
        mockStatusCounts as never,
      );
      vi.mocked(mockPrisma.tracker.count).mockResolvedValue(mockTotal);

      const result = await repository.getScrapingStatusOverview();

      expect(result.total).toBe(35);
      expect(result.byStatus.PENDING).toBe(10);
      expect(result.byStatus.COMPLETED).toBe(20);
      expect(result.byStatus.FAILED).toBe(5);
      expect(result.byStatus.IN_PROGRESS).toBe(0);
    });

    it('should_return_zero_for_missing_statuses', async () => {
      const mockStatusCounts: Array<{
        scrapingStatus: TrackerScrapingStatus;
        _count: { id: number };
      }> = [];
      const mockTotal = 0;
      vi.mocked(mockPrisma.tracker.groupBy).mockResolvedValue(
        mockStatusCounts as never,
      );
      vi.mocked(mockPrisma.tracker.count).mockResolvedValue(mockTotal);

      const result = await repository.getScrapingStatusOverview();

      expect(result.byStatus.PENDING).toBe(0);
      expect(result.byStatus.IN_PROGRESS).toBe(0);
      expect(result.byStatus.COMPLETED).toBe(0);
      expect(result.byStatus.FAILED).toBe(0);
    });

    it('should_filter_by_not_deleted', async () => {
      const mockStatusCounts: Array<{
        scrapingStatus: TrackerScrapingStatus;
        _count: { id: number };
      }> = [];
      vi.mocked(mockPrisma.tracker.groupBy).mockResolvedValue(
        mockStatusCounts as never,
      );
      vi.mocked(mockPrisma.tracker.count).mockResolvedValue(0);

      await repository.getScrapingStatusOverview();

      const groupByCallArgs = vi.mocked(mockPrisma.tracker.groupBy).mock
        .calls[0]?.[0];
      expect(groupByCallArgs?.where?.isDeleted).toBe(false);
      const countCallArgs = vi.mocked(mockPrisma.tracker.count).mock
        .calls[0]?.[0];
      expect(countCallArgs?.where?.isDeleted).toBe(false);
    });
  });

  describe('findScrapingLogs', () => {
    it('should_apply_default_pagination_when_options_not_provided', async () => {
      const mockLogs: Array<
        TrackerScrapingLog & {
          tracker: {
            id: string;
            url: string;
            username: string;
            platform: GamePlatform;
          };
        }
      > = [];
      const mockTotal = 0;
      vi.mocked(mockPrisma.trackerScrapingLog.findMany).mockResolvedValue(
        mockLogs as never,
      );
      vi.mocked(mockPrisma.trackerScrapingLog.count).mockResolvedValue(
        mockTotal,
      );

      const result = await repository.findScrapingLogs();

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(50);
      expect(result.pagination.total).toBe(0);
    });

    it('should_filter_by_trackerId_when_trackerId_provided', async () => {
      const trackerId = 'tracker_123';
      const mockLogs: Array<
        TrackerScrapingLog & {
          tracker: {
            id: string;
            url: string;
            username: string;
            platform: GamePlatform;
          };
        }
      > = [];
      vi.mocked(mockPrisma.trackerScrapingLog.findMany).mockResolvedValue(
        mockLogs as never,
      );
      vi.mocked(mockPrisma.trackerScrapingLog.count).mockResolvedValue(0);

      await repository.findScrapingLogs({ trackerId });

      const callArgs = vi.mocked(mockPrisma.trackerScrapingLog.findMany).mock
        .calls[0]?.[0];
      expect(callArgs?.where?.trackerId).toBe(trackerId);
    });

    it('should_filter_by_status_when_status_provided', async () => {
      const mockLogs: Array<
        TrackerScrapingLog & {
          tracker: {
            id: string;
            url: string;
            username: string;
            platform: GamePlatform;
          };
        }
      > = [];
      vi.mocked(mockPrisma.trackerScrapingLog.findMany).mockResolvedValue(
        mockLogs as never,
      );
      vi.mocked(mockPrisma.trackerScrapingLog.count).mockResolvedValue(0);

      await repository.findScrapingLogs({
        status: TrackerScrapingStatus.COMPLETED,
      });

      const callArgs = vi.mocked(mockPrisma.trackerScrapingLog.findMany).mock
        .calls[0]?.[0];
      expect(callArgs?.where?.status).toBe(TrackerScrapingStatus.COMPLETED);
    });

    it('should_include_tracker_data', async () => {
      const mockLogs: Array<
        TrackerScrapingLog & {
          tracker: {
            id: string;
            url: string;
            username: string;
            platform: GamePlatform;
          };
        }
      > = [];
      vi.mocked(mockPrisma.trackerScrapingLog.findMany).mockResolvedValue(
        mockLogs as never,
      );
      vi.mocked(mockPrisma.trackerScrapingLog.count).mockResolvedValue(0);

      await repository.findScrapingLogs();

      const callArgs = vi.mocked(mockPrisma.trackerScrapingLog.findMany).mock
        .calls[0]?.[0];
      expect(callArgs?.include?.tracker).toEqual({
        select: {
          id: true,
          url: true,
          username: true,
          platform: true,
        },
      });
    });

    it('should_order_by_startedAt_desc', async () => {
      const mockLogs: Array<
        TrackerScrapingLog & {
          tracker: {
            id: string;
            url: string;
            username: string;
            platform: GamePlatform;
          };
        }
      > = [];
      vi.mocked(mockPrisma.trackerScrapingLog.findMany).mockResolvedValue(
        mockLogs as never,
      );
      vi.mocked(mockPrisma.trackerScrapingLog.count).mockResolvedValue(0);

      await repository.findScrapingLogs();

      const callArgs = vi.mocked(mockPrisma.trackerScrapingLog.findMany).mock
        .calls[0]?.[0];
      expect(callArgs?.orderBy).toEqual({ startedAt: 'desc' });
    });
  });

  describe('findUserIdById', () => {
    it('should_return_userId_when_tracker_exists', async () => {
      const trackerId = 'tracker_123';
      const userId = 'user_123';
      const mockTracker = { userId };
      vi.mocked(mockPrisma.tracker.findUnique).mockResolvedValue(
        mockTracker as never,
      );

      const result = await repository.findUserIdById(trackerId);

      expect(result).toBe(userId);
      expect(mockPrisma.tracker.findUnique).toHaveBeenCalledWith({
        where: { id: trackerId },
        select: { userId: true },
      });
    });

    it('should_return_null_when_tracker_does_not_exist', async () => {
      const trackerId = 'nonexistent_id';
      vi.mocked(mockPrisma.tracker.findUnique).mockResolvedValue(null);

      const result = await repository.findUserIdById(trackerId);

      expect(result).toBeNull();
    });

    it('should_return_null_when_tracker_has_no_userId', async () => {
      const trackerId = 'tracker_123';
      const mockTracker = { userId: null };
      vi.mocked(mockPrisma.tracker.findUnique).mockResolvedValue(
        mockTracker as never,
      );

      const result = await repository.findUserIdById(trackerId);

      expect(result).toBeNull();
    });
  });

  describe('findByUrls', () => {
    it('should_return_empty_array_when_urls_array_is_empty', async () => {
      const urls: string[] = [];

      const result = await repository.findByUrls(urls);

      expect(result).toEqual([]);
      expect(mockPrisma.tracker.findMany).not.toHaveBeenCalled();
    });

    it('should_return_trackers_with_urls_and_ids_when_urls_provided', async () => {
      const urls = [
        'https://rocketleague.tracker.network/rocket-league/profile/steam/user1/overview',
        'https://rocketleague.tracker.network/rocket-league/profile/steam/user2/overview',
      ];
      const mockResult = [
        { url: urls[0], id: 'tracker_1' },
        { url: urls[1], id: 'tracker_2' },
      ];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockResult as never,
      );

      const result = await repository.findByUrls(urls);

      expect(result).toEqual(mockResult);
      expect(mockPrisma.tracker.findMany).toHaveBeenCalledTimes(1);
    });

    it('should_filter_by_provided_urls_only', async () => {
      const urls = [
        'https://rocketleague.tracker.network/rocket-league/profile/steam/user1/overview',
      ];
      const mockResult = [{ url: urls[0], id: 'tracker_1' }];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockResult as never,
      );

      await repository.findByUrls(urls);

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      expect(callArgs?.where?.url).toEqual({ in: urls });
    });

    it('should_return_only_url_and_id_fields', async () => {
      const urls = [
        'https://rocketleague.tracker.network/rocket-league/profile/steam/user1/overview',
      ];
      const mockResult = [{ url: urls[0], id: 'tracker_1' }];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockResult as never,
      );

      const result = await repository.findByUrls(urls);

      const callArgs = vi.mocked(mockPrisma.tracker.findMany).mock
        .calls[0]?.[0];
      expect(callArgs?.select).toEqual({ url: true, id: true });
      expect(result[0]).toHaveProperty('url');
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).not.toHaveProperty('userId');
      expect(result[0]).not.toHaveProperty('username');
    });

    it('should_handle_single_url', async () => {
      const urls = [
        'https://rocketleague.tracker.network/rocket-league/profile/steam/user1/overview',
      ];
      const mockResult = [{ url: urls[0], id: 'tracker_1' }];
      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        mockResult as never,
      );

      const result = await repository.findByUrls(urls);

      expect(result).toEqual(mockResult);
      expect(mockPrisma.tracker.findMany).toHaveBeenCalledTimes(1);
    });
  });
});
