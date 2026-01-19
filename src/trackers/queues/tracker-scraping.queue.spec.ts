/**
 * TrackerScrapingQueueService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TrackerScrapingQueueService } from './tracker-scraping.queue';
import { TRACKER_SCRAPING_QUEUE } from './tracker-scraping.queue';
import type { ScrapingJobData } from './tracker-scraping.interfaces';

describe('TrackerScrapingQueueService', () => {
  let service: TrackerScrapingQueueService;
  let mockQueue: Queue<ScrapingJobData>;

  beforeEach(async () => {
    mockQueue = {
      add: vi.fn(),
    } as unknown as Queue<ScrapingJobData>;

    const module = await Test.createTestingModule({
      providers: [
        TrackerScrapingQueueService,
        {
          provide: getQueueToken(TRACKER_SCRAPING_QUEUE),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<TrackerScrapingQueueService>(
      TrackerScrapingQueueService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('addScrapingJob', () => {
    it('should_enqueue_job_with_default_priority_when_priority_not_provided', async () => {
      const trackerId = 'tracker_123';
      const mockJob = { id: 'job_123' };
      vi.mocked(mockQueue.add).mockResolvedValue(mockJob as never);

      const result = await service.addScrapingJob(trackerId);

      expect(result).toBe('job_123');
      expect(mockQueue.add).toHaveBeenCalledWith(
        'scrape-tracker',
        { trackerId },
        {
          jobId: expect.stringMatching(/^scraping-tracker_123-\d+$/),
          priority: 0,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      );
    });

    it('should_enqueue_job_with_custom_priority_when_priority_provided', async () => {
      const trackerId = 'tracker_456';
      const priority = 10;
      const mockJob = { id: 'job_456' };
      vi.mocked(mockQueue.add).mockResolvedValue(mockJob as never);

      const result = await service.addScrapingJob(trackerId, priority);

      expect(result).toBe('job_456');
      expect(mockQueue.add).toHaveBeenCalledWith(
        'scrape-tracker',
        { trackerId },
        expect.objectContaining({
          priority: 10,
        }),
      );
    });

    it('should_generate_unique_job_id_with_timestamp', async () => {
      const trackerId = 'tracker_789';
      const mockJob = { id: 'job_789' };
      vi.mocked(mockQueue.add).mockResolvedValue(mockJob as never);

      await service.addScrapingJob(trackerId);

      const callArgs = vi.mocked(mockQueue.add).mock.calls[0];
      const jobId = callArgs?.[2]?.jobId as string;
      expect(jobId).toMatch(/^scraping-tracker_789-\d+$/);
    });
  });

  describe('addBatchScrapingJobs', () => {
    it('should_return_empty_array_when_tracker_ids_array_is_empty', async () => {
      const trackerIds: string[] = [];

      const result = await service.addBatchScrapingJobs(trackerIds);

      expect(result).toEqual([]);
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('should_enqueue_single_job_when_array_has_one_tracker_id', async () => {
      const trackerIds = ['tracker_1'];
      const mockJob = { id: 'job_1' };
      vi.mocked(mockQueue.add).mockResolvedValue(mockJob as never);

      const result = await service.addBatchScrapingJobs(trackerIds);

      expect(result).toEqual(['job_1']);
      expect(mockQueue.add).toHaveBeenCalledTimes(1);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'scrape-tracker',
        { trackerId: 'tracker_1' },
        expect.any(Object),
      );
    });

    it('should_enqueue_all_jobs_when_array_has_multiple_tracker_ids', async () => {
      const trackerIds = ['tracker_1', 'tracker_2', 'tracker_3'];
      const mockJobs = [{ id: 'job_1' }, { id: 'job_2' }, { id: 'job_3' }];
      vi.mocked(mockQueue.add)
        .mockResolvedValueOnce(mockJobs[0] as never)
        .mockResolvedValueOnce(mockJobs[1] as never)
        .mockResolvedValueOnce(mockJobs[2] as never);

      const result = await service.addBatchScrapingJobs(trackerIds);

      expect(result).toEqual(['job_1', 'job_2', 'job_3']);
      expect(mockQueue.add).toHaveBeenCalledTimes(3);
      expect(mockQueue.add).toHaveBeenNthCalledWith(
        1,
        'scrape-tracker',
        { trackerId: 'tracker_1' },
        expect.any(Object),
      );
      expect(mockQueue.add).toHaveBeenNthCalledWith(
        2,
        'scrape-tracker',
        { trackerId: 'tracker_2' },
        expect.any(Object),
      );
      expect(mockQueue.add).toHaveBeenNthCalledWith(
        3,
        'scrape-tracker',
        { trackerId: 'tracker_3' },
        expect.any(Object),
      );
    });

    it('should_propagate_error_when_job_enqueue_fails', async () => {
      const trackerIds = ['tracker_1', 'tracker_2'];
      const error = new Error('Queue error');
      vi.mocked(mockQueue.add).mockRejectedValueOnce(error);

      await expect(service.addBatchScrapingJobs(trackerIds)).rejects.toThrow(
        'Queue error',
      );
    });

    it('should_handle_partial_failures_when_some_jobs_fail', async () => {
      const trackerIds = ['tracker_1', 'tracker_2', 'tracker_3'];
      const error = new Error('Queue error');
      vi.mocked(mockQueue.add)
        .mockResolvedValueOnce({ id: 'job_1' } as never)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ id: 'job_3' } as never);

      await expect(service.addBatchScrapingJobs(trackerIds)).rejects.toThrow(
        'Queue error',
      );
    });
  });

  describe('getQueue', () => {
    it('should_return_queue_instance_when_called', () => {
      const result = service.getQueue();

      expect(result).toBe(mockQueue);
    });
  });
});
