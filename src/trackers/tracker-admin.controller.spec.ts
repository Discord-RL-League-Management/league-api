/**
 * TrackerAdminController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { TrackerAdminController } from './tracker-admin.controller';
import { TrackerService } from './tracker.service';
import { TrackerProcessingService } from './services/tracker-processing.service';
import { TrackerRefreshSchedulerService } from './services/tracker-refresh-scheduler.service';
import { BatchRefreshDto } from './dto/batch-refresh.dto';
import { TrackerScrapingStatus, GamePlatform } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SystemAdminGuard } from '../common/authorization/guards/system-admin/system-admin.guard';

describe('TrackerAdminController', () => {
  let controller: TrackerAdminController;
  let mockTrackerService: TrackerService;
  let mockTrackerProcessingService: TrackerProcessingService;
  let mockRefreshScheduler: TrackerRefreshSchedulerService;

  beforeEach(async () => {
    mockTrackerService = {
      findAllAdmin: vi.fn(),
      getScrapingStatusOverview: vi.fn(),
      getScrapingLogs: vi.fn(),
    } as unknown as TrackerService;

    mockTrackerProcessingService = {
      refreshTrackerData: vi.fn(),
    } as unknown as TrackerProcessingService;

    mockRefreshScheduler = {
      triggerManualRefresh: vi.fn(),
    } as unknown as TrackerRefreshSchedulerService;

    const module = await Test.createTestingModule({
      controllers: [TrackerAdminController],
      providers: [
        { provide: TrackerService, useValue: mockTrackerService },
        {
          provide: TrackerProcessingService,
          useValue: mockTrackerProcessingService,
        },
        {
          provide: TrackerRefreshSchedulerService,
          useValue: mockRefreshScheduler,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: vi.fn().mockReturnValue(true),
      } as unknown as JwtAuthGuard)
      .overrideGuard(SystemAdminGuard)
      .useValue({
        canActivate: vi.fn().mockReturnValue(true),
      } as unknown as SystemAdminGuard)
      .compile();

    controller = module.get<TrackerAdminController>(TrackerAdminController);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getTrackers', () => {
    it('should_return_trackers_when_no_filters', async () => {
      const mockTrackers = { trackers: [], pagination: {} };
      vi.spyOn(mockTrackerService, 'findAllAdmin').mockResolvedValue(
        mockTrackers as never,
      );

      const result = await controller.getTrackers();

      expect(result).toEqual(mockTrackers);
      expect(mockTrackerService.findAllAdmin).toHaveBeenCalledWith({});
    });

    it('should_filter_by_status_when_provided', async () => {
      const mockTrackers = { trackers: [], pagination: {} };
      vi.spyOn(mockTrackerService, 'findAllAdmin').mockResolvedValue(
        mockTrackers as never,
      );

      await controller.getTrackers(
        TrackerScrapingStatus.PENDING,
        undefined,
        undefined,
        undefined,
      );

      expect(mockTrackerService.findAllAdmin).toHaveBeenCalledWith({
        status: TrackerScrapingStatus.PENDING,
        platform: undefined,
        page: undefined,
        limit: undefined,
      });
    });

    it('should_filter_by_platform_when_provided', async () => {
      const mockTrackers = { trackers: [], pagination: {} };
      vi.spyOn(mockTrackerService, 'findAllAdmin').mockResolvedValue(
        mockTrackers as never,
      );

      await controller.getTrackers(undefined, GamePlatform.STEAM, 1, 50);

      expect(mockTrackerService.findAllAdmin).toHaveBeenCalledWith({
        status: undefined,
        platform: GamePlatform.STEAM,
        page: 1,
        limit: 50,
      });
    });
  });

  describe('getScrapingStatusOverview', () => {
    it('should_return_status_overview', async () => {
      const mockOverview = {
        total: 100,
        pending: 10,
        inProgress: 5,
        completed: 80,
        failed: 5,
      };
      vi.spyOn(
        mockTrackerService,
        'getScrapingStatusOverview',
      ).mockResolvedValue(mockOverview as never);

      const result = await controller.getScrapingStatusOverview();

      expect(result).toEqual(mockOverview);
      expect(mockTrackerService.getScrapingStatusOverview).toHaveBeenCalled();
    });
  });

  describe('getScrapingLogs', () => {
    it('should_return_logs_when_no_filters', async () => {
      const mockLogs = { logs: [], pagination: {} };
      vi.spyOn(mockTrackerService, 'getScrapingLogs').mockResolvedValue(
        mockLogs as never,
      );

      const result = await controller.getScrapingLogs();

      expect(result).toEqual(mockLogs);
      expect(mockTrackerService.getScrapingLogs).toHaveBeenCalledWith({});
    });

    it('should_filter_logs_when_filters_provided', async () => {
      const mockLogs = { logs: [], pagination: {} };
      vi.spyOn(mockTrackerService, 'getScrapingLogs').mockResolvedValue(
        mockLogs as never,
      );

      await controller.getScrapingLogs(
        'tracker_123',
        TrackerScrapingStatus.COMPLETED,
        1,
        50,
      );

      expect(mockTrackerService.getScrapingLogs).toHaveBeenCalledWith({
        trackerId: 'tracker_123',
        status: TrackerScrapingStatus.COMPLETED,
        page: 1,
        limit: 50,
      });
    });
  });

  describe('refreshTracker', () => {
    it('should_trigger_refresh_when_tracker_exists', async () => {
      vi.spyOn(
        mockTrackerProcessingService,
        'refreshTrackerData',
      ).mockResolvedValue(undefined as never);

      const result = await controller.refreshTracker('tracker_123');

      expect(result).toEqual({ message: 'Refresh job enqueued successfully' });
      expect(
        mockTrackerProcessingService.refreshTrackerData,
      ).toHaveBeenCalledWith('tracker_123');
    });
  });

  describe('batchRefresh', () => {
    it('should_trigger_batch_refresh_when_tracker_ids_provided', async () => {
      const batchDto: BatchRefreshDto = {
        trackerIds: ['tracker_1', 'tracker_2'],
      };
      vi.spyOn(mockRefreshScheduler, 'triggerManualRefresh').mockResolvedValue(
        undefined as never,
      );

      const result = await controller.batchRefresh(batchDto);

      expect(result).toEqual({
        message: 'Batch refresh triggered successfully',
        trackerIds: ['tracker_1', 'tracker_2'],
      });
      expect(mockRefreshScheduler.triggerManualRefresh).toHaveBeenCalledWith([
        'tracker_1',
        'tracker_2',
      ]);
    });

    it('should_trigger_refresh_for_all_when_no_tracker_ids', async () => {
      const batchDto: BatchRefreshDto = {};
      vi.spyOn(mockRefreshScheduler, 'triggerManualRefresh').mockResolvedValue(
        undefined as never,
      );

      const result = await controller.batchRefresh(batchDto);

      expect(result).toEqual({
        message: 'Batch refresh triggered successfully',
        trackerIds: 'all',
      });
      expect(mockRefreshScheduler.triggerManualRefresh).toHaveBeenCalledWith(
        undefined,
      );
    });
  });
});
