import { Test, TestingModule } from '@nestjs/testing';
import { TrackerAdminController } from './tracker-admin.controller';
import { TrackerService } from '../services/tracker.service';
import { TrackerRefreshSchedulerService } from '../services/tracker-refresh-scheduler.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SystemAdminGuard } from '../../common/guards/system-admin.guard';
import { TrackerScrapingStatus } from '@prisma/client';

const mockTrackerService = {
  refreshTrackerData: jest.fn(),
};

const mockRefreshScheduler = {
  triggerManualRefresh: jest.fn(),
};

const mockPrismaService = {
  tracker: {
    findMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  trackerScrapingLog: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

describe('TrackerAdminController', () => {
  let controller: TrackerAdminController;
  let trackerService: jest.Mocked<TrackerService>;
  let refreshScheduler: jest.Mocked<TrackerRefreshSchedulerService>;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrackerAdminController],
      providers: [
        {
          provide: TrackerService,
          useValue: mockTrackerService,
        },
        {
          provide: TrackerRefreshSchedulerService,
          useValue: mockRefreshScheduler,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(SystemAdminGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<TrackerAdminController>(TrackerAdminController);
    trackerService = module.get<TrackerService>(
      TrackerService,
    ) as jest.Mocked<TrackerService>;
    refreshScheduler = module.get<TrackerRefreshSchedulerService>(
      TrackerRefreshSchedulerService,
    ) as jest.Mocked<TrackerRefreshSchedulerService>;
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getTrackers', () => {
    const mockTrackers = [
      {
        id: 'tracker1',
        url: 'https://rocketleague.tracker.network/rocket-league/profile/steam/user1/overview',
        username: 'user1',
        platform: 'STEAM',
        game: 'ROCKET_LEAGUE',
        scrapingStatus: TrackerScrapingStatus.COMPLETED,
        isDeleted: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        user: {
          id: 'user1',
          username: 'testuser1',
          globalName: 'Test User 1',
        },
        seasons: [
          {
            id: 'season1',
            seasonNumber: 25,
            trackerId: 'tracker1',
          },
        ],
      },
      {
        id: 'tracker2',
        url: 'https://rocketleague.tracker.network/rocket-league/profile/steam/user2/overview',
        username: 'user2',
        platform: 'STEAM',
        game: 'ROCKET_LEAGUE',
        scrapingStatus: TrackerScrapingStatus.PENDING,
        isDeleted: false,
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
        user: {
          id: 'user2',
          username: 'testuser2',
          globalName: 'Test User 2',
        },
        seasons: [],
      },
    ];

    it('should return all trackers with default pagination when no filters provided', async () => {
      // ARRANGE
      const totalCount = 2;
      prisma.tracker.findMany.mockResolvedValue(mockTrackers);
      prisma.tracker.count.mockResolvedValue(totalCount);

      // ACT
      const result = await controller.getTrackers();

      expect(result).toEqual({
        data: mockTrackers,
        pagination: {
          page: 1,
          limit: 50,
          total: totalCount,
          totalPages: 1,
        },
      });
    });

    it('should filter by scraping status when status query parameter provided', async () => {
      // ARRANGE
      const status = TrackerScrapingStatus.COMPLETED;
      const filteredTrackers = [mockTrackers[0]];
      const totalCount = 1;
      prisma.tracker.findMany.mockResolvedValue(filteredTrackers);
      prisma.tracker.count.mockResolvedValue(totalCount);

      // ACT
      const result = await controller.getTrackers(status);

      expect(result.data).toEqual(filteredTrackers);
      expect(result.pagination.total).toBe(totalCount);
    });

    it('should filter by platform when platform query parameter provided', async () => {
      // ARRANGE
      const platform = 'STEAM';
      const totalCount = 2;
      prisma.tracker.findMany.mockResolvedValue(mockTrackers);
      prisma.tracker.count.mockResolvedValue(totalCount);

      // ACT
      const result = await controller.getTrackers(undefined, platform);

      expect(result.data).toEqual(mockTrackers);
      expect(result.pagination.total).toBe(totalCount);
    });

    it('should apply pagination when page and limit query parameters provided', async () => {
      // ARRANGE
      const page = 2;
      const limit = 10;
      const totalCount = 25;
      prisma.tracker.findMany.mockResolvedValue(mockTrackers);
      prisma.tracker.count.mockResolvedValue(totalCount);

      // ACT
      const result = await controller.getTrackers(
        undefined,
        undefined,
        page,
        limit,
      );

      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: totalCount,
        totalPages: 3,
      });
    });

    it('should apply all filters together when multiple query parameters provided', async () => {
      // ARRANGE
      const status = TrackerScrapingStatus.FAILED;
      const platform = 'EPIC';
      const page = 1;
      const limit = 5;
      const totalCount = 3;
      prisma.tracker.findMany.mockResolvedValue(mockTrackers);
      prisma.tracker.count.mockResolvedValue(totalCount);

      // ACT
      const result = await controller.getTrackers(
        status,
        platform,
        page,
        limit,
      );

      expect(result.data).toEqual(mockTrackers);
      expect(result.pagination.total).toBe(totalCount);
    });

    it('should calculate totalPages correctly when total is not evenly divisible by limit', async () => {
      // ARRANGE
      const totalCount = 27;
      const limit = 10;
      prisma.tracker.findMany.mockResolvedValue(mockTrackers);
      prisma.tracker.count.mockResolvedValue(totalCount);

      // ACT
      const result = await controller.getTrackers(
        undefined,
        undefined,
        1,
        limit,
      );

      // ASSERT
      expect(result.pagination.totalPages).toBe(3); // Math.ceil(27 / 10) = 3
    });
  });

  describe('getScrapingStatusOverview', () => {
    it('should return scraping status overview with counts by status', async () => {
      // ARRANGE
      const statusCounts = [
        { scrapingStatus: TrackerScrapingStatus.PENDING, _count: { id: 5 } },
        {
          scrapingStatus: TrackerScrapingStatus.IN_PROGRESS,
          _count: { id: 3 },
        },
        { scrapingStatus: TrackerScrapingStatus.COMPLETED, _count: { id: 10 } },
        { scrapingStatus: TrackerScrapingStatus.FAILED, _count: { id: 2 } },
      ];
      const totalCount = 20;
      prisma.tracker.groupBy.mockResolvedValue(statusCounts);
      prisma.tracker.count.mockResolvedValue(totalCount);

      // ACT
      const result = await controller.getScrapingStatusOverview();

      expect(result).toEqual({
        total: totalCount,
        byStatus: {
          PENDING: 5,
          IN_PROGRESS: 3,
          COMPLETED: 10,
          FAILED: 2,
        },
      });
    });

    it('should return zero counts for missing statuses', async () => {
      // ARRANGE
      const statusCounts = [
        { scrapingStatus: TrackerScrapingStatus.COMPLETED, _count: { id: 10 } },
      ];
      const totalCount = 10;
      prisma.tracker.groupBy.mockResolvedValue(statusCounts);
      prisma.tracker.count.mockResolvedValue(totalCount);

      // ACT
      const result = await controller.getScrapingStatusOverview();

      // ASSERT
      expect(result).toEqual({
        total: totalCount,
        byStatus: {
          PENDING: 0,
          IN_PROGRESS: 0,
          COMPLETED: 10,
          FAILED: 0,
        },
      });
    });

    it('should handle empty tracker list', async () => {
      // ARRANGE
      const statusCounts: any[] = [];
      const totalCount = 0;
      prisma.tracker.groupBy.mockResolvedValue(statusCounts);
      prisma.tracker.count.mockResolvedValue(totalCount);

      // ACT
      const result = await controller.getScrapingStatusOverview();

      // ASSERT
      expect(result).toEqual({
        total: 0,
        byStatus: {
          PENDING: 0,
          IN_PROGRESS: 0,
          COMPLETED: 0,
          FAILED: 0,
        },
      });
    });
  });

  describe('getScrapingLogs', () => {
    const mockLogs = [
      {
        id: 'log1',
        trackerId: 'tracker1',
        status: TrackerScrapingStatus.COMPLETED,
        startedAt: new Date('2024-01-01'),
        completedAt: new Date('2024-01-01'),
        error: null,
        tracker: {
          id: 'tracker1',
          url: 'https://rocketleague.tracker.network/rocket-league/profile/steam/user1/overview',
          username: 'user1',
          platform: 'STEAM',
        },
      },
      {
        id: 'log2',
        trackerId: 'tracker2',
        status: TrackerScrapingStatus.FAILED,
        startedAt: new Date('2024-01-02'),
        completedAt: null,
        error: 'Connection timeout',
        tracker: {
          id: 'tracker2',
          url: 'https://rocketleague.tracker.network/rocket-league/profile/steam/user2/overview',
          username: 'user2',
          platform: 'STEAM',
        },
      },
    ];

    it('should return all scraping logs with default pagination when no filters provided', async () => {
      // ARRANGE
      const totalCount = 2;
      prisma.trackerScrapingLog.findMany.mockResolvedValue(mockLogs);
      prisma.trackerScrapingLog.count.mockResolvedValue(totalCount);

      // ACT
      const result = await controller.getScrapingLogs();

      expect(result).toEqual({
        data: mockLogs,
        pagination: {
          page: 1,
          limit: 50,
          total: totalCount,
          totalPages: 1,
        },
      });
    });

    it('should filter by trackerId when trackerId query parameter provided', async () => {
      // ARRANGE
      const trackerId = 'tracker1';
      const filteredLogs = [mockLogs[0]];
      const totalCount = 1;
      prisma.trackerScrapingLog.findMany.mockResolvedValue(filteredLogs);
      prisma.trackerScrapingLog.count.mockResolvedValue(totalCount);

      // ACT
      const result = await controller.getScrapingLogs(trackerId);

      expect(result.data).toEqual(filteredLogs);
      expect(result.pagination.total).toBe(totalCount);
    });

    it('should filter by status when status query parameter provided', async () => {
      // ARRANGE
      const status = TrackerScrapingStatus.FAILED;
      const filteredLogs = [mockLogs[1]];
      const totalCount = 1;
      prisma.trackerScrapingLog.findMany.mockResolvedValue(filteredLogs);
      prisma.trackerScrapingLog.count.mockResolvedValue(totalCount);

      // ACT
      const result = await controller.getScrapingLogs(undefined, status);

      expect(result.data).toEqual(filteredLogs);
      expect(result.pagination.total).toBe(totalCount);
    });

    it('should apply pagination when page and limit query parameters provided', async () => {
      // ARRANGE
      const page = 2;
      const limit = 10;
      const totalCount = 25;
      prisma.trackerScrapingLog.findMany.mockResolvedValue(mockLogs);
      prisma.trackerScrapingLog.count.mockResolvedValue(totalCount);

      // ACT
      const result = await controller.getScrapingLogs(
        undefined,
        undefined,
        page,
        limit,
      );

      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: totalCount,
        totalPages: 3,
      });
    });

    it('should apply all filters together when multiple query parameters provided', async () => {
      // ARRANGE
      const trackerId = 'tracker1';
      const status = TrackerScrapingStatus.COMPLETED;
      const page = 1;
      const limit = 5;
      const totalCount = 1;
      prisma.trackerScrapingLog.findMany.mockResolvedValue([mockLogs[0]]);
      prisma.trackerScrapingLog.count.mockResolvedValue(totalCount);

      // ACT
      const result = await controller.getScrapingLogs(
        trackerId,
        status,
        page,
        limit,
      );

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(totalCount);
    });
  });

  describe('refreshTracker', () => {
    it('should trigger refresh for a specific tracker and return success message', async () => {
      // ARRANGE
      const trackerId = 'tracker1';
      trackerService.refreshTrackerData.mockResolvedValue(undefined);

      // ACT
      const result = await controller.refreshTracker(trackerId);

      expect(result).toEqual({ message: 'Refresh job enqueued successfully' });
    });

    it('should propagate errors from TrackerService', async () => {
      // ARRANGE
      const trackerId = 'invalid-tracker';
      const error = new Error('Tracker not found');
      trackerService.refreshTrackerData.mockRejectedValue(error);

      await expect(controller.refreshTracker(trackerId)).rejects.toThrow(
        'Tracker not found',
      );
    });
  });

  describe('batchRefresh', () => {
    it('should trigger batch refresh with specific tracker IDs and return success message', async () => {
      // ARRANGE
      const trackerIds = ['tracker1', 'tracker2', 'tracker3'];
      const dto = { trackerIds };
      refreshScheduler.triggerManualRefresh.mockResolvedValue(undefined);

      // ACT
      const result = await controller.batchRefresh(dto);

      expect(result).toEqual({
        message: 'Batch refresh triggered successfully',
        trackerIds: trackerIds,
      });
    });

    it('should trigger batch refresh for all trackers when trackerIds not provided', async () => {
      // ARRANGE
      const dto = {};
      refreshScheduler.triggerManualRefresh.mockResolvedValue(undefined);

      // ACT
      const result = await controller.batchRefresh(dto);

      expect(result).toEqual({
        message: 'Batch refresh triggered successfully',
        trackerIds: 'all',
      });
    });

    it('should trigger batch refresh for all trackers when trackerIds is empty array', async () => {
      // ARRANGE
      const dto = { trackerIds: [] };
      refreshScheduler.triggerManualRefresh.mockResolvedValue(undefined);

      // ACT
      const result = await controller.batchRefresh(dto);

      expect(result).toEqual({
        message: 'Batch refresh triggered successfully',
        trackerIds: [],
      });
    });

    it('should propagate errors from TrackerRefreshSchedulerService', async () => {
      // ARRANGE
      const dto = { trackerIds: ['tracker1'] };
      const error = new Error('Failed to trigger batch refresh');
      refreshScheduler.triggerManualRefresh.mockRejectedValue(error);

      await expect(controller.batchRefresh(dto)).rejects.toThrow(
        'Failed to trigger batch refresh',
      );
    });
  });
});
