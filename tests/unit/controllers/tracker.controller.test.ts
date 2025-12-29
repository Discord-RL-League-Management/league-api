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
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TrackerController } from '@/trackers/controllers/tracker.controller';
import { TrackerService } from '@/trackers/services/tracker.service';
import { TrackerProcessingService } from '@/trackers/services/tracker-processing.service';
import { TrackerSnapshotService } from '@/trackers/services/tracker-snapshot.service';
import { TrackerAuthorizationService } from '@/trackers/services/tracker-authorization.service';
import { TrackerResponseMapperService } from '@/trackers/services/tracker-response-mapper.service';
import {
  RegisterTrackersDto,
  UpdateTrackerDto,
} from '@/trackers/dto/tracker.dto';
import type { AuthenticatedUser } from '@/common/interfaces/user.interface';

describe('TrackerController', () => {
  let controller: TrackerController;
  let mockTrackerService: TrackerService;
  let mockTrackerProcessingService: TrackerProcessingService;
  let mockSnapshotService: TrackerSnapshotService;
  let mockTrackerAuthorizationService: TrackerAuthorizationService;
  let mockResponseMapper: TrackerResponseMapperService;

  const mockUser: AuthenticatedUser = {
    id: 'user-123',
    username: 'testuser',
    globalName: 'Test User',
    avatar: 'avatar_hash',
    email: 'test@example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  };

  const mockTracker = {
    id: 'tracker-123',
    userId: 'user-123',
    url: 'https://tracker.gg/profile/test',
    displayName: 'Test Tracker',
    isActive: true,
    scrapingStatus: 'COMPLETED' as const,
    scrapingError: null,
    lastScrapedAt: new Date(),
    scrapingAttempts: 1,
  };

  beforeEach(async () => {
    // ARRANGE: Setup test dependencies with mocks
    mockTrackerService = {
      getTrackersByUserId: vi.fn(),
      getTrackersByGuild: vi.fn(),
      getTrackerById: vi.fn(),
      getTrackerSeasons: vi.fn(),
      getScrapingStatus: vi.fn(),
      updateTracker: vi.fn(),
      deleteTracker: vi.fn(),
    } as unknown as TrackerService;

    mockTrackerProcessingService = {
      registerTrackers: vi.fn(),
      addTracker: vi.fn(),
      refreshTrackerData: vi.fn(),
    } as unknown as TrackerProcessingService;

    mockSnapshotService = {
      getSnapshotsByTracker: vi.fn(),
      getSnapshotsByTrackerAndSeason: vi.fn(),
      createSnapshot: vi.fn(),
    } as unknown as TrackerSnapshotService;

    mockTrackerAuthorizationService = {
      validateTrackerAccess: vi.fn(),
    } as unknown as TrackerAuthorizationService;

    mockResponseMapper = {
      transformTrackerDetail: vi.fn(),
    } as unknown as TrackerResponseMapperService;

    const module = await Test.createTestingModule({
      controllers: [TrackerController],
      providers: [
        { provide: TrackerService, useValue: mockTrackerService },
        {
          provide: TrackerProcessingService,
          useValue: mockTrackerProcessingService,
        },
        { provide: TrackerSnapshotService, useValue: mockSnapshotService },
        {
          provide: TrackerAuthorizationService,
          useValue: mockTrackerAuthorizationService,
        },
        {
          provide: TrackerResponseMapperService,
          useValue: mockResponseMapper,
        },
      ],
    }).compile();

    controller = module.get<TrackerController>(TrackerController);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('registerTrackers', () => {
    it('should_register_trackers_when_urls_are_valid', async () => {
      // ARRANGE
      const dto: RegisterTrackersDto = {
        urls: ['https://tracker.gg/profile/test'],
      };
      const mockResult = [mockTracker];
      vi.mocked(
        mockTrackerProcessingService.registerTrackers,
      ).mockResolvedValue(mockResult as never);

      // ACT
      const result = await controller.registerTrackers(dto, mockUser);

      // ASSERT
      expect(result).toEqual(mockResult);
      expect(
        mockTrackerProcessingService.registerTrackers,
      ).toHaveBeenCalledWith(mockUser.id, dto.urls, {
        username: mockUser.username,
        globalName: mockUser.globalName,
        avatar: mockUser.avatar,
      });
    });
  });

  describe('getMyTrackers', () => {
    it('should_return_user_trackers_when_authenticated', async () => {
      // ARRANGE
      const mockTrackers = [mockTracker];
      const paginatedResult = {
        data: mockTrackers,
        pagination: {
          page: 1,
          limit: 50,
          total: 1,
          pages: 1,
        },
      };
      vi.mocked(mockTrackerService.getTrackersByUserId).mockResolvedValue(
        paginatedResult as never,
      );

      // ACT
      const result = await controller.getMyTrackers(mockUser, {});

      // ASSERT
      expect(result).toEqual(paginatedResult);
      expect(mockTrackerService.getTrackersByUserId).toHaveBeenCalledWith(
        mockUser.id,
        {},
      );
    });
  });

  describe('getTrackers', () => {
    it('should_return_user_trackers_when_no_guild_filter', async () => {
      // ARRANGE
      const mockTrackers = [mockTracker];
      const paginatedResult = {
        data: mockTrackers,
        pagination: {
          page: 1,
          limit: 50,
          total: 1,
          pages: 1,
        },
      };
      vi.mocked(mockTrackerService.getTrackersByUserId).mockResolvedValue(
        paginatedResult as never,
      );

      // ACT
      const result = await controller.getTrackers(mockUser);

      // ASSERT
      expect(result).toEqual(paginatedResult);
      expect(mockTrackerService.getTrackersByUserId).toHaveBeenCalledWith(
        mockUser.id,
        undefined,
      );
    });

    it('should_return_guild_trackers_when_guild_filter_provided', async () => {
      // ARRANGE
      const mockTrackers = [mockTracker];
      vi.mocked(mockTrackerService.getTrackersByGuild).mockResolvedValue(
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

  describe('getTrackersByUser', () => {
    it('should_return_trackers_when_user_has_access', async () => {
      // ARRANGE
      const targetUserId = 'user-456';
      const mockTrackers = [mockTracker];
      const paginatedResult = {
        data: mockTrackers,
        pagination: {
          page: 1,
          limit: 50,
          total: 1,
          pages: 1,
        },
      };
      vi.mocked(
        mockTrackerAuthorizationService.validateTrackerAccess,
      ).mockResolvedValue(undefined);
      vi.mocked(mockTrackerService.getTrackersByUserId).mockResolvedValue(
        paginatedResult as never,
      );

      // ACT
      const result = await controller.getTrackersByUser(
        targetUserId,
        mockUser,
        {},
      );

      // ASSERT
      expect(result).toEqual(paginatedResult);
      expect(
        mockTrackerAuthorizationService.validateTrackerAccess,
      ).toHaveBeenCalledWith(mockUser.id, targetUserId);
      expect(mockTrackerService.getTrackersByUserId).toHaveBeenCalledWith(
        targetUserId,
        {},
      );
    });

    it('should_call_authorization_service_when_accessing_other_user_trackers', async () => {
      // ARRANGE
      const targetUserId = 'user-456';
      const paginatedResult = {
        data: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          pages: 0,
        },
      };
      vi.mocked(
        mockTrackerAuthorizationService.validateTrackerAccess,
      ).mockResolvedValue(undefined);
      vi.mocked(mockTrackerService.getTrackersByUserId).mockResolvedValue(
        paginatedResult as never,
      );

      // ACT
      await controller.getTrackersByUser(targetUserId, mockUser, {});

      // ASSERT
      expect(
        mockTrackerAuthorizationService.validateTrackerAccess,
      ).toHaveBeenCalledWith(mockUser.id, targetUserId);
      expect(
        mockTrackerAuthorizationService.validateTrackerAccess,
      ).toHaveBeenCalledTimes(1);
    });

    it('should_throw_ForbiddenException_when_access_denied', async () => {
      // ARRANGE
      const targetUserId = 'user-456';
      vi.mocked(
        mockTrackerAuthorizationService.validateTrackerAccess,
      ).mockRejectedValue(
        new ForbiddenException(
          'You can only view trackers for yourself or members of guilds where you are an admin',
        ),
      );

      // ACT & ASSERT
      await expect(
        controller.getTrackersByUser(targetUserId, mockUser, {}),
      ).rejects.toThrow(ForbiddenException);

      expect(
        mockTrackerAuthorizationService.validateTrackerAccess,
      ).toHaveBeenCalledWith(mockUser.id, targetUserId);
      expect(mockTrackerService.getTrackersByUserId).not.toHaveBeenCalled();
    });
  });

  describe('getTracker', () => {
    it('should_return_tracker_when_user_is_owner', async () => {
      // ARRANGE
      vi.mocked(mockTrackerService.getTrackerById).mockResolvedValue(
        mockTracker as never,
      );
      vi.mocked(
        mockTrackerAuthorizationService.validateTrackerAccess,
      ).mockResolvedValue(undefined);

      // ACT
      const result = await controller.getTracker('tracker-123', mockUser);

      // ASSERT
      expect(result).toEqual(mockTracker);
      expect(mockTrackerService.getTrackerById).toHaveBeenCalledWith(
        'tracker-123',
      );
      expect(
        mockTrackerAuthorizationService.validateTrackerAccess,
      ).toHaveBeenCalledWith(mockUser.id, mockTracker.userId);
    });

    it('should_return_tracker_when_user_is_guild_admin', async () => {
      // ARRANGE
      const otherUserTracker = { ...mockTracker, userId: 'user-456' };
      vi.mocked(mockTrackerService.getTrackerById).mockResolvedValue(
        otherUserTracker as never,
      );
      vi.mocked(
        mockTrackerAuthorizationService.validateTrackerAccess,
      ).mockResolvedValue(undefined);

      // ACT
      const result = await controller.getTracker('tracker-123', mockUser);

      // ASSERT
      expect(result).toEqual(otherUserTracker);
      expect(
        mockTrackerAuthorizationService.validateTrackerAccess,
      ).toHaveBeenCalledWith(mockUser.id, 'user-456');
    });

    it('should_throw_ForbiddenException_when_user_has_no_access', async () => {
      // ARRANGE
      const otherUserTracker = { ...mockTracker, userId: 'user-456' };
      vi.mocked(mockTrackerService.getTrackerById).mockResolvedValue(
        otherUserTracker as never,
      );
      vi.mocked(
        mockTrackerAuthorizationService.validateTrackerAccess,
      ).mockRejectedValue(
        new ForbiddenException(
          'You can only view trackers for yourself or members of guilds where you are an admin',
        ),
      );

      // ACT & ASSERT
      await expect(
        controller.getTracker('tracker-123', mockUser),
      ).rejects.toThrow(ForbiddenException);
      expect(
        mockTrackerAuthorizationService.validateTrackerAccess,
      ).toHaveBeenCalledWith(mockUser.id, 'user-456');
    });

    it('should_throw_NotFoundException_when_tracker_not_found', async () => {
      // ARRANGE
      vi.mocked(mockTrackerService.getTrackerById).mockRejectedValue(
        new NotFoundException('Tracker not found'),
      );

      // ACT & ASSERT
      await expect(
        controller.getTracker('tracker-123', mockUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTrackerDetail', () => {
    it('should_return_tracker_detail_when_user_is_owner', async () => {
      // ARRANGE
      const trackerWithSeasons = {
        ...mockTracker,
        seasons: [
          { id: 'season-1', seasonNumber: 1, trackerId: 'tracker-123' },
        ],
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { seasons, ...trackerWithoutSeasons } = trackerWithSeasons;
      const transformedResult = {
        tracker: trackerWithoutSeasons,
        seasons: trackerWithSeasons.seasons,
      };
      vi.mocked(mockTrackerService.getTrackerById).mockResolvedValue(
        trackerWithSeasons as never,
      );
      vi.mocked(
        mockTrackerAuthorizationService.validateTrackerAccess,
      ).mockResolvedValue(undefined);
      vi.mocked(mockResponseMapper.transformTrackerDetail).mockReturnValue(
        transformedResult as any,
      );

      // ACT
      const result = await controller.getTrackerDetail('tracker-123', mockUser);

      // ASSERT
      expect(result).toEqual(transformedResult);
      expect(
        mockTrackerAuthorizationService.validateTrackerAccess,
      ).toHaveBeenCalledWith(mockUser.id, mockTracker.userId);
      expect(mockResponseMapper.transformTrackerDetail).toHaveBeenCalledWith(
        trackerWithSeasons,
      );
    });

    it('should_return_tracker_detail_when_user_is_guild_admin', async () => {
      // ARRANGE
      const otherUserTracker = {
        ...mockTracker,
        userId: 'user-456',
        seasons: [
          { id: 'season-1', seasonNumber: 1, trackerId: 'tracker-123' },
        ],
      };
      const transformedResult = {
        tracker: { ...otherUserTracker, seasons: undefined },
        seasons: otherUserTracker.seasons,
      };
      vi.mocked(mockTrackerService.getTrackerById).mockResolvedValue(
        otherUserTracker as never,
      );
      vi.mocked(
        mockTrackerAuthorizationService.validateTrackerAccess,
      ).mockResolvedValue(undefined);
      vi.mocked(mockResponseMapper.transformTrackerDetail).mockReturnValue(
        transformedResult as any,
      );

      // ACT
      const result = await controller.getTrackerDetail('tracker-123', mockUser);

      // ASSERT
      expect(result).toEqual(transformedResult);
      expect(
        mockTrackerAuthorizationService.validateTrackerAccess,
      ).toHaveBeenCalledWith(mockUser.id, 'user-456');
    });

    it('should_throw_ForbiddenException_when_user_has_no_access', async () => {
      // ARRANGE
      const otherUserTracker = {
        ...mockTracker,
        userId: 'user-456',
      };
      vi.mocked(mockTrackerService.getTrackerById).mockResolvedValue(
        otherUserTracker as never,
      );
      vi.mocked(
        mockTrackerAuthorizationService.validateTrackerAccess,
      ).mockRejectedValue(
        new ForbiddenException(
          'You can only view trackers for yourself or members of guilds where you are an admin',
        ),
      );

      // ACT & ASSERT
      await expect(
        controller.getTrackerDetail('tracker-123', mockUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getScrapingStatus', () => {
    it('should_return_status_when_user_is_owner', async () => {
      // ARRANGE
      const statusResult = {
        status: 'COMPLETED',
        error: null,
        lastScrapedAt: new Date(),
        attempts: 1,
      };
      vi.mocked(mockTrackerService.getTrackerById).mockResolvedValue(
        mockTracker as never,
      );
      vi.mocked(
        mockTrackerAuthorizationService.validateTrackerAccess,
      ).mockResolvedValue(undefined);
      vi.mocked(mockTrackerService.getScrapingStatus).mockResolvedValue(
        statusResult as never,
      );

      // ACT
      const result = await controller.getScrapingStatus(
        'tracker-123',
        mockUser,
      );

      // ASSERT
      expect(result).toEqual(statusResult);
      expect(
        mockTrackerAuthorizationService.validateTrackerAccess,
      ).toHaveBeenCalledWith(mockUser.id, mockTracker.userId);
      expect(mockTrackerService.getScrapingStatus).toHaveBeenCalledWith(
        'tracker-123',
        {
          scrapingStatus: mockTracker.scrapingStatus,
          scrapingError: mockTracker.scrapingError,
          lastScrapedAt: mockTracker.lastScrapedAt,
          scrapingAttempts: mockTracker.scrapingAttempts,
        },
      );
    });

    it('should_return_status_when_user_is_guild_admin', async () => {
      // ARRANGE
      const otherUserTracker = { ...mockTracker, userId: 'user-456' };
      const statusResult = {
        status: 'COMPLETED',
        error: null,
        lastScrapedAt: new Date(),
        attempts: 1,
      };
      vi.mocked(mockTrackerService.getTrackerById).mockResolvedValue(
        otherUserTracker as never,
      );
      vi.mocked(
        mockTrackerAuthorizationService.validateTrackerAccess,
      ).mockResolvedValue(undefined);
      vi.mocked(mockTrackerService.getScrapingStatus).mockResolvedValue(
        statusResult as never,
      );

      // ACT
      const result = await controller.getScrapingStatus(
        'tracker-123',
        mockUser,
      );

      // ASSERT
      expect(result).toEqual(statusResult);
      expect(
        mockTrackerAuthorizationService.validateTrackerAccess,
      ).toHaveBeenCalledWith(mockUser.id, 'user-456');
    });

    it('should_throw_ForbiddenException_when_user_has_no_access', async () => {
      // ARRANGE
      const otherUserTracker = { ...mockTracker, userId: 'user-456' };
      vi.mocked(mockTrackerService.getTrackerById).mockResolvedValue(
        otherUserTracker as never,
      );
      vi.mocked(
        mockTrackerAuthorizationService.validateTrackerAccess,
      ).mockRejectedValue(
        new ForbiddenException(
          'You can only view trackers for yourself or members of guilds where you are an admin',
        ),
      );

      // ACT & ASSERT
      await expect(
        controller.getScrapingStatus('tracker-123', mockUser),
      ).rejects.toThrow(ForbiddenException);
      expect(mockTrackerService.getScrapingStatus).not.toHaveBeenCalled();
    });
  });

  describe('getTrackerSeasons', () => {
    it('should_return_seasons_when_user_is_owner', async () => {
      // ARRANGE
      const mockSeasons = [
        { id: 'season-1', seasonNumber: 1, trackerId: 'tracker-123' },
      ];
      vi.mocked(mockTrackerService.getTrackerById).mockResolvedValue(
        mockTracker as never,
      );
      vi.mocked(
        mockTrackerAuthorizationService.validateTrackerAccess,
      ).mockResolvedValue(undefined);
      vi.mocked(mockTrackerService.getTrackerSeasons).mockResolvedValue(
        mockSeasons as never,
      );

      // ACT
      const result = await controller.getTrackerSeasons(
        'tracker-123',
        mockUser,
      );

      // ASSERT
      expect(result).toEqual(mockSeasons);
      expect(
        mockTrackerAuthorizationService.validateTrackerAccess,
      ).toHaveBeenCalledWith(mockUser.id, mockTracker.userId);
      expect(mockTrackerService.getTrackerSeasons).toHaveBeenCalledWith(
        'tracker-123',
      );
    });

    it('should_return_seasons_when_user_is_guild_admin', async () => {
      // ARRANGE
      const otherUserTracker = { ...mockTracker, userId: 'user-456' };
      const mockSeasons = [
        { id: 'season-1', seasonNumber: 1, trackerId: 'tracker-123' },
      ];
      vi.mocked(mockTrackerService.getTrackerById).mockResolvedValue(
        otherUserTracker as never,
      );
      vi.mocked(
        mockTrackerAuthorizationService.validateTrackerAccess,
      ).mockResolvedValue(undefined);
      vi.mocked(mockTrackerService.getTrackerSeasons).mockResolvedValue(
        mockSeasons as never,
      );

      // ACT
      const result = await controller.getTrackerSeasons(
        'tracker-123',
        mockUser,
      );

      // ASSERT
      expect(result).toEqual(mockSeasons);
      expect(
        mockTrackerAuthorizationService.validateTrackerAccess,
      ).toHaveBeenCalledWith(mockUser.id, 'user-456');
    });

    it('should_throw_ForbiddenException_when_user_has_no_access', async () => {
      // ARRANGE
      const otherUserTracker = { ...mockTracker, userId: 'user-456' };
      vi.mocked(mockTrackerService.getTrackerById).mockResolvedValue(
        otherUserTracker as never,
      );
      vi.mocked(
        mockTrackerAuthorizationService.validateTrackerAccess,
      ).mockRejectedValue(
        new ForbiddenException(
          'You can only view trackers for yourself or members of guilds where you are an admin',
        ),
      );

      // ACT & ASSERT
      await expect(
        controller.getTrackerSeasons('tracker-123', mockUser),
      ).rejects.toThrow(ForbiddenException);
      expect(mockTrackerService.getTrackerSeasons).not.toHaveBeenCalled();
    });
  });

  describe('getSnapshots', () => {
    it('should_return_snapshots_when_user_is_owner', async () => {
      // ARRANGE
      const mockSnapshots = [{ id: 'snapshot-1', trackerId: 'tracker-123' }];
      vi.mocked(mockTrackerService.getTrackerById).mockResolvedValue(
        mockTracker as never,
      );
      vi.mocked(
        mockTrackerAuthorizationService.validateTrackerAccess,
      ).mockResolvedValue(undefined);
      vi.mocked(mockSnapshotService.getSnapshotsByTracker).mockResolvedValue(
        mockSnapshots as never,
      );

      // ACT
      const result = await controller.getSnapshots('tracker-123', mockUser);

      // ASSERT
      expect(result).toEqual(mockSnapshots);
      expect(
        mockTrackerAuthorizationService.validateTrackerAccess,
      ).toHaveBeenCalledWith(mockUser.id, mockTracker.userId);
      expect(mockSnapshotService.getSnapshotsByTracker).toHaveBeenCalledWith(
        'tracker-123',
        true,
      );
    });

    it('should_return_snapshots_when_user_is_guild_admin', async () => {
      // ARRANGE
      const otherUserTracker = { ...mockTracker, userId: 'user-456' };
      const mockSnapshots = [{ id: 'snapshot-1', trackerId: 'tracker-123' }];
      vi.mocked(mockTrackerService.getTrackerById).mockResolvedValue(
        otherUserTracker as never,
      );
      vi.mocked(
        mockTrackerAuthorizationService.validateTrackerAccess,
      ).mockResolvedValue(undefined);
      vi.mocked(mockSnapshotService.getSnapshotsByTracker).mockResolvedValue(
        mockSnapshots as never,
      );

      // ACT
      const result = await controller.getSnapshots('tracker-123', mockUser);

      // ASSERT
      expect(result).toEqual(mockSnapshots);
      expect(
        mockTrackerAuthorizationService.validateTrackerAccess,
      ).toHaveBeenCalledWith(mockUser.id, 'user-456');
    });

    it('should_return_season_snapshots_when_user_is_owner_and_season_provided', async () => {
      // ARRANGE
      const season = 1;
      const mockSnapshots = [
        { id: 'snapshot-1', trackerId: 'tracker-123', seasonNumber: season },
      ];
      vi.mocked(mockTrackerService.getTrackerById).mockResolvedValue(
        mockTracker as never,
      );
      vi.mocked(
        mockTrackerAuthorizationService.validateTrackerAccess,
      ).mockResolvedValue(undefined);
      vi.mocked(
        mockSnapshotService.getSnapshotsByTrackerAndSeason,
      ).mockResolvedValue(mockSnapshots as never);

      // ACT
      const result = await controller.getSnapshots(
        'tracker-123',
        mockUser,
        season,
      );

      // ASSERT
      expect(result).toEqual(mockSnapshots);
      expect(
        mockTrackerAuthorizationService.validateTrackerAccess,
      ).toHaveBeenCalledWith(mockUser.id, mockTracker.userId);
      expect(
        mockSnapshotService.getSnapshotsByTrackerAndSeason,
      ).toHaveBeenCalledWith('tracker-123', season, true);
      expect(mockSnapshotService.getSnapshotsByTracker).not.toHaveBeenCalled();
    });

    it('should_return_season_snapshots_when_user_is_guild_admin_and_season_provided', async () => {
      // ARRANGE
      const season = 1;
      const otherUserTracker = { ...mockTracker, userId: 'user-456' };
      const mockSnapshots = [
        { id: 'snapshot-1', trackerId: 'tracker-123', seasonNumber: season },
      ];
      vi.mocked(mockTrackerService.getTrackerById).mockResolvedValue(
        otherUserTracker as never,
      );
      vi.mocked(
        mockTrackerAuthorizationService.validateTrackerAccess,
      ).mockResolvedValue(undefined);
      vi.mocked(
        mockSnapshotService.getSnapshotsByTrackerAndSeason,
      ).mockResolvedValue(mockSnapshots as never);

      // ACT
      const result = await controller.getSnapshots(
        'tracker-123',
        mockUser,
        season,
      );

      // ASSERT
      expect(result).toEqual(mockSnapshots);
      expect(
        mockTrackerAuthorizationService.validateTrackerAccess,
      ).toHaveBeenCalledWith(mockUser.id, 'user-456');
      expect(
        mockSnapshotService.getSnapshotsByTrackerAndSeason,
      ).toHaveBeenCalledWith('tracker-123', season, true);
      expect(mockSnapshotService.getSnapshotsByTracker).not.toHaveBeenCalled();
    });

    it('should_throw_ForbiddenException_when_user_has_no_access', async () => {
      // ARRANGE
      const otherUserTracker = { ...mockTracker, userId: 'user-456' };
      vi.mocked(mockTrackerService.getTrackerById).mockResolvedValue(
        otherUserTracker as never,
      );
      vi.mocked(
        mockTrackerAuthorizationService.validateTrackerAccess,
      ).mockRejectedValue(
        new ForbiddenException(
          'You can only view trackers for yourself or members of guilds where you are an admin',
        ),
      );

      // ACT & ASSERT
      await expect(
        controller.getSnapshots('tracker-123', mockUser),
      ).rejects.toThrow(ForbiddenException);
      expect(mockSnapshotService.getSnapshotsByTracker).not.toHaveBeenCalled();
    });
  });

  describe('createSnapshot', () => {
    it('should_create_snapshot_when_user_is_owner', async () => {
      // ARRANGE
      const dto = {
        trackerId: 'tracker-123',
        capturedAt: new Date(),
        seasonNumber: 1,
        ones: 1000,
        twos: 2000,
        threes: 3000,
        fours: 4000,
        onesGamesPlayed: 10,
        twosGamesPlayed: 20,
        threesGamesPlayed: 30,
        foursGamesPlayed: 40,
        guildIds: ['guild-1'],
      };
      const mockSnapshot = { id: 'snapshot-1', trackerId: 'tracker-123' };
      vi.mocked(mockTrackerService.getTrackerById).mockResolvedValue(
        mockTracker as never,
      );
      vi.mocked(mockSnapshotService.createSnapshot).mockResolvedValue(
        mockSnapshot as never,
      );

      // ACT
      const result = await controller.createSnapshot(
        'tracker-123',
        dto,
        mockUser,
      );

      // ASSERT
      expect(result).toEqual(mockSnapshot);
      expect(mockSnapshotService.createSnapshot).toHaveBeenCalledWith(
        'tracker-123',
        mockUser.id,
        expect.objectContaining({
          capturedAt: dto.capturedAt,
          seasonNumber: dto.seasonNumber,
        }),
      );
    });

    it('should_throw_ForbiddenException_when_user_is_not_owner', async () => {
      // ARRANGE
      const dto = {
        trackerId: 'tracker-123',
        capturedAt: new Date(),
        seasonNumber: 1,
        ones: 1000,
        twos: 2000,
        threes: 3000,
        fours: 4000,
        onesGamesPlayed: 10,
        twosGamesPlayed: 20,
        threesGamesPlayed: 30,
        foursGamesPlayed: 40,
        guildIds: ['guild-1'],
      };
      const otherUserTracker = { ...mockTracker, userId: 'user-456' };
      vi.mocked(mockTrackerService.getTrackerById).mockResolvedValue(
        otherUserTracker as never,
      );

      // ACT & ASSERT
      await expect(
        controller.createSnapshot('tracker-123', dto, mockUser),
      ).rejects.toThrow(ForbiddenException);
      expect(mockSnapshotService.createSnapshot).not.toHaveBeenCalled();
    });
  });

  describe('refreshTracker', () => {
    it('should_refresh_tracker_when_user_owns_tracker', async () => {
      // ARRANGE
      vi.mocked(mockTrackerService.getTrackerById).mockResolvedValue(
        mockTracker as never,
      );
      vi.mocked(
        mockTrackerProcessingService.refreshTrackerData,
      ).mockResolvedValue(undefined);

      // ACT
      const result = await controller.refreshTracker('tracker-123', mockUser);

      // ASSERT
      expect(result).toEqual({ message: 'Refresh job enqueued successfully' });
      expect(
        mockTrackerProcessingService.refreshTrackerData,
      ).toHaveBeenCalledWith('tracker-123');
    });

    it('should_throw_when_user_does_not_own_tracker', async () => {
      // ARRANGE
      const otherTracker = { ...mockTracker, userId: 'other-user' };
      vi.mocked(mockTrackerService.getTrackerById).mockResolvedValue(
        otherTracker as never,
      );

      // ACT & ASSERT
      await expect(
        controller.refreshTracker('tracker-123', mockUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateTracker', () => {
    it('should_update_tracker_when_user_is_owner', async () => {
      // ARRANGE
      const dto: UpdateTrackerDto = {
        displayName: 'Updated Name',
        isActive: false,
      };
      const updatedTracker = { ...mockTracker, ...dto };
      vi.mocked(mockTrackerService.getTrackerById).mockResolvedValue(
        mockTracker as never,
      );
      vi.mocked(mockTrackerService.updateTracker).mockResolvedValue(
        updatedTracker as never,
      );

      // ACT
      const result = await controller.updateTracker(
        'tracker-123',
        dto,
        mockUser,
      );

      // ASSERT
      expect(result).toEqual(updatedTracker);
      expect(mockTrackerService.getTrackerById).toHaveBeenCalledWith(
        'tracker-123',
      );
      expect(mockTrackerService.updateTracker).toHaveBeenCalledWith(
        'tracker-123',
        dto.displayName,
        dto.isActive,
      );
    });

    it('should_throw_ForbiddenException_when_user_is_not_owner', async () => {
      // ARRANGE
      const dto: UpdateTrackerDto = {
        displayName: 'Updated Name',
        isActive: false,
      };
      const otherUserTracker = { ...mockTracker, userId: 'user-456' };
      vi.mocked(mockTrackerService.getTrackerById).mockResolvedValue(
        otherUserTracker as never,
      );

      // ACT & ASSERT
      await expect(
        controller.updateTracker('tracker-123', dto, mockUser),
      ).rejects.toThrow(ForbiddenException);
      expect(mockTrackerService.updateTracker).not.toHaveBeenCalled();
    });

    it('should_throw_ForbiddenException_when_user_is_guild_admin_but_not_owner', async () => {
      // ARRANGE
      const dto: UpdateTrackerDto = {
        displayName: 'Updated Name',
        isActive: false,
      };
      const otherUserTracker = { ...mockTracker, userId: 'user-456' };
      vi.mocked(mockTrackerService.getTrackerById).mockResolvedValue(
        otherUserTracker as never,
      );
      // Note: updateTracker uses direct userId check, not validateTrackerAccess
      // Even if user is guild admin, they cannot update (owner-only operation)

      // ACT & ASSERT
      await expect(
        controller.updateTracker('tracker-123', dto, mockUser),
      ).rejects.toThrow(ForbiddenException);
      expect(mockTrackerService.updateTracker).not.toHaveBeenCalled();
    });

    it('should_throw_NotFoundException_when_tracker_not_found', async () => {
      // ARRANGE
      const dto: UpdateTrackerDto = {
        displayName: 'Updated Name',
        isActive: false,
      };
      vi.mocked(mockTrackerService.getTrackerById).mockRejectedValue(
        new NotFoundException('Tracker not found'),
      );

      // ACT & ASSERT
      await expect(
        controller.updateTracker('tracker-123', dto, mockUser),
      ).rejects.toThrow(NotFoundException);
      expect(mockTrackerService.updateTracker).not.toHaveBeenCalled();
    });
  });

  describe('deleteTracker', () => {
    it('should_delete_tracker_when_user_is_owner', async () => {
      // ARRANGE
      vi.mocked(mockTrackerService.getTrackerById).mockResolvedValue(
        mockTracker as never,
      );
      vi.mocked(mockTrackerService.deleteTracker).mockResolvedValue(
        mockTracker as never,
      );

      // ACT
      const result = await controller.deleteTracker('tracker-123', mockUser);

      // ASSERT
      expect(result).toEqual(mockTracker);
      expect(mockTrackerService.getTrackerById).toHaveBeenCalledWith(
        'tracker-123',
      );
      expect(mockTrackerService.deleteTracker).toHaveBeenCalledWith(
        'tracker-123',
      );
    });

    it('should_throw_ForbiddenException_when_user_is_not_owner', async () => {
      // ARRANGE
      const otherUserTracker = { ...mockTracker, userId: 'user-456' };
      vi.mocked(mockTrackerService.getTrackerById).mockResolvedValue(
        otherUserTracker as never,
      );

      // ACT & ASSERT
      await expect(
        controller.deleteTracker('tracker-123', mockUser),
      ).rejects.toThrow(ForbiddenException);
      expect(mockTrackerService.deleteTracker).not.toHaveBeenCalled();
    });

    it('should_throw_ForbiddenException_when_user_is_guild_admin_but_not_owner', async () => {
      // ARRANGE
      const otherUserTracker = { ...mockTracker, userId: 'user-456' };
      vi.mocked(mockTrackerService.getTrackerById).mockResolvedValue(
        otherUserTracker as never,
      );
      // Note: deleteTracker uses direct userId check, not validateTrackerAccess
      // Even if user is guild admin, they cannot delete (owner-only operation)

      // ACT & ASSERT
      await expect(
        controller.deleteTracker('tracker-123', mockUser),
      ).rejects.toThrow(ForbiddenException);
      expect(mockTrackerService.deleteTracker).not.toHaveBeenCalled();
    });

    it('should_throw_NotFoundException_when_tracker_not_found', async () => {
      // ARRANGE
      vi.mocked(mockTrackerService.getTrackerById).mockRejectedValue(
        new NotFoundException('Tracker not found'),
      );

      // ACT & ASSERT
      await expect(
        controller.deleteTracker('tracker-123', mockUser),
      ).rejects.toThrow(NotFoundException);
      expect(mockTrackerService.deleteTracker).not.toHaveBeenCalled();
    });
  });
});
