/**
 * TrackerQueueOrchestratorService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TrackerQueueOrchestratorService } from './tracker-queue-orchestrator.service';
import { TrackerRepository } from '../repositories/tracker.repository';
import { TrackerScrapingQueueService } from '../queues/tracker-scraping.queue';
import { TrackerProcessingGuardService } from './tracker-processing-guard.service';
import { TrackerScrapingStatus } from '@prisma/client';

describe('TrackerQueueOrchestratorService', () => {
  let service: TrackerQueueOrchestratorService;
  let mockRepository: TrackerRepository;
  let mockQueueService: TrackerScrapingQueueService;
  let mockProcessingGuard: TrackerProcessingGuardService;

  beforeEach(() => {
    mockRepository = {
      update: vi.fn(),
    } as unknown as TrackerRepository;

    mockQueueService = {
      addScrapingJob: vi.fn(),
      addBatchScrapingJobs: vi.fn(),
    } as unknown as TrackerScrapingQueueService;

    mockProcessingGuard = {
      canProcessTracker: vi.fn(),
      filterProcessableTrackers: vi.fn(),
    } as unknown as TrackerProcessingGuardService;

    service = new TrackerQueueOrchestratorService(
      mockRepository,
      mockQueueService,
      mockProcessingGuard,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('enqueueTrackerWithGuard', () => {
    it('should_enqueue_tracker_when_processing_is_allowed', async () => {
      const trackerId = 'tracker_123';
      const jobId = 'job_123';

      vi.mocked(mockProcessingGuard.canProcessTracker).mockResolvedValue(true);
      vi.mocked(mockQueueService.addScrapingJob).mockResolvedValue(jobId);

      await service.enqueueTrackerWithGuard(trackerId);

      expect(mockProcessingGuard.canProcessTracker).toHaveBeenCalledWith(
        trackerId,
      );
      expect(mockQueueService.addScrapingJob).toHaveBeenCalledWith(trackerId);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should_update_tracker_to_failed_when_processing_is_disabled', async () => {
      const trackerId = 'tracker_123';

      vi.mocked(mockProcessingGuard.canProcessTracker).mockResolvedValue(false);
      vi.mocked(mockRepository.update).mockResolvedValue({} as any);

      await service.enqueueTrackerWithGuard(trackerId);

      expect(mockProcessingGuard.canProcessTracker).toHaveBeenCalledWith(
        trackerId,
      );
      expect(mockRepository.update).toHaveBeenCalledWith(trackerId, {
        scrapingStatus: TrackerScrapingStatus.FAILED,
        scrapingError: 'Tracker processing disabled by guild settings',
        scrapingAttempts: 1,
      });
      expect(mockQueueService.addScrapingJob).not.toHaveBeenCalled();
    });

    it('should_handle_update_error_when_processing_is_disabled', async () => {
      const trackerId = 'tracker_123';
      const updateError = new Error('Update failed');

      vi.mocked(mockProcessingGuard.canProcessTracker).mockResolvedValue(false);
      vi.mocked(mockRepository.update).mockRejectedValue(updateError);

      await service.enqueueTrackerWithGuard(trackerId);

      expect(mockProcessingGuard.canProcessTracker).toHaveBeenCalledWith(
        trackerId,
      );
      expect(mockRepository.update).toHaveBeenCalledWith(trackerId, {
        scrapingStatus: TrackerScrapingStatus.FAILED,
        scrapingError: 'Tracker processing disabled by guild settings',
        scrapingAttempts: 1,
      });
      expect(mockQueueService.addScrapingJob).not.toHaveBeenCalled();
    });

    it('should_handle_enqueue_error_and_update_tracker_status', async () => {
      const trackerId = 'tracker_123';
      const enqueueError = new Error('Enqueue failed');

      vi.mocked(mockProcessingGuard.canProcessTracker).mockResolvedValue(true);
      vi.mocked(mockQueueService.addScrapingJob).mockRejectedValue(
        enqueueError,
      );
      vi.mocked(mockRepository.update).mockResolvedValue({} as any);

      await service.enqueueTrackerWithGuard(trackerId);

      expect(mockProcessingGuard.canProcessTracker).toHaveBeenCalledWith(
        trackerId,
      );
      expect(mockQueueService.addScrapingJob).toHaveBeenCalledWith(trackerId);
      // Wait a bit for the fire-and-forget error handling
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(mockRepository.update).toHaveBeenCalledWith(trackerId, {
        scrapingStatus: TrackerScrapingStatus.FAILED,
        scrapingError: 'Failed to enqueue scraping job: Enqueue failed',
        scrapingAttempts: 1,
      });
    });

    it('should_handle_update_error_after_enqueue_failure', async () => {
      const trackerId = 'tracker_123';
      const enqueueError = new Error('Enqueue failed');
      const updateError = new Error('Update failed');

      vi.mocked(mockProcessingGuard.canProcessTracker).mockResolvedValue(true);
      vi.mocked(mockQueueService.addScrapingJob).mockRejectedValue(
        enqueueError,
      );
      vi.mocked(mockRepository.update).mockRejectedValue(updateError);

      await service.enqueueTrackerWithGuard(trackerId);

      expect(mockProcessingGuard.canProcessTracker).toHaveBeenCalledWith(
        trackerId,
      );
      expect(mockQueueService.addScrapingJob).toHaveBeenCalledWith(trackerId);
      // Wait a bit for the fire-and-forget error handling
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(mockRepository.update).toHaveBeenCalledWith(trackerId, {
        scrapingStatus: TrackerScrapingStatus.FAILED,
        scrapingError: 'Failed to enqueue scraping job: Enqueue failed',
        scrapingAttempts: 1,
      });
    });
  });

  describe('enqueueTrackersWithGuard', () => {
    it('should_return_early_when_tracker_ids_array_is_empty', async () => {
      await service.enqueueTrackersWithGuard([]);

      expect(
        mockProcessingGuard.filterProcessableTrackers,
      ).not.toHaveBeenCalled();
      expect(mockQueueService.addBatchScrapingJobs).not.toHaveBeenCalled();
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should_enqueue_all_trackers_when_all_are_processable', async () => {
      const trackerIds = ['tracker_1', 'tracker_2', 'tracker_3'];

      vi.mocked(
        mockProcessingGuard.filterProcessableTrackers,
      ).mockResolvedValue(trackerIds);
      vi.mocked(mockQueueService.addBatchScrapingJobs).mockResolvedValue([]);

      await service.enqueueTrackersWithGuard(trackerIds);

      expect(
        mockProcessingGuard.filterProcessableTrackers,
      ).toHaveBeenCalledWith(trackerIds);
      expect(mockQueueService.addBatchScrapingJobs).toHaveBeenCalledWith(
        trackerIds,
      );
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should_update_all_trackers_to_failed_when_none_are_processable', async () => {
      const trackerIds = ['tracker_1', 'tracker_2', 'tracker_3'];

      vi.mocked(
        mockProcessingGuard.filterProcessableTrackers,
      ).mockResolvedValue([]);
      vi.mocked(mockRepository.update).mockResolvedValue({} as any);

      await service.enqueueTrackersWithGuard(trackerIds);

      expect(
        mockProcessingGuard.filterProcessableTrackers,
      ).toHaveBeenCalledWith(trackerIds);
      expect(mockRepository.update).toHaveBeenCalledTimes(3);
      expect(mockRepository.update).toHaveBeenCalledWith('tracker_1', {
        scrapingStatus: TrackerScrapingStatus.FAILED,
        scrapingError: 'Tracker processing disabled by guild settings',
        scrapingAttempts: 1,
      });
      expect(mockRepository.update).toHaveBeenCalledWith('tracker_2', {
        scrapingStatus: TrackerScrapingStatus.FAILED,
        scrapingError: 'Tracker processing disabled by guild settings',
        scrapingAttempts: 1,
      });
      expect(mockRepository.update).toHaveBeenCalledWith('tracker_3', {
        scrapingStatus: TrackerScrapingStatus.FAILED,
        scrapingError: 'Tracker processing disabled by guild settings',
        scrapingAttempts: 1,
      });
      expect(mockQueueService.addBatchScrapingJobs).not.toHaveBeenCalled();
    });

    it('should_handle_mixed_processable_and_non_processable_trackers', async () => {
      const trackerIds = ['tracker_1', 'tracker_2', 'tracker_3', 'tracker_4'];
      const processableIds = ['tracker_1', 'tracker_3'];

      vi.mocked(
        mockProcessingGuard.filterProcessableTrackers,
      ).mockResolvedValue(processableIds);
      vi.mocked(mockRepository.update).mockResolvedValue({} as any);
      vi.mocked(mockQueueService.addBatchScrapingJobs).mockResolvedValue([]);

      await service.enqueueTrackersWithGuard(trackerIds);

      expect(
        mockProcessingGuard.filterProcessableTrackers,
      ).toHaveBeenCalledWith(trackerIds);
      expect(mockRepository.update).toHaveBeenCalledTimes(2);
      expect(mockRepository.update).toHaveBeenCalledWith('tracker_2', {
        scrapingStatus: TrackerScrapingStatus.FAILED,
        scrapingError: 'Tracker processing disabled by guild settings',
        scrapingAttempts: 1,
      });
      expect(mockRepository.update).toHaveBeenCalledWith('tracker_4', {
        scrapingStatus: TrackerScrapingStatus.FAILED,
        scrapingError: 'Tracker processing disabled by guild settings',
        scrapingAttempts: 1,
      });
      expect(mockQueueService.addBatchScrapingJobs).toHaveBeenCalledWith(
        processableIds,
      );
    });

    it('should_handle_update_errors_for_non_processable_trackers', async () => {
      const trackerIds = ['tracker_1', 'tracker_2'];
      const updateError = new Error('Update failed');

      vi.mocked(
        mockProcessingGuard.filterProcessableTrackers,
      ).mockResolvedValue([]);
      vi.mocked(mockRepository.update)
        .mockRejectedValueOnce(updateError)
        .mockResolvedValueOnce({} as any);

      await service.enqueueTrackersWithGuard(trackerIds);

      expect(
        mockProcessingGuard.filterProcessableTrackers,
      ).toHaveBeenCalledWith(trackerIds);
      expect(mockRepository.update).toHaveBeenCalledTimes(2);
      expect(mockQueueService.addBatchScrapingJobs).not.toHaveBeenCalled();
    });
  });
});
