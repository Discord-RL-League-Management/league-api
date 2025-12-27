/**
 * TrackerController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { TrackerController } from '@/trackers/controllers/tracker.controller';
import { TrackerService } from '@/trackers/services/tracker.service';
import { TrackerSnapshotService } from '@/trackers/services/tracker-snapshot.service';
import {
  RegisterTrackersDto,
  UpdateTrackerDto,
} from '@/trackers/dto/tracker.dto';
import type { AuthenticatedUser } from '@/common/interfaces/user.interface';

describe('TrackerController', () => {
  let controller: TrackerController;
  let mockTrackerService: TrackerService;
  let mockSnapshotService: TrackerSnapshotService;

  const mockUser: AuthenticatedUser = {
    id: 'user-123',
    username: 'testuser',
    globalName: 'Test User',
    avatar: 'avatar_hash',
    email: 'test@example.com',
    guilds: ['guild-1'],
  };

  const mockTracker = {
    id: 'tracker-123',
    userId: 'user-123',
    url: 'https://tracker.gg/profile/test',
    displayName: 'Test Tracker',
    isActive: true,
  };

  beforeEach(async () => {
    // ARRANGE: Setup test dependencies with mocks
    mockTrackerService = {
      registerTrackers: vi.fn(),
      getTrackersByUserId: vi.fn(),
      getTrackersByGuild: vi.fn(),
      getTrackerById: vi.fn(),
      getTrackerSeasons: vi.fn(),
      getScrapingStatus: vi.fn(),
      refreshTrackerData: vi.fn(),
      updateTracker: vi.fn(),
      deleteTracker: vi.fn(),
      addTracker: vi.fn(),
    } as unknown as TrackerService;

    mockSnapshotService = {
      getSnapshotsByTracker: vi.fn(),
      getSnapshotsByTrackerAndSeason: vi.fn(),
      createSnapshot: vi.fn(),
    } as unknown as TrackerSnapshotService;

    const module = await Test.createTestingModule({
      controllers: [TrackerController],
      providers: [
        { provide: TrackerService, useValue: mockTrackerService },
        { provide: TrackerSnapshotService, useValue: mockSnapshotService },
      ],
    }).compile();

    controller = module.get<TrackerController>(TrackerController);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('registerTrackers', () => {
    it('should_register_trackers_when_urls_are_valid', async () => {
      // ARRANGE
      const dto: RegisterTrackersDto = {
        urls: ['https://tracker.gg/profile/test'],
      };
      const mockResult = [mockTracker];
      mockTrackerService.registerTrackers.mockResolvedValue(
        mockResult as never,
      );

      // ACT
      const result = await controller.registerTrackers(dto, mockUser);

      // ASSERT
      expect(result).toEqual(mockResult);
      expect(mockTrackerService.registerTrackers).toHaveBeenCalledWith(
        mockUser.id,
        dto.urls,
        {
          username: mockUser.username,
          globalName: mockUser.globalName,
          avatar: mockUser.avatar,
        },
      );
    });
  });

  describe('getMyTrackers', () => {
    it('should_return_user_trackers_when_authenticated', async () => {
      // ARRANGE
      const mockTrackers = [mockTracker];
      mockTrackerService.getTrackersByUserId.mockResolvedValue(
        mockTrackers as never,
      );

      // ACT
      const result = await controller.getMyTrackers(mockUser);

      // ASSERT
      expect(result).toEqual(mockTrackers);
      expect(mockTrackerService.getTrackersByUserId).toHaveBeenCalledWith(
        mockUser.id,
      );
    });
  });

  describe('getTrackers', () => {
    it('should_return_user_trackers_when_no_guild_filter', async () => {
      // ARRANGE
      const mockTrackers = [mockTracker];
      mockTrackerService.getTrackersByUserId.mockResolvedValue(
        mockTrackers as never,
      );

      // ACT
      const result = await controller.getTrackers(mockUser);

      // ASSERT
      expect(result).toEqual(mockTrackers);
      expect(mockTrackerService.getTrackersByUserId).toHaveBeenCalledWith(
        mockUser.id,
      );
    });

    it('should_return_guild_trackers_when_guild_filter_provided', async () => {
      // ARRANGE
      const mockTrackers = [mockTracker];
      mockTrackerService.getTrackersByGuild.mockResolvedValue(
        mockTrackers as never,
      );

      // ACT
      const result = await controller.getTrackers(mockUser, 'guild-1');

      // ASSERT
      expect(result).toEqual(mockTrackers);
      expect(mockTrackerService.getTrackersByGuild).toHaveBeenCalledWith(
        'guild-1',
      );
    });
  });

  describe('getTracker', () => {
    it('should_return_tracker_when_tracker_exists', async () => {
      // ARRANGE
      mockTrackerService.getTrackerById.mockResolvedValue(mockTracker as never);

      // ACT
      const result = await controller.getTracker('tracker-123');

      // ASSERT
      expect(result).toEqual(mockTracker);
      expect(mockTrackerService.getTrackerById).toHaveBeenCalledWith(
        'tracker-123',
      );
    });
  });

  describe('refreshTracker', () => {
    it('should_refresh_tracker_when_user_owns_tracker', async () => {
      // ARRANGE
      mockTrackerService.getTrackerById.mockResolvedValue(mockTracker as never);
      mockTrackerService.refreshTrackerData.mockResolvedValue(undefined);

      // ACT
      const result = await controller.refreshTracker('tracker-123', mockUser);

      // ASSERT
      expect(result).toEqual({ message: 'Refresh job enqueued successfully' });
      expect(mockTrackerService.refreshTrackerData).toHaveBeenCalledWith(
        'tracker-123',
      );
    });

    it('should_throw_when_user_does_not_own_tracker', async () => {
      // ARRANGE
      const otherTracker = { ...mockTracker, userId: 'other-user' };
      mockTrackerService.getTrackerById.mockResolvedValue(
        otherTracker as never,
      );

      // ACT & ASSERT
      await expect(
        controller.refreshTracker('tracker-123', mockUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateTracker', () => {
    it('should_update_tracker_when_data_is_valid', async () => {
      // ARRANGE
      const dto: UpdateTrackerDto = {
        displayName: 'Updated Name',
        isActive: false,
      };
      const updatedTracker = { ...mockTracker, ...dto };
      mockTrackerService.updateTracker.mockResolvedValue(
        updatedTracker as never,
      );

      // ACT
      const result = await controller.updateTracker('tracker-123', dto);

      // ASSERT
      expect(result).toEqual(updatedTracker);
      expect(mockTrackerService.updateTracker).toHaveBeenCalledWith(
        'tracker-123',
        dto.displayName,
        dto.isActive,
      );
    });
  });

  describe('deleteTracker', () => {
    it('should_delete_tracker_when_tracker_exists', async () => {
      // ARRANGE
      mockTrackerService.deleteTracker.mockResolvedValue(mockTracker as never);

      // ACT
      const result = await controller.deleteTracker('tracker-123');

      // ASSERT
      expect(result).toEqual(mockTracker);
      expect(mockTrackerService.deleteTracker).toHaveBeenCalledWith(
        'tracker-123',
      );
    });
  });
});
