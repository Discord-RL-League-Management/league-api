/**
 * TrackerBatchProcessorService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { TrackerBatchProcessorService } from './tracker-batch-processor.service';
import { TrackerRepository } from '../repositories/tracker.repository';
import { TrackerScrapingQueueService } from '../queues/tracker-scraping.queue';
import { TrackerProcessingGuardService } from '../services/tracker-processing-guard.service';

describe('TrackerBatchProcessorService', () => {
  let service: TrackerBatchProcessorService;
  let mockTrackerRepository: TrackerRepository;
  let mockScrapingQueueService: TrackerScrapingQueueService;
  let mockProcessingGuard: TrackerProcessingGuardService;
  let mockConfigService: ConfigService;

  beforeEach(() => {
    mockTrackerRepository = {
      findPendingAndStaleForGuild: vi.fn(),
      findPending: vi.fn(),
    } as unknown as TrackerRepository;

    mockScrapingQueueService = {
      addBatchScrapingJobs: vi.fn().mockResolvedValue(undefined),
    } as unknown as TrackerScrapingQueueService;

    mockProcessingGuard = {
      filterProcessableTrackers: vi.fn(),
    } as unknown as TrackerProcessingGuardService;

    mockConfigService = {
      get: vi.fn(),
    } as unknown as ConfigService;
  });

  afterEach(() => {
    // Cleanup: Restore all mocks to prevent test pollution
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should_initialize_service_when_config_is_valid', () => {
      vi.mocked(mockConfigService.get).mockReturnValue({
        refreshIntervalHours: 24,
      });

      service = new TrackerBatchProcessorService(
        mockTrackerRepository,
        mockScrapingQueueService,
        mockProcessingGuard,
        mockConfigService,
      );

      expect(service).toBeInstanceOf(TrackerBatchProcessorService);
      expect(mockConfigService.get).toHaveBeenCalledWith('tracker');
    });

    it('should_throw_error_when_tracker_config_is_missing', () => {
      vi.mocked(mockConfigService.get).mockReturnValue(null);

      expect(() => {
        new TrackerBatchProcessorService(
          mockTrackerRepository,
          mockScrapingQueueService,
          mockProcessingGuard,
          mockConfigService,
        );
      }).toThrow('Tracker configuration is missing');
    });

    it('should_use_default_value_when_refreshIntervalHours_is_undefined', () => {
      vi.mocked(mockConfigService.get).mockReturnValue({
        refreshIntervalHours: undefined,
      });

      service = new TrackerBatchProcessorService(
        mockTrackerRepository,
        mockScrapingQueueService,
        mockProcessingGuard,
        mockConfigService,
      );

      expect(service).toBeInstanceOf(TrackerBatchProcessorService);
    });

    it('should_use_custom_refreshIntervalHours_when_config_provides_value', () => {
      vi.mocked(mockConfigService.get).mockReturnValue({
        refreshIntervalHours: 48,
      });

      service = new TrackerBatchProcessorService(
        mockTrackerRepository,
        mockScrapingQueueService,
        mockProcessingGuard,
        mockConfigService,
      );

      expect(service).toBeInstanceOf(TrackerBatchProcessorService);
    });
  });

  describe('processPendingTrackers', () => {
    beforeEach(() => {
      // Setup valid config for all processPendingTrackers tests
      vi.mocked(mockConfigService.get).mockReturnValue({
        refreshIntervalHours: 24,
      });
      service = new TrackerBatchProcessorService(
        mockTrackerRepository,
        mockScrapingQueueService,
        mockProcessingGuard,
        mockConfigService,
      );
    });

    it('should_return_zero_when_no_pending_trackers_exist', async () => {
      vi.mocked(mockTrackerRepository.findPending).mockResolvedValue([]);

      const result = await service.processPendingTrackers();

      expect(result.processed).toBe(0);
      expect(result.trackers).toEqual([]);
      expect(
        mockScrapingQueueService.addBatchScrapingJobs,
      ).not.toHaveBeenCalled();
    });

    it('should_process_all_trackers_when_all_are_processable', async () => {
      const mockTrackers = [
        { id: 'tracker_1' },
        { id: 'tracker_2' },
        { id: 'tracker_3' },
      ];
      vi.mocked(mockTrackerRepository.findPending).mockResolvedValue(
        mockTrackers as unknown as any[],
      );
      vi.mocked(
        mockProcessingGuard.filterProcessableTrackers,
      ).mockResolvedValue(['tracker_1', 'tracker_2', 'tracker_3']);

      const result = await service.processPendingTrackers();

      expect(result.processed).toBe(3);
      expect(result.trackers).toEqual(['tracker_1', 'tracker_2', 'tracker_3']);
      expect(
        mockScrapingQueueService.addBatchScrapingJobs,
      ).toHaveBeenCalledWith(['tracker_1', 'tracker_2', 'tracker_3']);
    });

    it('should_filter_trackers_when_some_are_not_processable', async () => {
      const mockTrackers = [
        { id: 'tracker_1' },
        { id: 'tracker_2' },
        { id: 'tracker_3' },
      ];
      vi.mocked(mockTrackerRepository.findPending).mockResolvedValue(
        mockTrackers as unknown as any[],
      );
      vi.mocked(
        mockProcessingGuard.filterProcessableTrackers,
      ).mockResolvedValue(['tracker_1', 'tracker_3']);

      const result = await service.processPendingTrackers();

      expect(result.processed).toBe(2);
      expect(result.trackers).toEqual(['tracker_1', 'tracker_3']);
      expect(
        mockScrapingQueueService.addBatchScrapingJobs,
      ).toHaveBeenCalledWith(['tracker_1', 'tracker_3']);
    });

    it('should_return_zero_when_no_trackers_are_processable', async () => {
      const mockTrackers = [{ id: 'tracker_1' }, { id: 'tracker_2' }];
      vi.mocked(mockTrackerRepository.findPending).mockResolvedValue(
        mockTrackers as unknown as any[],
      );
      vi.mocked(
        mockProcessingGuard.filterProcessableTrackers,
      ).mockResolvedValue([]);

      const result = await service.processPendingTrackers();

      expect(result.processed).toBe(0);
      expect(result.trackers).toEqual([]);
      expect(
        mockScrapingQueueService.addBatchScrapingJobs,
      ).not.toHaveBeenCalled();
    });

    it('should_throw_error_when_finding_pending_trackers_fails', async () => {
      vi.mocked(mockTrackerRepository.findPending).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.processPendingTrackers()).rejects.toThrow(
        'Database error',
      );
    });

    it('should_throw_error_when_filtering_processable_trackers_fails', async () => {
      const mockTrackers = [{ id: 'tracker_1' }];
      vi.mocked(mockTrackerRepository.findPending).mockResolvedValue(
        mockTrackers as unknown as any[],
      );
      vi.mocked(
        mockProcessingGuard.filterProcessableTrackers,
      ).mockRejectedValue(new Error('Guard check failed'));

      await expect(service.processPendingTrackers()).rejects.toThrow(
        'Guard check failed',
      );
    });

    it('should_throw_error_when_enqueueing_batch_jobs_fails', async () => {
      const mockTrackers = [{ id: 'tracker_1' }];
      vi.mocked(mockTrackerRepository.findPending).mockResolvedValue(
        mockTrackers as unknown as any[],
      );
      vi.mocked(
        mockProcessingGuard.filterProcessableTrackers,
      ).mockResolvedValue(['tracker_1']);
      vi.mocked(
        mockScrapingQueueService.addBatchScrapingJobs,
      ).mockRejectedValue(new Error('Queue error'));

      await expect(service.processPendingTrackers()).rejects.toThrow(
        'Queue error',
      );
    });
  });

  describe('processPendingTrackersForGuild', () => {
    beforeEach(() => {
      // Setup valid config for all processPendingTrackersForGuild tests
      vi.mocked(mockConfigService.get).mockReturnValue({
        refreshIntervalHours: 24,
      });
      service = new TrackerBatchProcessorService(
        mockTrackerRepository,
        mockScrapingQueueService,
        mockProcessingGuard,
        mockConfigService,
      );
    });

    it('should_return_zero_when_no_trackers_exist_for_guild', async () => {
      const guildId = 'guild_123';
      vi.mocked(
        mockTrackerRepository.findPendingAndStaleForGuild,
      ).mockResolvedValue([]);

      const result = await service.processPendingTrackersForGuild(guildId);

      expect(result.processed).toBe(0);
      expect(result.trackers).toEqual([]);
      expect(
        mockScrapingQueueService.addBatchScrapingJobs,
      ).not.toHaveBeenCalled();
      expect(
        mockTrackerRepository.findPendingAndStaleForGuild,
      ).toHaveBeenCalledWith(guildId, 24);
    });

    it('should_process_pending_trackers_when_guild_has_pending_trackers', async () => {
      const guildId = 'guild_123';
      const mockTrackers = [{ id: 'tracker_1' }, { id: 'tracker_2' }];
      vi.mocked(
        mockTrackerRepository.findPendingAndStaleForGuild,
      ).mockResolvedValue(mockTrackers);

      const result = await service.processPendingTrackersForGuild(guildId);

      expect(result.processed).toBe(2);
      expect(result.trackers).toEqual(['tracker_1', 'tracker_2']);
      expect(
        mockScrapingQueueService.addBatchScrapingJobs,
      ).toHaveBeenCalledWith(['tracker_1', 'tracker_2']);
      expect(
        mockTrackerRepository.findPendingAndStaleForGuild,
      ).toHaveBeenCalledWith(guildId, 24);
    });

    it('should_process_stale_trackers_when_lastScrapedAt_is_null', async () => {
      const guildId = 'guild_123';
      const mockTrackers = [{ id: 'tracker_stale_null' }];
      vi.mocked(
        mockTrackerRepository.findPendingAndStaleForGuild,
      ).mockResolvedValue(mockTrackers);

      const result = await service.processPendingTrackersForGuild(guildId);

      expect(result.processed).toBe(1);
      expect(result.trackers).toEqual(['tracker_stale_null']);
      expect(
        mockScrapingQueueService.addBatchScrapingJobs,
      ).toHaveBeenCalledWith(['tracker_stale_null']);
      expect(
        mockTrackerRepository.findPendingAndStaleForGuild,
      ).toHaveBeenCalledWith(guildId, 24);
    });

    it('should_process_stale_trackers_when_lastScrapedAt_is_older_than_refresh_interval', async () => {
      const guildId = 'guild_123';
      const mockTrackers = [{ id: 'tracker_stale_old' }];
      vi.mocked(
        mockTrackerRepository.findPendingAndStaleForGuild,
      ).mockResolvedValue(mockTrackers);

      const result = await service.processPendingTrackersForGuild(guildId);

      expect(result.processed).toBe(1);
      expect(result.trackers).toEqual(['tracker_stale_old']);
      expect(
        mockScrapingQueueService.addBatchScrapingJobs,
      ).toHaveBeenCalledWith(['tracker_stale_old']);
      expect(
        mockTrackerRepository.findPendingAndStaleForGuild,
      ).toHaveBeenCalledWith(guildId, 24);
    });

    it('should_exclude_in_progress_trackers_when_processing_guild_trackers', async () => {
      const guildId = 'guild_123';
      const mockTrackers = [{ id: 'tracker_pending' }];
      vi.mocked(
        mockTrackerRepository.findPendingAndStaleForGuild,
      ).mockResolvedValue(mockTrackers);

      const result = await service.processPendingTrackersForGuild(guildId);

      expect(result.processed).toBe(1);
      expect(
        mockTrackerRepository.findPendingAndStaleForGuild,
      ).toHaveBeenCalledWith(guildId, 24);
    });

    it('should_process_mixed_pending_and_stale_trackers_when_both_exist', async () => {
      const guildId = 'guild_123';
      const mockTrackers = [{ id: 'tracker_pending' }, { id: 'tracker_stale' }];
      vi.mocked(
        mockTrackerRepository.findPendingAndStaleForGuild,
      ).mockResolvedValue(mockTrackers);

      const result = await service.processPendingTrackersForGuild(guildId);

      expect(result.processed).toBe(2);
      expect(result.trackers).toEqual(['tracker_pending', 'tracker_stale']);
      expect(
        mockScrapingQueueService.addBatchScrapingJobs,
      ).toHaveBeenCalledWith(['tracker_pending', 'tracker_stale']);
      expect(
        mockTrackerRepository.findPendingAndStaleForGuild,
      ).toHaveBeenCalledWith(guildId, 24);
    });

    it('should_use_refreshIntervalHours_for_cutoff_calculation', async () => {
      const guildId = 'guild_123';
      vi.mocked(mockConfigService.get).mockReturnValue({
        refreshIntervalHours: 48,
      });
      service = new TrackerBatchProcessorService(
        mockTrackerRepository,
        mockScrapingQueueService,
        mockProcessingGuard,
        mockConfigService,
      );
      vi.mocked(
        mockTrackerRepository.findPendingAndStaleForGuild,
      ).mockResolvedValue([]);

      await service.processPendingTrackersForGuild(guildId);

      expect(
        mockTrackerRepository.findPendingAndStaleForGuild,
      ).toHaveBeenCalledWith(guildId, 48);
    });

    it('should_filter_by_guild_id_when_processing_trackers', async () => {
      const guildId = 'guild_123';
      vi.mocked(
        mockTrackerRepository.findPendingAndStaleForGuild,
      ).mockResolvedValue([]);

      await service.processPendingTrackersForGuild(guildId);

      expect(
        mockTrackerRepository.findPendingAndStaleForGuild,
      ).toHaveBeenCalledWith(guildId, 24);
    });

    it('should_throw_error_when_finding_guild_trackers_fails', async () => {
      const guildId = 'guild_123';
      vi.mocked(
        mockTrackerRepository.findPendingAndStaleForGuild,
      ).mockRejectedValue(new Error('Database error'));

      await expect(
        service.processPendingTrackersForGuild(guildId),
      ).rejects.toThrow('Database error');
    });

    it('should_throw_error_when_enqueueing_guild_trackers_fails', async () => {
      const guildId = 'guild_123';
      const mockTrackers = [{ id: 'tracker_1' }];
      vi.mocked(
        mockTrackerRepository.findPendingAndStaleForGuild,
      ).mockResolvedValue(mockTrackers);
      vi.mocked(
        mockScrapingQueueService.addBatchScrapingJobs,
      ).mockRejectedValue(new Error('Queue error'));

      await expect(
        service.processPendingTrackersForGuild(guildId),
      ).rejects.toThrow('Queue error');
    });
  });
});
