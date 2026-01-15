/**
 * TrackerSeasonService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TrackerSeasonService } from './tracker-season.service';
import { TrackerSeasonRepository } from '../repositories/tracker-season.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { TrackerSeason } from '@prisma/client';
import { SeasonData } from '../interfaces/scraper.interfaces';

describe('TrackerSeasonService', () => {
  let service: TrackerSeasonService;
  let mockSeasonRepository: TrackerSeasonRepository;
  let mockPrisma: PrismaService;

  const mockSeason: TrackerSeason = {
    id: 'season_123',
    trackerId: 'tracker_123',
    seasonNumber: 1,
    seasonName: 'Season 1',
    playlist1v1: null,
    playlist2v2: null,
    playlist3v3: null,
    playlist4v4: null,
    scrapedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSeasonData: SeasonData = {
    seasonNumber: 1,
    seasonName: 'Season 1',
    playlist1v1: {
      rank: 'Diamond',
      rankValue: 3,
      division: 'III',
      divisionValue: 3,
      rating: 1200,
      matchesPlayed: 100,
      winStreak: 5,
    },
    playlist2v2: null,
    playlist3v3: null,
    playlist4v4: null,
  };

  beforeEach(() => {
    mockSeasonRepository = {
      upsert: vi.fn(),
      findByTrackerId: vi.fn(),
      deleteByTrackerId: vi.fn(),
      findLatestByTrackerId: vi.fn(),
      bulkUpsert: vi.fn(),
    } as unknown as TrackerSeasonRepository;

    mockPrisma = {
      $transaction: vi.fn(),
    } as unknown as PrismaService;

    service = new TrackerSeasonService(mockSeasonRepository, mockPrisma);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createOrUpdateSeason', () => {
    it('should_create_season_when_season_does_not_exist', async () => {
      const trackerId = 'tracker_123';

      vi.mocked(mockSeasonRepository.upsert).mockResolvedValue(mockSeason);

      const result = await service.createOrUpdateSeason(
        trackerId,
        mockSeasonData,
      );

      expect(result).toEqual(mockSeason);
      expect(mockSeasonRepository.upsert).toHaveBeenCalledWith(
        trackerId,
        mockSeasonData,
      );
    });

    it('should_update_season_when_season_already_exists', async () => {
      const trackerId = 'tracker_123';
      const updatedSeason = {
        ...mockSeason,
        seasonName: 'Updated Season 1',
      };

      vi.mocked(mockSeasonRepository.upsert).mockResolvedValue(updatedSeason);

      const result = await service.createOrUpdateSeason(trackerId, {
        ...mockSeasonData,
        seasonName: 'Updated Season 1',
      });

      expect(result).toEqual(updatedSeason);
      expect(mockSeasonRepository.upsert).toHaveBeenCalledWith(
        trackerId,
        expect.objectContaining({
          seasonName: 'Updated Season 1',
        }),
      );
    });

    it('should_throw_error_when_upsert_fails', async () => {
      const trackerId = 'tracker_123';
      const error = new Error('Database error');

      vi.mocked(mockSeasonRepository.upsert).mockRejectedValue(error);

      await expect(
        service.createOrUpdateSeason(trackerId, mockSeasonData),
      ).rejects.toThrow('Database error');
      expect(mockSeasonRepository.upsert).toHaveBeenCalledWith(
        trackerId,
        mockSeasonData,
      );
    });
  });

  describe('getSeasonsByTracker', () => {
    it('should_return_all_seasons_for_tracker', async () => {
      const trackerId = 'tracker_123';
      const seasons = [mockSeason];

      vi.mocked(mockSeasonRepository.findByTrackerId).mockResolvedValue(
        seasons,
      );

      const result = await service.getSeasonsByTracker(trackerId);

      expect(result).toEqual(seasons);
      expect(mockSeasonRepository.findByTrackerId).toHaveBeenCalledWith(
        trackerId,
      );
    });

    it('should_return_empty_array_when_no_seasons_exist', async () => {
      const trackerId = 'tracker_123';

      vi.mocked(mockSeasonRepository.findByTrackerId).mockResolvedValue([]);

      const result = await service.getSeasonsByTracker(trackerId);

      expect(result).toEqual([]);
      expect(mockSeasonRepository.findByTrackerId).toHaveBeenCalledWith(
        trackerId,
      );
    });
  });

  describe('deleteSeasonsByTracker', () => {
    it('should_delete_all_seasons_for_tracker', async () => {
      const trackerId = 'tracker_123';

      vi.mocked(mockSeasonRepository.deleteByTrackerId).mockResolvedValue();

      await service.deleteSeasonsByTracker(trackerId);

      expect(mockSeasonRepository.deleteByTrackerId).toHaveBeenCalledWith(
        trackerId,
      );
    });
  });

  describe('getLatestSeason', () => {
    it('should_return_latest_season_when_seasons_exist', async () => {
      const trackerId = 'tracker_123';

      vi.mocked(mockSeasonRepository.findLatestByTrackerId).mockResolvedValue(
        mockSeason,
      );

      const result = await service.getLatestSeason(trackerId);

      expect(result).toEqual(mockSeason);
      expect(mockSeasonRepository.findLatestByTrackerId).toHaveBeenCalledWith(
        trackerId,
      );
    });

    it('should_return_null_when_no_seasons_exist', async () => {
      const trackerId = 'tracker_123';

      vi.mocked(mockSeasonRepository.findLatestByTrackerId).mockResolvedValue(
        null,
      );

      const result = await service.getLatestSeason(trackerId);

      expect(result).toBeNull();
      expect(mockSeasonRepository.findLatestByTrackerId).toHaveBeenCalledWith(
        trackerId,
      );
    });
  });

  describe('bulkUpsertSeasons', () => {
    it('should_bulk_upsert_seasons_in_transaction', async () => {
      const trackerId = 'tracker_123';
      const seasons: SeasonData[] = [
        { ...mockSeasonData, seasonNumber: 1 },
        { ...mockSeasonData, seasonNumber: 2 },
        { ...mockSeasonData, seasonNumber: 3 },
      ];

      const mockTransaction = vi.fn();
      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback: any) => {
          return callback(mockTransaction);
        },
      );
      vi.mocked(mockSeasonRepository.bulkUpsert).mockResolvedValue();

      const result = await service.bulkUpsertSeasons(trackerId, seasons);

      expect(result).toBe(3);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockSeasonRepository.bulkUpsert).toHaveBeenCalledWith(
        trackerId,
        seasons,
        mockTransaction,
      );
    });

    it('should_throw_error_when_transaction_fails', async () => {
      const trackerId = 'tracker_123';
      const seasons: SeasonData[] = [mockSeasonData];
      const error = new Error('Transaction failed');

      vi.mocked(mockPrisma.$transaction).mockRejectedValue(error);

      await expect(
        service.bulkUpsertSeasons(trackerId, seasons),
      ).rejects.toThrow('Transaction failed');
    });

    it('should_throw_error_when_bulk_upsert_fails', async () => {
      const trackerId = 'tracker_123';
      const seasons: SeasonData[] = [mockSeasonData];
      const error = new Error('Bulk upsert failed');

      const mockTransaction = vi.fn();
      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback: any) => {
          return callback(mockTransaction);
        },
      );
      vi.mocked(mockSeasonRepository.bulkUpsert).mockRejectedValue(error);

      await expect(
        service.bulkUpsertSeasons(trackerId, seasons),
      ).rejects.toThrow('Bulk upsert failed');
    });

    it('should_return_zero_when_seasons_array_is_empty', async () => {
      const trackerId = 'tracker_123';
      const seasons: SeasonData[] = [];

      const mockTransaction = vi.fn();
      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback: any) => {
          return callback(mockTransaction);
        },
      );
      vi.mocked(mockSeasonRepository.bulkUpsert).mockResolvedValue();

      const result = await service.bulkUpsertSeasons(trackerId, seasons);

      expect(result).toBe(0);
      expect(mockSeasonRepository.bulkUpsert).toHaveBeenCalledWith(
        trackerId,
        seasons,
        mockTransaction,
      );
    });
  });
});
