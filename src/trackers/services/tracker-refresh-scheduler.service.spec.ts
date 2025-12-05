import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { ConfigService } from '@nestjs/config';
import { TrackerRefreshSchedulerService } from './tracker-refresh-scheduler.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TrackerScrapingQueueService } from '../queues/tracker-scraping.queue';
import { TrackerBatchRefreshService } from './tracker-batch-refresh.service';

// Mock CronJob to prevent real timers from being created
jest.mock('cron', () => {
  return {
    CronJob: jest.fn().mockImplementation(() => ({
      start: jest.fn(),
      stop: jest.fn(),
      destroy: jest.fn(),
    })),
  };
});

describe('TrackerRefreshSchedulerService', () => {
  let service: TrackerRefreshSchedulerService;
  let mockPrismaService: jest.Mocked<PrismaService>;
  let mockScrapingQueueService: jest.Mocked<TrackerScrapingQueueService>;
  let mockBatchRefreshService: jest.Mocked<TrackerBatchRefreshService>;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockSchedulerRegistry: jest.Mocked<SchedulerRegistry>;

  beforeEach(async () => {
    mockPrismaService = {
      tracker: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as unknown as jest.Mocked<PrismaService>;

    mockScrapingQueueService = {} as any;

    mockBatchRefreshService = {
      refreshTrackers: jest.fn().mockResolvedValue(undefined),
      refreshTrackersInBatches: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockConfigService = {
      get: jest
        .fn<
          {
            refreshIntervalHours: number;
            batchSize: number;
            refreshCron: string;
          },
          [string, unknown?]
        >()
        .mockReturnValue({
          refreshIntervalHours: 24,
          batchSize: 10,
          refreshCron: '0 2 * * *',
        }),
    } as any;

    mockSchedulerRegistry = {
      addCronJob: jest.fn(),
      deleteCronJob: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackerRefreshSchedulerService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: TrackerScrapingQueueService,
          useValue: mockScrapingQueueService,
        },
        {
          provide: TrackerBatchRefreshService,
          useValue: mockBatchRefreshService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: SchedulerRegistry,
          useValue: mockSchedulerRegistry,
        },
      ],
    }).compile();

    service = module.get<TrackerRefreshSchedulerService>(
      TrackerRefreshSchedulerService,
    );
  });

  afterEach(() => {
    // Clean up any CronJob instances to prevent open handles
    if (service['cronJob']) {
      service['cronJob'].stop();
      const cronJob = service['cronJob'] as any;
      if (cronJob.destroy) {
        cronJob.destroy();
      }
      service['cronJob'] = null;
    }
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should register and start cron job with configured cron expression', () => {
      // ARRANGE
      const logSpy = jest.spyOn(service['logger'], 'log');

      // ACT
      service.onModuleInit();

      // ASSERT
      expect(mockSchedulerRegistry.addCronJob).toHaveBeenCalledWith(
        'tracker-refresh',
        expect.objectContaining({
          start: expect.any(Function),
          stop: expect.any(Function),
        }),
      );
      expect(service['cronJob']).not.toBeNull();
      // Verify that start() was called on the cron job
      expect(service['cronJob']?.start).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Tracker refresh scheduler initialized'),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Tracker refresh cron job registered'),
      );

      // Cleanup: Stop the cron job to prevent open handles
      if (service['cronJob']) {
        service['cronJob'].stop();
        const cronJob = service['cronJob'] as any;
        if (cronJob.destroy) {
          cronJob.destroy();
        }
        service['cronJob'] = null;
      }
    });

    it('should use default cron expression when not configured', async () => {
      // ARRANGE
      const customMockConfigService = {
        get: jest.fn().mockReturnValue({
          refreshIntervalHours: 24,
          batchSize: 10,
          refreshCron: undefined,
        }),
      } as any;

      const customModule = await Test.createTestingModule({
        providers: [
          TrackerRefreshSchedulerService,
          { provide: PrismaService, useValue: mockPrismaService },
          {
            provide: TrackerScrapingQueueService,
            useValue: mockScrapingQueueService,
          },
          {
            provide: TrackerBatchRefreshService,
            useValue: mockBatchRefreshService,
          },
          { provide: ConfigService, useValue: customMockConfigService },
          { provide: SchedulerRegistry, useValue: mockSchedulerRegistry },
        ],
      }).compile();

      const customService = customModule.get<TrackerRefreshSchedulerService>(
        TrackerRefreshSchedulerService,
      );

      // ACT
      customService.onModuleInit();

      // ASSERT
      expect(mockSchedulerRegistry.addCronJob).toHaveBeenCalledWith(
        'tracker-refresh',
        expect.objectContaining({
          start: expect.any(Function),
          stop: expect.any(Function),
        }),
      );
      // Verify that start() was called on the cron job
      expect(customService['cronJob']?.start).toHaveBeenCalledTimes(1);

      // Cleanup: Stop the cron job to prevent open handles
      if (customService['cronJob']) {
        customService['cronJob'].stop();
        const cronJob = customService['cronJob'] as any;
        if (cronJob.destroy) {
          cronJob.destroy();
        }
        customService['cronJob'] = null;
      }
    });
  });

  describe('scheduledRefresh', () => {
    it('should trigger manual refresh when called', async () => {
      // ARRANGE
      const triggerManualRefreshSpy = jest
        .spyOn(service, 'triggerManualRefresh')
        .mockResolvedValue(undefined);
      const logSpy = jest.spyOn(service['logger'], 'log');

      // ACT
      await service.scheduledRefresh();

      // ASSERT
      expect(logSpy).toHaveBeenCalledWith('Starting scheduled tracker refresh');
      expect(triggerManualRefreshSpy).toHaveBeenCalledTimes(1);
      expect(triggerManualRefreshSpy).toHaveBeenCalledWith();
    });
  });

  describe('triggerManualRefresh', () => {
    it('should refresh specific trackers when trackerIds are provided', async () => {
      // ARRANGE
      const trackerIds = ['tracker1', 'tracker2', 'tracker3'];
      const logSpy = jest.spyOn(service['logger'], 'log');

      // ACT
      await service.triggerManualRefresh(trackerIds);

      // ASSERT
      expect(logSpy).toHaveBeenCalledWith('Manually refreshing 3 trackers');
      expect(mockBatchRefreshService.refreshTrackers).toHaveBeenCalledWith(
        trackerIds,
      );
      expect(
        mockBatchRefreshService.refreshTrackersInBatches,
      ).not.toHaveBeenCalled();
    });

    it('should refresh all trackers needing refresh when no trackerIds provided', async () => {
      // ARRANGE
      const trackersNeedingRefresh = ['tracker1', 'tracker2'];
      (mockPrismaService.tracker.findMany as jest.Mock).mockResolvedValue([
        { id: 'tracker1' },
        { id: 'tracker2' },
      ] as any);
      const logSpy = jest.spyOn(service['logger'], 'log');

      // ACT
      await service.triggerManualRefresh();

      // ASSERT
      expect(mockPrismaService.tracker.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          isDeleted: false,
          OR: [
            { lastScrapedAt: null },
            {
              lastScrapedAt: expect.objectContaining({ lt: expect.any(Date) }),
            },
          ],
          scrapingStatus: {
            not: 'IN_PROGRESS',
          },
        },
        select: {
          id: true,
        },
      });
      expect(logSpy).toHaveBeenCalledWith('Found 2 trackers needing refresh');
      expect(
        mockBatchRefreshService.refreshTrackersInBatches,
      ).toHaveBeenCalledWith(trackersNeedingRefresh, 10);
      expect(mockBatchRefreshService.refreshTrackers).not.toHaveBeenCalled();
    });

    it('should log message and return early when no trackers need refresh', async () => {
      // ARRANGE
      (mockPrismaService.tracker.findMany as jest.Mock).mockResolvedValue([]);
      const logSpy = jest.spyOn(service['logger'], 'log');

      // ACT
      await service.triggerManualRefresh();

      // ASSERT
      expect(logSpy).toHaveBeenCalledWith(
        'No trackers need refresh at this time',
      );
      expect(
        mockBatchRefreshService.refreshTrackersInBatches,
      ).not.toHaveBeenCalled();
      expect(mockBatchRefreshService.refreshTrackers).not.toHaveBeenCalled();
    });

    it('should throw error when batch refresh service fails', async () => {
      // ARRANGE
      const error = new Error('Batch refresh failed');
      mockBatchRefreshService.refreshTrackers.mockRejectedValue(error);
      const trackerIds = ['tracker1'];
      const logSpy = jest.spyOn(service['logger'], 'error');

      // ACT & ASSERT
      await expect(service.triggerManualRefresh(trackerIds)).rejects.toThrow(
        'Batch refresh failed',
      );
      expect(logSpy).toHaveBeenCalledWith(
        'Error during tracker refresh: Batch refresh failed',
        error,
      );
    });

    it('should throw error when getTrackersNeedingRefresh fails', async () => {
      // ARRANGE
      const error = new Error('Database query failed');
      (mockPrismaService.tracker.findMany as jest.Mock).mockRejectedValue(
        error,
      );
      const logSpy = jest.spyOn(service['logger'], 'error');

      // ACT & ASSERT
      await expect(service.triggerManualRefresh()).rejects.toThrow(
        'Database query failed',
      );
      expect(logSpy).toHaveBeenCalledWith(
        'Error during tracker refresh: Database query failed',
        error,
      );
    });

    it('should handle empty trackerIds array', async () => {
      // ARRANGE
      const trackerIds: string[] = [];
      (mockPrismaService.tracker.findMany as jest.Mock).mockResolvedValue([]);
      const logSpy = jest.spyOn(service['logger'], 'log');

      // ACT
      await service.triggerManualRefresh(trackerIds);

      // ASSERT
      expect(logSpy).toHaveBeenCalledWith(
        'No trackers need refresh at this time',
      );
      expect(mockBatchRefreshService.refreshTrackers).not.toHaveBeenCalled();
    });
  });

  describe('onApplicationShutdown', () => {
    beforeEach(() => {
      // Initialize the service to set up the cron job
      service.onModuleInit();
    });

    it('should stop the cron job on shutdown', async () => {
      // ARRANGE
      const cronJob = service['cronJob'];
      const stopSpy = jest.spyOn(cronJob!, 'stop');

      // ACT
      await service.onApplicationShutdown('SIGTERM');

      // ASSERT
      expect(stopSpy).toHaveBeenCalledTimes(1);
    });

    it('should remove cron job from registry', async () => {
      // ACT
      await service.onApplicationShutdown('SIGTERM');

      // ASSERT
      expect(mockSchedulerRegistry.deleteCronJob).toHaveBeenCalledWith(
        'tracker-refresh',
      );
    });

    it('should log shutdown signal', async () => {
      // ARRANGE
      const logSpy = jest.spyOn(service['logger'], 'log');

      // ACT
      await service.onApplicationShutdown('SIGTERM');

      // ASSERT
      expect(logSpy).toHaveBeenCalledWith('Application shutting down: SIGTERM');
    });

    it('should handle unknown signal', async () => {
      // ARRANGE
      const logSpy = jest.spyOn(service['logger'], 'log');

      // ACT
      await service.onApplicationShutdown();

      // ASSERT
      expect(logSpy).toHaveBeenCalledWith(
        'Application shutting down: unknown signal',
      );
    });

    it('should log successful shutdown', async () => {
      // ARRANGE
      const logSpy = jest.spyOn(service['logger'], 'log');

      // ACT
      await service.onApplicationShutdown('SIGINT');

      // ASSERT
      expect(logSpy).toHaveBeenCalledWith(
        '✅ Tracker refresh scheduler stopped',
      );
    });

    it('should handle case when cron job is null', async () => {
      // ARRANGE
      service['cronJob'] = null;
      const logSpy = jest.spyOn(service['logger'], 'log');

      // ACT
      await service.onApplicationShutdown('SIGTERM');

      // ASSERT
      expect(mockSchedulerRegistry.deleteCronJob).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(
        '✅ Tracker refresh scheduler stopped',
      );
    });

    it('should set cron job to null after shutdown', async () => {
      // ACT
      await service.onApplicationShutdown('SIGTERM');

      // ASSERT
      expect(service['cronJob']).toBeNull();
    });
  });
});
