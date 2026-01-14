/**
 * TrackerSnapshotRepository Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TrackerSnapshotRepository } from './tracker-snapshot.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { TrackerSnapshot } from '@prisma/client';

describe('TrackerSnapshotRepository', () => {
  let repository: TrackerSnapshotRepository;
  let mockPrisma: PrismaService;

  const mockTracker = {
    id: 'tracker-123',
    userId: 'user-123',
    url: 'https://tracker.gg/rocket-league/profile/steam/test',
    isActive: true,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    globalName: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSnapshot: TrackerSnapshot = {
    id: 'snapshot-123',
    trackerId: 'tracker-123',
    capturedAt: new Date('2024-01-01'),
    seasonNumber: 1,
    enteredBy: 'user-123',
    ones: 1500,
    twos: 1400,
    threes: 1300,
    fours: 1200,
    onesGamesPlayed: 100,
    twosGamesPlayed: 80,
    threesGamesPlayed: 60,
    foursGamesPlayed: 40,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrisma = {
      trackerSnapshot: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      entityVisibility: {
        findMany: vi.fn(),
      },
    } as unknown as PrismaService;

    repository = new TrackerSnapshotRepository(mockPrisma);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('create', () => {
    it('should_create_snapshot_when_all_fields_provided', async () => {
      const createData = {
        trackerId: 'tracker-123',
        capturedAt: new Date('2024-01-01'),
        seasonNumber: 1,
        enteredBy: 'user-123',
        ones: 1500,
        twos: 1400,
        threes: 1300,
        fours: 1200,
        onesGamesPlayed: 100,
        twosGamesPlayed: 80,
        threesGamesPlayed: 60,
        foursGamesPlayed: 40,
      };
      const createdSnapshot = {
        ...mockSnapshot,
        tracker: mockTracker,
        enteredByUser: mockUser,
      };
      vi.mocked(mockPrisma.trackerSnapshot.create).mockResolvedValue(
        createdSnapshot as never,
      );

      const result = await repository.create(createData);

      expect(result).toEqual(createdSnapshot);
      expect(mockPrisma.trackerSnapshot.create).toHaveBeenCalledWith({
        data: createData,
        include: {
          tracker: true,
          enteredByUser: true,
        },
      });
    });

    it('should_create_snapshot_when_capturedAt_not_provided', async () => {
      const createData = {
        trackerId: 'tracker-123',
        enteredBy: 'user-123',
      };
      const createdSnapshot = {
        ...mockSnapshot,
        capturedAt: new Date(),
        tracker: mockTracker,
        enteredByUser: mockUser,
      };
      vi.mocked(mockPrisma.trackerSnapshot.create).mockResolvedValue(
        createdSnapshot as never,
      );

      const result = await repository.create(createData);

      expect(result).toEqual(createdSnapshot);
      const callArgs = vi.mocked(mockPrisma.trackerSnapshot.create).mock
        .calls[0]?.[0];
      expect(callArgs?.data.capturedAt).toBeInstanceOf(Date);
    });

    it('should_create_snapshot_when_optional_fields_not_provided', async () => {
      const createData = {
        trackerId: 'tracker-123',
        enteredBy: 'user-123',
      };
      const createdSnapshot = {
        ...mockSnapshot,
        seasonNumber: null,
        ones: null,
        twos: null,
        threes: null,
        fours: null,
        onesGamesPlayed: null,
        twosGamesPlayed: null,
        threesGamesPlayed: null,
        foursGamesPlayed: null,
        tracker: mockTracker,
        enteredByUser: mockUser,
      };
      vi.mocked(mockPrisma.trackerSnapshot.create).mockResolvedValue(
        createdSnapshot as never,
      );

      const result = await repository.create(createData);

      expect(result).toEqual(createdSnapshot);
    });

    it('should_create_snapshot_when_partial_ratings_provided', async () => {
      const createData = {
        trackerId: 'tracker-123',
        enteredBy: 'user-123',
        ones: 1500,
        twos: 1400,
      };
      const createdSnapshot = {
        ...mockSnapshot,
        threes: null,
        fours: null,
        tracker: mockTracker,
        enteredByUser: mockUser,
      };
      vi.mocked(mockPrisma.trackerSnapshot.create).mockResolvedValue(
        createdSnapshot as never,
      );

      const result = await repository.create(createData);

      expect(result).toEqual(createdSnapshot);
    });
  });

  describe('findById', () => {
    it('should_return_snapshot_when_snapshot_exists', async () => {
      const snapshotWithRelations = {
        ...mockSnapshot,
        tracker: mockTracker,
        enteredByUser: mockUser,
      };
      vi.mocked(mockPrisma.trackerSnapshot.findUnique).mockResolvedValue(
        snapshotWithRelations as never,
      );

      const result = await repository.findById('snapshot-123');

      expect(result).toEqual(snapshotWithRelations);
      expect(mockPrisma.trackerSnapshot.findUnique).toHaveBeenCalledWith({
        where: { id: 'snapshot-123' },
        include: {
          tracker: true,
          enteredByUser: true,
        },
      });
    });

    it('should_return_null_when_snapshot_not_found', async () => {
      vi.mocked(mockPrisma.trackerSnapshot.findUnique).mockResolvedValue(null);

      const result = await repository.findById('snapshot-999');

      expect(result).toBeNull();
    });
  });

  describe('findByTrackerId', () => {
    it('should_return_snapshots_when_snapshots_exist', async () => {
      const snapshots = [
        {
          ...mockSnapshot,
          enteredByUser: mockUser,
        },
      ];
      vi.mocked(mockPrisma.trackerSnapshot.findMany).mockResolvedValue(
        snapshots as never,
      );

      const result = await repository.findByTrackerId('tracker-123');

      expect(result).toEqual(snapshots);
      expect(mockPrisma.trackerSnapshot.findMany).toHaveBeenCalledWith({
        where: { trackerId: 'tracker-123' },
        orderBy: { capturedAt: 'desc' },
        include: {
          enteredByUser: true,
        },
      });
    });

    it('should_return_empty_array_when_no_snapshots_exist', async () => {
      vi.mocked(mockPrisma.trackerSnapshot.findMany).mockResolvedValue(
        [] as never,
      );

      const result = await repository.findByTrackerId('tracker-123');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('findByTrackerIdAndSeason', () => {
    it('should_return_snapshots_when_snapshots_exist_for_season', async () => {
      const snapshots = [mockSnapshot];
      vi.mocked(mockPrisma.trackerSnapshot.findMany).mockResolvedValue(
        snapshots as never,
      );

      const result = await repository.findByTrackerIdAndSeason(
        'tracker-123',
        1,
      );

      expect(result).toEqual(snapshots);
      expect(mockPrisma.trackerSnapshot.findMany).toHaveBeenCalledWith({
        where: {
          trackerId: 'tracker-123',
          seasonNumber: 1,
        },
        orderBy: { capturedAt: 'desc' },
      });
    });

    it('should_return_empty_array_when_no_snapshots_exist_for_season', async () => {
      vi.mocked(mockPrisma.trackerSnapshot.findMany).mockResolvedValue(
        [] as never,
      );

      const result = await repository.findByTrackerIdAndSeason(
        'tracker-123',
        2,
      );

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('findByGuildId', () => {
    it('should_return_snapshots_when_visible_entities_exist', async () => {
      const visibleEntities = [
        {
          id: 'visibility-1',
          entityType: 'tracker_snapshot',
          entityId: 'snapshot-123',
          targetType: 'guild',
          targetId: 'guild-123',
        },
      ];
      const snapshots = [
        {
          ...mockSnapshot,
          tracker: {
            ...mockTracker,
            user: mockUser,
          },
          enteredByUser: mockUser,
        },
      ];
      vi.mocked(mockPrisma.entityVisibility.findMany).mockResolvedValue(
        visibleEntities as never,
      );
      vi.mocked(mockPrisma.trackerSnapshot.findMany).mockResolvedValue(
        snapshots as never,
      );

      const result = await repository.findByGuildId('guild-123');

      expect(result).toEqual(snapshots);
      expect(mockPrisma.entityVisibility.findMany).toHaveBeenCalledWith({
        where: {
          entityType: 'tracker_snapshot',
          targetType: 'guild',
          targetId: 'guild-123',
        },
      });
      expect(mockPrisma.trackerSnapshot.findMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: ['snapshot-123'],
          },
        },
        include: {
          tracker: {
            include: {
              user: true,
            },
          },
          enteredByUser: true,
        },
        orderBy: { capturedAt: 'desc' },
      });
    });

    it('should_return_empty_array_when_no_visible_entities_exist', async () => {
      vi.mocked(mockPrisma.entityVisibility.findMany).mockResolvedValue(
        [] as never,
      );

      const result = await repository.findByGuildId('guild-123');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
      expect(mockPrisma.trackerSnapshot.findMany).not.toHaveBeenCalled();
    });

    it('should_return_snapshots_when_multiple_visible_entities_exist', async () => {
      const visibleEntities = [
        {
          id: 'visibility-1',
          entityType: 'tracker_snapshot',
          entityId: 'snapshot-123',
          targetType: 'guild',
          targetId: 'guild-123',
        },
        {
          id: 'visibility-2',
          entityType: 'tracker_snapshot',
          entityId: 'snapshot-456',
          targetType: 'guild',
          targetId: 'guild-123',
        },
      ];
      const snapshots = [
        {
          ...mockSnapshot,
          id: 'snapshot-123',
          tracker: {
            ...mockTracker,
            user: mockUser,
          },
          enteredByUser: mockUser,
        },
        {
          ...mockSnapshot,
          id: 'snapshot-456',
          tracker: {
            ...mockTracker,
            user: mockUser,
          },
          enteredByUser: mockUser,
        },
      ];
      vi.mocked(mockPrisma.entityVisibility.findMany).mockResolvedValue(
        visibleEntities as never,
      );
      vi.mocked(mockPrisma.trackerSnapshot.findMany).mockResolvedValue(
        snapshots as never,
      );

      const result = await repository.findByGuildId('guild-123');

      expect(result).toEqual(snapshots);
      expect(result).toHaveLength(2);
      const callArgs = vi.mocked(mockPrisma.trackerSnapshot.findMany).mock
        .calls[0]?.[0];
      expect(callArgs?.where.id.in).toContain('snapshot-123');
      expect(callArgs?.where.id.in).toContain('snapshot-456');
    });
  });
});
