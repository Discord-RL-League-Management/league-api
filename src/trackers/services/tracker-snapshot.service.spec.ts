/**
 * TrackerSnapshotService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TrackerSnapshotService } from './tracker-snapshot.service';
import { TrackerSnapshotRepository } from '../repositories/tracker-snapshot.repository';
import { TrackerRepository } from '../repositories/tracker.repository';
import { VisibilityService } from '../../infrastructure/visibility/services/visibility.service';

describe('TrackerSnapshotService', () => {
  let service: TrackerSnapshotService;
  let mockSnapshotRepository: TrackerSnapshotRepository;
  let mockTrackerRepository: TrackerRepository;
  let mockVisibilityService: VisibilityService;

  const mockTracker = {
    id: 'tracker-123',
    userId: 'user-123',
    url: 'https://tracker.gg/rocket-league/profile/steam/test',
    isActive: true,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSnapshot = {
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
    mockSnapshotRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByTrackerId: vi.fn(),
      findByTrackerIdAndSeason: vi.fn(),
      findByGuildId: vi.fn(),
    } as unknown as TrackerSnapshotRepository;

    mockTrackerRepository = {
      findById: vi.fn(),
    } as unknown as TrackerRepository;

    mockVisibilityService = {
      addVisibility: vi.fn(),
      removeVisibility: vi.fn(),
    } as unknown as VisibilityService;

    service = new TrackerSnapshotService(
      mockSnapshotRepository,
      mockTrackerRepository,
      mockVisibilityService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createSnapshot', () => {
    it('should_create_snapshot_when_tracker_exists_and_not_deleted', async () => {
      const createData = {
        capturedAt: new Date('2024-01-01'),
        seasonNumber: 1,
        ones: 1500,
        twos: 1400,
      };
      vi.mocked(mockTrackerRepository.findById).mockResolvedValue(mockTracker);
      vi.mocked(mockSnapshotRepository.create).mockResolvedValue(
        mockSnapshot as never,
      );

      const result = await service.createSnapshot(
        'tracker-123',
        'user-123',
        createData,
      );

      expect(result).toEqual(mockSnapshot);
      expect(mockTrackerRepository.findById).toHaveBeenCalledWith(
        'tracker-123',
      );
      expect(mockSnapshotRepository.create).toHaveBeenCalledWith({
        trackerId: 'tracker-123',
        enteredBy: 'user-123',
        ...createData,
      });
    });

    it('should_throw_NotFoundException_when_tracker_does_not_exist', async () => {
      const createData = {
        ones: 1500,
      };
      vi.mocked(mockTrackerRepository.findById).mockResolvedValue(null);

      await expect(
        service.createSnapshot('tracker-123', 'user-123', createData),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.createSnapshot('tracker-123', 'user-123', createData),
      ).rejects.toThrow('Tracker not found');
    });

    it('should_throw_BadRequestException_when_tracker_is_deleted', async () => {
      const createData = {
        ones: 1500,
      };
      const deletedTracker = {
        ...mockTracker,
        isDeleted: true,
      };
      vi.mocked(mockTrackerRepository.findById).mockResolvedValue(
        deletedTracker,
      );

      await expect(
        service.createSnapshot('tracker-123', 'user-123', createData),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createSnapshot('tracker-123', 'user-123', createData),
      ).rejects.toThrow('Cannot create snapshot for deleted tracker');
    });

    it('should_add_visibility_when_guildIds_provided', async () => {
      const createData = {
        ones: 1500,
        guildIds: ['guild-1', 'guild-2'],
      };
      vi.mocked(mockTrackerRepository.findById).mockResolvedValue(mockTracker);
      vi.mocked(mockSnapshotRepository.create).mockResolvedValue(
        mockSnapshot as never,
      );

      await service.createSnapshot('tracker-123', 'user-123', createData);

      expect(mockVisibilityService.addVisibility).toHaveBeenCalledTimes(2);
      expect(mockVisibilityService.addVisibility).toHaveBeenCalledWith(
        'tracker_snapshot',
        mockSnapshot.id,
        'guild',
        'guild-1',
      );
      expect(mockVisibilityService.addVisibility).toHaveBeenCalledWith(
        'tracker_snapshot',
        mockSnapshot.id,
        'guild',
        'guild-2',
      );
    });

    it('should_not_add_visibility_when_guildIds_not_provided', async () => {
      const createData = {
        ones: 1500,
      };
      vi.mocked(mockTrackerRepository.findById).mockResolvedValue(mockTracker);
      vi.mocked(mockSnapshotRepository.create).mockResolvedValue(
        mockSnapshot as never,
      );

      await service.createSnapshot('tracker-123', 'user-123', createData);

      expect(mockVisibilityService.addVisibility).not.toHaveBeenCalled();
    });

    it('should_not_add_visibility_when_guildIds_empty', async () => {
      const createData = {
        ones: 1500,
        guildIds: [],
      };
      vi.mocked(mockTrackerRepository.findById).mockResolvedValue(mockTracker);
      vi.mocked(mockSnapshotRepository.create).mockResolvedValue(
        mockSnapshot as never,
      );

      await service.createSnapshot('tracker-123', 'user-123', createData);

      expect(mockVisibilityService.addVisibility).not.toHaveBeenCalled();
    });
  });

  describe('getSnapshotById', () => {
    it('should_return_snapshot_when_snapshot_exists', async () => {
      vi.mocked(mockSnapshotRepository.findById).mockResolvedValue(
        mockSnapshot as never,
      );

      const result = await service.getSnapshotById('snapshot-123');

      expect(result).toEqual(mockSnapshot);
      expect(mockSnapshotRepository.findById).toHaveBeenCalledWith(
        'snapshot-123',
      );
    });

    it('should_throw_NotFoundException_when_snapshot_not_found', async () => {
      vi.mocked(mockSnapshotRepository.findById).mockResolvedValue(null);

      await expect(service.getSnapshotById('snapshot-999')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getSnapshotById('snapshot-999')).rejects.toThrow(
        'Snapshot not found',
      );
    });
  });

  describe('getSnapshotsByTracker', () => {
    it('should_return_snapshots_when_tracker_exists_and_validation_not_skipped', async () => {
      const snapshots = [mockSnapshot];
      vi.mocked(mockTrackerRepository.findById).mockResolvedValue(mockTracker);
      vi.mocked(mockSnapshotRepository.findByTrackerId).mockResolvedValue(
        snapshots as never,
      );

      const result = await service.getSnapshotsByTracker('tracker-123');

      expect(result).toEqual(snapshots);
      expect(mockTrackerRepository.findById).toHaveBeenCalledWith(
        'tracker-123',
      );
      expect(mockSnapshotRepository.findByTrackerId).toHaveBeenCalledWith(
        'tracker-123',
      );
    });

    it('should_throw_NotFoundException_when_tracker_not_found_and_validation_not_skipped', async () => {
      vi.mocked(mockTrackerRepository.findById).mockResolvedValue(null);

      await expect(
        service.getSnapshotsByTracker('tracker-999'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getSnapshotsByTracker('tracker-999'),
      ).rejects.toThrow('Tracker not found');
    });

    it('should_return_snapshots_when_validation_skipped', async () => {
      const snapshots = [mockSnapshot];
      vi.mocked(mockSnapshotRepository.findByTrackerId).mockResolvedValue(
        snapshots as never,
      );

      const result = await service.getSnapshotsByTracker('tracker-123', true);

      expect(result).toEqual(snapshots);
      expect(mockTrackerRepository.findById).not.toHaveBeenCalled();
      expect(mockSnapshotRepository.findByTrackerId).toHaveBeenCalledWith(
        'tracker-123',
      );
    });
  });

  describe('getSnapshotsByTrackerAndSeason', () => {
    it('should_return_snapshots_when_tracker_exists_and_validation_not_skipped', async () => {
      const snapshots = [mockSnapshot];
      vi.mocked(mockTrackerRepository.findById).mockResolvedValue(mockTracker);
      vi.mocked(
        mockSnapshotRepository.findByTrackerIdAndSeason,
      ).mockResolvedValue(snapshots as never);

      const result = await service.getSnapshotsByTrackerAndSeason(
        'tracker-123',
        1,
      );

      expect(result).toEqual(snapshots);
      expect(mockTrackerRepository.findById).toHaveBeenCalledWith(
        'tracker-123',
      );
      expect(
        mockSnapshotRepository.findByTrackerIdAndSeason,
      ).toHaveBeenCalledWith('tracker-123', 1);
    });

    it('should_throw_NotFoundException_when_tracker_not_found_and_validation_not_skipped', async () => {
      vi.mocked(mockTrackerRepository.findById).mockResolvedValue(null);

      await expect(
        service.getSnapshotsByTrackerAndSeason('tracker-999', 1),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getSnapshotsByTrackerAndSeason('tracker-999', 1),
      ).rejects.toThrow('Tracker not found');
    });

    it('should_return_snapshots_when_validation_skipped', async () => {
      const snapshots = [mockSnapshot];
      vi.mocked(
        mockSnapshotRepository.findByTrackerIdAndSeason,
      ).mockResolvedValue(snapshots as never);

      const result = await service.getSnapshotsByTrackerAndSeason(
        'tracker-123',
        1,
        true,
      );

      expect(result).toEqual(snapshots);
      expect(mockTrackerRepository.findById).not.toHaveBeenCalled();
      expect(
        mockSnapshotRepository.findByTrackerIdAndSeason,
      ).toHaveBeenCalledWith('tracker-123', 1);
    });
  });

  describe('getSnapshotsByGuild', () => {
    it('should_return_snapshots_when_guild_has_visible_snapshots', async () => {
      const snapshots = [mockSnapshot];
      vi.mocked(mockSnapshotRepository.findByGuildId).mockResolvedValue(
        snapshots as never,
      );

      const result = await service.getSnapshotsByGuild('guild-123');

      expect(result).toEqual(snapshots);
      expect(mockSnapshotRepository.findByGuildId).toHaveBeenCalledWith(
        'guild-123',
      );
    });

    it('should_return_empty_array_when_guild_has_no_visible_snapshots', async () => {
      vi.mocked(mockSnapshotRepository.findByGuildId).mockResolvedValue(
        [] as never,
      );

      const result = await service.getSnapshotsByGuild('guild-123');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('addGuildVisibility', () => {
    it('should_add_visibility_when_snapshot_exists', async () => {
      vi.mocked(mockSnapshotRepository.findById).mockResolvedValue(
        mockSnapshot as never,
      );

      await service.addGuildVisibility('snapshot-123', 'guild-123');

      expect(mockSnapshotRepository.findById).toHaveBeenCalledWith(
        'snapshot-123',
      );
      expect(mockVisibilityService.addVisibility).toHaveBeenCalledWith(
        'tracker_snapshot',
        'snapshot-123',
        'guild',
        'guild-123',
      );
    });

    it('should_throw_NotFoundException_when_snapshot_not_found', async () => {
      vi.mocked(mockSnapshotRepository.findById).mockResolvedValue(null);

      await expect(
        service.addGuildVisibility('snapshot-999', 'guild-123'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.addGuildVisibility('snapshot-999', 'guild-123'),
      ).rejects.toThrow('Snapshot not found');
    });
  });

  describe('removeGuildVisibility', () => {
    it('should_remove_visibility_when_snapshot_exists', async () => {
      vi.mocked(mockSnapshotRepository.findById).mockResolvedValue(
        mockSnapshot as never,
      );

      await service.removeGuildVisibility('snapshot-123', 'guild-123');

      expect(mockSnapshotRepository.findById).toHaveBeenCalledWith(
        'snapshot-123',
      );
      expect(mockVisibilityService.removeVisibility).toHaveBeenCalledWith(
        'tracker_snapshot',
        'snapshot-123',
        'guild',
        'guild-123',
      );
    });

    it('should_throw_NotFoundException_when_snapshot_not_found', async () => {
      vi.mocked(mockSnapshotRepository.findById).mockResolvedValue(null);

      await expect(
        service.removeGuildVisibility('snapshot-999', 'guild-123'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.removeGuildVisibility('snapshot-999', 'guild-123'),
      ).rejects.toThrow('Snapshot not found');
    });
  });
});
