/**
 * TrackerBatchRefreshService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { TrackerBatchRefreshService } from './tracker-batch-refresh.service';
import { TrackerScrapingQueueService } from '../queues/tracker-scraping.queue';
import { ConfigService } from '@nestjs/config';

describe('TrackerBatchRefreshService', () => {
  let service: TrackerBatchRefreshService;
  let mockScrapingQueueService: TrackerScrapingQueueService;
  let mockConfigService: ConfigService;

  beforeEach(async () => {
    mockScrapingQueueService = {
      addBatchScrapingJobs: vi.fn().mockResolvedValue(['job1', 'job2']),
    } as unknown as TrackerScrapingQueueService;

    mockConfigService = {
      get: vi.fn(),
    } as unknown as ConfigService;

    const module = await Test.createTestingModule({
      providers: [
        TrackerBatchRefreshService,
        {
          provide: TrackerScrapingQueueService,
          useValue: mockScrapingQueueService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<TrackerBatchRefreshService>(
      TrackerBatchRefreshService,
    );
  });

  describe('refreshTrackers', () => {
    it('should_refresh_trackers_when_tracker_ids_provided', async () => {
      const trackerIds = ['tracker-1', 'tracker-2', 'tracker-3'];

      await service.refreshTrackers(trackerIds);

      expect(
        mockScrapingQueueService.addBatchScrapingJobs,
      ).toHaveBeenCalledWith(trackerIds);
    });

    it('should_handle_empty_tracker_ids_array', async () => {
      const trackerIds: string[] = [];

      await service.refreshTrackers(trackerIds);

      expect(
        mockScrapingQueueService.addBatchScrapingJobs,
      ).toHaveBeenCalledWith([]);
    });

    it('should_handle_single_tracker_id', async () => {
      const trackerIds = ['tracker-1'];

      await service.refreshTrackers(trackerIds);

      expect(
        mockScrapingQueueService.addBatchScrapingJobs,
      ).toHaveBeenCalledWith(['tracker-1']);
    });
  });

  describe('refreshTrackersInBatches', () => {
    it('should_refresh_trackers_in_batches_when_multiple_trackers_provided', async () => {
      const trackerIds = ['tracker-1', 'tracker-2', 'tracker-3', 'tracker-4'];
      const batchSize = 2;
      vi.useFakeTimers();

      const promise = service.refreshTrackersInBatches(trackerIds, batchSize);
      await vi.advanceTimersByTimeAsync(2000);
      await promise;

      expect(
        mockScrapingQueueService.addBatchScrapingJobs,
      ).toHaveBeenCalledTimes(2);
      expect(
        mockScrapingQueueService.addBatchScrapingJobs,
      ).toHaveBeenNthCalledWith(1, ['tracker-1', 'tracker-2']);
      expect(
        mockScrapingQueueService.addBatchScrapingJobs,
      ).toHaveBeenNthCalledWith(2, ['tracker-3', 'tracker-4']);

      vi.useRealTimers();
    }, 5000);

    it('should_handle_batch_size_larger_than_tracker_count', async () => {
      const trackerIds = ['tracker-1', 'tracker-2'];
      const batchSize = 10;

      await service.refreshTrackersInBatches(trackerIds, batchSize);

      expect(
        mockScrapingQueueService.addBatchScrapingJobs,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockScrapingQueueService.addBatchScrapingJobs,
      ).toHaveBeenCalledWith(['tracker-1', 'tracker-2']);
    });

    it('should_handle_uneven_batch_division', async () => {
      const trackerIds = ['tracker-1', 'tracker-2', 'tracker-3'];
      const batchSize = 2;
      vi.useFakeTimers();

      const promise = service.refreshTrackersInBatches(trackerIds, batchSize);
      await vi.advanceTimersByTimeAsync(2000);
      await promise;

      expect(
        mockScrapingQueueService.addBatchScrapingJobs,
      ).toHaveBeenCalledTimes(2);
      expect(
        mockScrapingQueueService.addBatchScrapingJobs,
      ).toHaveBeenNthCalledWith(1, ['tracker-1', 'tracker-2']);
      expect(
        mockScrapingQueueService.addBatchScrapingJobs,
      ).toHaveBeenNthCalledWith(2, ['tracker-3']);

      vi.useRealTimers();
    }, 5000);

    it('should_continue_processing_when_batch_fails', async () => {
      const trackerIds = ['tracker-1', 'tracker-2', 'tracker-3'];
      const batchSize = 1;
      vi.useFakeTimers();

      vi.spyOn(mockScrapingQueueService, 'addBatchScrapingJobs')
        .mockRejectedValueOnce(new Error('Batch 1 failed'))
        .mockResolvedValueOnce(['job2'])
        .mockResolvedValueOnce(['job3']);

      const promise = service.refreshTrackersInBatches(trackerIds, batchSize);
      await vi.advanceTimersByTimeAsync(3000);
      await promise;

      expect(
        mockScrapingQueueService.addBatchScrapingJobs,
      ).toHaveBeenCalledTimes(3);

      vi.useRealTimers();
    }, 5000);

    it('should_not_delay_after_last_batch', async () => {
      const trackerIds = ['tracker-1', 'tracker-2'];
      const batchSize = 2;
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

      await service.refreshTrackersInBatches(trackerIds, batchSize);

      expect(setTimeoutSpy).not.toHaveBeenCalled();
    });

    it('should_delay_between_batches_except_last', async () => {
      const trackerIds = ['tracker-1', 'tracker-2', 'tracker-3'];
      const batchSize = 1;
      vi.useFakeTimers();

      const promise = service.refreshTrackersInBatches(trackerIds, batchSize);

      // Advance timers to trigger delays
      await vi.advanceTimersByTimeAsync(2000);

      await promise;

      expect(
        mockScrapingQueueService.addBatchScrapingJobs,
      ).toHaveBeenCalledTimes(3);

      vi.useRealTimers();
    }, 5000);

    it('should_handle_empty_tracker_ids_array', async () => {
      const trackerIds: string[] = [];
      const batchSize = 5;

      await service.refreshTrackersInBatches(trackerIds, batchSize);

      expect(
        mockScrapingQueueService.addBatchScrapingJobs,
      ).not.toHaveBeenCalled();
    });
  });
});
