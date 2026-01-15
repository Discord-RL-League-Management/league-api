/**
 * TrackerDataExtractionService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { TrackerDataExtractionService } from './tracker-data-extraction.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { TrackerSeason } from '@prisma/client';
import type { PlaylistData } from '../../trackers/interfaces/scraper.interfaces';

describe('TrackerDataExtractionService', () => {
  let service: TrackerDataExtractionService;
  let mockPrisma: PrismaService;

  const mockPlaylistData: PlaylistData = {
    rating: 1500,
    matchesPlayed: 100,
    tier: {
      value: 18,
      displayValue: 'Champion III',
      metadata: {
        name: 'Champion III',
      },
    },
    division: {
      value: 2,
      displayValue: 'Division II',
      metadata: {
        name: 'Division II',
      },
    },
  };

  const mockSeason: TrackerSeason = {
    id: 'season_123',
    trackerId: 'tracker_123',
    seasonNumber: 15,
    seasonName: 'Season 15',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-03-31'),
    playlist1v1: mockPlaylistData,
    playlist2v2: { ...mockPlaylistData, rating: 1600, matchesPlayed: 200 },
    playlist3v3: { ...mockPlaylistData, rating: 1700, matchesPlayed: 300 },
    playlist4v4: { ...mockPlaylistData, rating: 1400, matchesPlayed: 50 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockPrisma = {
      trackerSeason: {
        findFirst: vi.fn(),
      },
    } as unknown as PrismaService;

    const module = await Test.createTestingModule({
      providers: [
        TrackerDataExtractionService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TrackerDataExtractionService>(
      TrackerDataExtractionService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('extractTrackerData', () => {
    it('should_extract_tracker_data_when_season_exists', async () => {
      vi.spyOn(mockPrisma.trackerSeason, 'findFirst').mockResolvedValue(
        mockSeason,
      );

      const result = await service.extractTrackerData('tracker_123');

      expect(result).toBeDefined();
      expect(result?.ones).toBe(1500);
      expect(result?.twos).toBe(1600);
      expect(result?.threes).toBe(1700);
      expect(result?.fours).toBe(1400);
      expect(result?.onesGamesPlayed).toBe(100);
      expect(result?.twosGamesPlayed).toBe(200);
      expect(result?.threesGamesPlayed).toBe(300);
      expect(result?.foursGamesPlayed).toBe(50);
    });

    it('should_return_null_when_no_season_found', async () => {
      vi.spyOn(mockPrisma.trackerSeason, 'findFirst').mockResolvedValue(null);

      const result = await service.extractTrackerData('tracker_123');

      expect(result).toBeNull();
    });

    it('should_handle_missing_playlist_data_gracefully', async () => {
      const seasonWithoutPlaylists = {
        ...mockSeason,
        playlist1v1: null,
        playlist2v2: null,
        playlist3v3: null,
        playlist4v4: null,
      };
      vi.spyOn(mockPrisma.trackerSeason, 'findFirst').mockResolvedValue(
        seasonWithoutPlaylists,
      );

      const result = await service.extractTrackerData('tracker_123');

      expect(result).toBeDefined();
      expect(result?.ones).toBeUndefined();
      expect(result?.twos).toBeUndefined();
      expect(result?.threes).toBeUndefined();
      expect(result?.fours).toBeUndefined();
    });

    it('should_handle_partial_playlist_data', async () => {
      const seasonWithPartialData = {
        ...mockSeason,
        playlist1v1: mockPlaylistData,
        playlist2v2: null,
        playlist3v3: mockPlaylistData,
        playlist4v4: null,
      };
      vi.spyOn(mockPrisma.trackerSeason, 'findFirst').mockResolvedValue(
        seasonWithPartialData,
      );

      const result = await service.extractTrackerData('tracker_123');

      expect(result).toBeDefined();
      expect(result?.ones).toBe(1500);
      expect(result?.twos).toBeUndefined();
      expect(result?.threes).toBe(1500);
      expect(result?.fours).toBeUndefined();
    });

    it('should_handle_missing_rating_in_playlist_data', async () => {
      const playlistWithoutRating = {
        ...mockPlaylistData,
        rating: undefined,
      };
      const seasonWithMissingRating = {
        ...mockSeason,
        playlist1v1: playlistWithoutRating,
      };
      vi.spyOn(mockPrisma.trackerSeason, 'findFirst').mockResolvedValue(
        seasonWithMissingRating,
      );

      const result = await service.extractTrackerData('tracker_123');

      expect(result).toBeDefined();
      expect(result?.ones).toBeUndefined();
    });

    it('should_handle_missing_matches_played_in_playlist_data', async () => {
      const playlistWithoutMatches = {
        ...mockPlaylistData,
        matchesPlayed: undefined,
      };
      const seasonWithMissingMatches = {
        ...mockSeason,
        playlist1v1: playlistWithoutMatches,
      };
      vi.spyOn(mockPrisma.trackerSeason, 'findFirst').mockResolvedValue(
        seasonWithMissingMatches,
      );

      const result = await service.extractTrackerData('tracker_123');

      expect(result).toBeDefined();
      expect(result?.onesGamesPlayed).toBeUndefined();
    });

    it('should_order_by_season_number_descending', async () => {
      vi.spyOn(mockPrisma.trackerSeason, 'findFirst').mockResolvedValue(
        mockSeason,
      );

      await service.extractTrackerData('tracker_123');

      expect(mockPrisma.trackerSeason.findFirst).toHaveBeenCalledWith({
        where: { trackerId: 'tracker_123' },
        orderBy: { seasonNumber: 'desc' },
      });
    });

    it('should_return_null_when_database_error_occurs', async () => {
      vi.spyOn(mockPrisma.trackerSeason, 'findFirst').mockRejectedValue(
        new Error('Database error'),
      );

      const result = await service.extractTrackerData('tracker_123');

      expect(result).toBeNull();
    });
  });
});
