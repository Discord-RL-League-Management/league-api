/**
 * TrackerSeasonRepository Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TrackerSeasonRepository } from './tracker-season.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { TrackerSeason, Prisma } from '@prisma/client';
import { SeasonData } from '../interfaces/scraper.interfaces';

describe('TrackerSeasonRepository', () => {
  let repository: TrackerSeasonRepository;
  let mockPrisma: PrismaService;
  let mockTx: Prisma.TransactionClient;

  const mockSeasonData: SeasonData = {
    seasonNumber: 1,
    seasonName: 'Season 1',
    playlist1v1: {
      rank: 'Diamond',
      rankValue: 1500,
      division: 'Division 1',
      divisionValue: 1,
      rating: 1500,
      matchesPlayed: 100,
      winStreak: 5,
    },
    playlist2v2: {
      rank: 'Platinum',
      rankValue: 1400,
      division: 'Division 2',
      divisionValue: 2,
      rating: 1400,
      matchesPlayed: 80,
      winStreak: 3,
    },
    playlist3v3: null,
    playlist4v4: null,
  };

  const mockTrackerSeason: TrackerSeason = {
    id: 'season-123',
    trackerId: 'tracker-123',
    seasonNumber: 1,
    seasonName: 'Season 1',
    playlist1v1: mockSeasonData.playlist1v1 as unknown as Prisma.JsonValue,
    playlist2v2: mockSeasonData.playlist2v2 as unknown as Prisma.JsonValue,
    playlist3v3: null,
    playlist4v4: null,
    scrapedAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    mockPrisma = {
      trackerSeason: {
        upsert: vi.fn(),
        findMany: vi.fn(),
        deleteMany: vi.fn(),
        findFirst: vi.fn(),
      },
    } as unknown as PrismaService;

    mockTx = {
      trackerSeason: {
        upsert: vi.fn(),
        findMany: vi.fn(),
        deleteMany: vi.fn(),
        findFirst: vi.fn(),
      },
    } as unknown as Prisma.TransactionClient;

    repository = new TrackerSeasonRepository(mockPrisma);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('upsert', () => {
    it('should_create_season_when_season_does_not_exist_without_transaction', async () => {
      vi.mocked(mockPrisma.trackerSeason.upsert).mockResolvedValue(
        mockTrackerSeason as never,
      );

      const result = await repository.upsert('tracker-123', mockSeasonData);

      expect(result).toEqual(mockTrackerSeason);
      expect(mockPrisma.trackerSeason.upsert).toHaveBeenCalledWith({
        where: {
          trackerId_seasonNumber: {
            trackerId: 'tracker-123',
            seasonNumber: 1,
          },
        },
        update: expect.objectContaining({
          seasonName: 'Season 1',
        }),
        create: expect.objectContaining({
          trackerId: 'tracker-123',
          seasonNumber: 1,
          seasonName: 'Season 1',
        }),
      });
    });

    it('should_update_season_when_season_exists_without_transaction', async () => {
      const updatedSeason = {
        ...mockTrackerSeason,
        seasonName: 'Updated Season 1',
      };
      vi.mocked(mockPrisma.trackerSeason.upsert).mockResolvedValue(
        updatedSeason as never,
      );

      const result = await repository.upsert('tracker-123', {
        ...mockSeasonData,
        seasonName: 'Updated Season 1',
      });

      expect(result).toEqual(updatedSeason);
      expect(result.seasonName).toBe('Updated Season 1');
    });

    it('should_create_season_when_season_does_not_exist_with_transaction', async () => {
      vi.mocked(mockTx.trackerSeason.upsert).mockResolvedValue(
        mockTrackerSeason as never,
      );

      const result = await repository.upsert(
        'tracker-123',
        mockSeasonData,
        mockTx,
      );

      expect(result).toEqual(mockTrackerSeason);
      expect(mockTx.trackerSeason.upsert).toHaveBeenCalled();
    });

    it('should_update_season_when_season_exists_with_transaction', async () => {
      const updatedSeason = {
        ...mockTrackerSeason,
        seasonName: 'Updated Season 1',
      };
      vi.mocked(mockTx.trackerSeason.upsert).mockResolvedValue(
        updatedSeason as never,
      );

      const result = await repository.upsert(
        'tracker-123',
        { ...mockSeasonData, seasonName: 'Updated Season 1' },
        mockTx,
      );

      expect(result).toEqual(updatedSeason);
    });
  });

  describe('findByTrackerId', () => {
    it('should_return_seasons_when_tracker_has_seasons_without_transaction', async () => {
      const seasons = [mockTrackerSeason];
      vi.mocked(mockPrisma.trackerSeason.findMany).mockResolvedValue(
        seasons as never,
      );

      const result = await repository.findByTrackerId('tracker-123');

      expect(result).toEqual(seasons);
      expect(mockPrisma.trackerSeason.findMany).toHaveBeenCalledWith({
        where: { trackerId: 'tracker-123' },
        orderBy: { seasonNumber: 'desc' },
      });
    });

    it('should_return_seasons_when_tracker_has_seasons_with_transaction', async () => {
      const seasons = [mockTrackerSeason];
      vi.mocked(mockTx.trackerSeason.findMany).mockResolvedValue(
        seasons as never,
      );

      const result = await repository.findByTrackerId('tracker-123', mockTx);

      expect(result).toEqual(seasons);
      expect(mockTx.trackerSeason.findMany).toHaveBeenCalledWith({
        where: { trackerId: 'tracker-123' },
        orderBy: { seasonNumber: 'desc' },
      });
    });

    it('should_return_empty_array_when_tracker_has_no_seasons', async () => {
      vi.mocked(mockPrisma.trackerSeason.findMany).mockResolvedValue(
        [] as never,
      );

      const result = await repository.findByTrackerId('tracker-123');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('deleteByTrackerId', () => {
    it('should_delete_seasons_when_tracker_has_seasons_without_transaction', async () => {
      vi.mocked(mockPrisma.trackerSeason.deleteMany).mockResolvedValue({
        count: 3,
      } as never);

      await repository.deleteByTrackerId('tracker-123');

      expect(mockPrisma.trackerSeason.deleteMany).toHaveBeenCalledWith({
        where: { trackerId: 'tracker-123' },
      });
    });

    it('should_delete_seasons_when_tracker_has_seasons_with_transaction', async () => {
      vi.mocked(mockTx.trackerSeason.deleteMany).mockResolvedValue({
        count: 3,
      } as never);

      await repository.deleteByTrackerId('tracker-123', mockTx);

      expect(mockTx.trackerSeason.deleteMany).toHaveBeenCalledWith({
        where: { trackerId: 'tracker-123' },
      });
    });

    it('should_delete_nothing_when_tracker_has_no_seasons', async () => {
      vi.mocked(mockPrisma.trackerSeason.deleteMany).mockResolvedValue({
        count: 0,
      } as never);

      await repository.deleteByTrackerId('tracker-123');

      expect(mockPrisma.trackerSeason.deleteMany).toHaveBeenCalledWith({
        where: { trackerId: 'tracker-123' },
      });
    });
  });

  describe('findLatestByTrackerId', () => {
    it('should_return_latest_season_when_seasons_exist_without_transaction', async () => {
      vi.mocked(mockPrisma.trackerSeason.findFirst).mockResolvedValue(
        mockTrackerSeason as never,
      );

      const result = await repository.findLatestByTrackerId('tracker-123');

      expect(result).toEqual(mockTrackerSeason);
      expect(mockPrisma.trackerSeason.findFirst).toHaveBeenCalledWith({
        where: { trackerId: 'tracker-123' },
        orderBy: { seasonNumber: 'desc' },
      });
    });

    it('should_return_latest_season_when_seasons_exist_with_transaction', async () => {
      vi.mocked(mockTx.trackerSeason.findFirst).mockResolvedValue(
        mockTrackerSeason as never,
      );

      const result = await repository.findLatestByTrackerId(
        'tracker-123',
        mockTx,
      );

      expect(result).toEqual(mockTrackerSeason);
      expect(mockTx.trackerSeason.findFirst).toHaveBeenCalledWith({
        where: { trackerId: 'tracker-123' },
        orderBy: { seasonNumber: 'desc' },
      });
    });

    it('should_return_null_when_no_seasons_exist', async () => {
      vi.mocked(mockPrisma.trackerSeason.findFirst).mockResolvedValue(null);

      const result = await repository.findLatestByTrackerId('tracker-123');

      expect(result).toBeNull();
    });
  });

  describe('bulkUpsert', () => {
    it('should_upsert_multiple_seasons_when_seasons_provided', async () => {
      const seasons: SeasonData[] = [
        mockSeasonData,
        {
          ...mockSeasonData,
          seasonNumber: 2,
          seasonName: 'Season 2',
        },
      ];
      vi.mocked(mockTx.trackerSeason.upsert).mockResolvedValue(
        mockTrackerSeason as never,
      );

      await repository.bulkUpsert('tracker-123', seasons, mockTx);

      expect(mockTx.trackerSeason.upsert).toHaveBeenCalledTimes(2);
    });

    it('should_upsert_single_season_when_one_season_provided', async () => {
      const seasons: SeasonData[] = [mockSeasonData];
      vi.mocked(mockTx.trackerSeason.upsert).mockResolvedValue(
        mockTrackerSeason as never,
      );

      await repository.bulkUpsert('tracker-123', seasons, mockTx);

      expect(mockTx.trackerSeason.upsert).toHaveBeenCalledTimes(1);
    });

    it('should_handle_empty_array_when_no_seasons_provided', async () => {
      await repository.bulkUpsert('tracker-123', [], mockTx);

      expect(mockTx.trackerSeason.upsert).not.toHaveBeenCalled();
    });
  });
});
