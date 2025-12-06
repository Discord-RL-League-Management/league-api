/**
 * TrackerValidationService Unit Tests
 * 
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { TrackerValidationService } from '@/trackers/services/tracker-validation.service';
import { PrismaService } from '@/prisma/prisma.service';
import { TrackerUrlConverterService } from '@/trackers/services/tracker-url-converter.service';
import { GamePlatform, Game } from '@prisma/client';

describe('TrackerValidationService', () => {
  let service: TrackerValidationService;
  let mockPrisma: PrismaService;
  let mockUrlConverter: TrackerUrlConverterService;

  beforeEach(() => {
    // ARRANGE: Setup test dependencies
    mockPrisma = {
      tracker: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
    } as unknown as PrismaService;

    mockUrlConverter = {
      isValidTrnUrl: vi.fn(),
    } as unknown as TrackerUrlConverterService;

    service = new TrackerValidationService(mockPrisma, mockUrlConverter);
  });

  describe('validateTrackerUrl', () => {
    it('should_return_parsed_tracker_url_when_all_validations_pass', async () => {
      // ARRANGE
      const url =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview';
      const userId = 'user123';

      vi.mocked(mockUrlConverter.isValidTrnUrl).mockReturnValue(true);
      vi.mocked(mockPrisma.tracker.findUnique).mockResolvedValue(null);

      // ACT
      const result = await service.validateTrackerUrl(url, userId);

      // ASSERT
      expect(result.platform).toBe(GamePlatform.STEAM);
      expect(result.username).toBe('testuser');
      expect(result.game).toBe(Game.ROCKET_LEAGUE);
      expect(result.isValid).toBe(true);
    });

    it('should_throw_BadRequestException_when_url_format_is_invalid', async () => {
      // ARRANGE
      const url = 'invalid-url';
      const userId = 'user123';

      // ACT & ASSERT
      await expect(service.validateTrackerUrl(url, userId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validateTrackerUrl(url, userId)).rejects.toThrow(
        'Invalid tracker URL format',
      );
    });

    it('should_throw_BadRequestException_when_url_converter_rejects_url', async () => {
      // ARRANGE
      const url =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview';
      const userId = 'user123';

      vi.mocked(mockUrlConverter.isValidTrnUrl).mockReturnValue(false);

      // ACT & ASSERT
      await expect(service.validateTrackerUrl(url, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should_throw_BadRequestException_when_platform_is_unsupported', async () => {
      // ARRANGE
      const url =
        'https://rocketleague.tracker.network/rocket-league/profile/invalid/testuser/overview';
      const userId = 'user123';

      vi.mocked(mockUrlConverter.isValidTrnUrl).mockReturnValue(true);

      // ACT & ASSERT
      await expect(service.validateTrackerUrl(url, userId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validateTrackerUrl(url, userId)).rejects.toThrow(
        'Unsupported platform',
      );
    });

    it('should_throw_BadRequestException_when_username_is_invalid', async () => {
      // ARRANGE
      const url =
        'https://rocketleague.tracker.network/rocket-league/profile/steam//overview';
      const userId = 'user123';

      vi.mocked(mockUrlConverter.isValidTrnUrl).mockReturnValue(true);

      // ACT & ASSERT
      await expect(service.validateTrackerUrl(url, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should_throw_BadRequestException_when_url_already_registered', async () => {
      // ARRANGE
      const url =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview';
      const userId = 'user123';
      const existingTracker = {
        id: 'tracker123',
        url,
        userId: 'differentUser',
      };

      vi.mocked(mockUrlConverter.isValidTrnUrl).mockReturnValue(true);
      vi.mocked(mockPrisma.tracker.findUnique).mockResolvedValue(
        existingTracker as any,
      );

      // ACT & ASSERT
      await expect(service.validateTrackerUrl(url, userId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validateTrackerUrl(url, userId)).rejects.toThrow(
        'This tracker URL has already been registered',
      );
    });

    it('should_pass_when_url_belongs_to_excluded_tracker', async () => {
      // ARRANGE
      const url =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview';
      const userId = 'user123';
      const excludeTrackerId = 'tracker123';
      const existingTracker = {
        id: excludeTrackerId,
        url,
        userId: 'differentUser',
      };

      vi.mocked(mockUrlConverter.isValidTrnUrl).mockReturnValue(true);
      vi.mocked(mockPrisma.tracker.findUnique).mockResolvedValue(
        existingTracker as any,
      );

      // ACT
      const result = await service.validateTrackerUrl(
        url,
        userId,
        excludeTrackerId,
      );

      // ASSERT
      expect(result.isValid).toBe(true);
    });

    it('should_skip_uniqueness_check_when_skipUniquenessCheck_is_true', async () => {
      // ARRANGE
      const url =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview';
      const userId = 'user123';

      vi.mocked(mockUrlConverter.isValidTrnUrl).mockReturnValue(true);

      // ACT
      const result = await service.validateTrackerUrl(
        url,
        userId,
        undefined,
        true,
      );

      // ASSERT
      expect(result.isValid).toBe(true);
      expect(mockPrisma.tracker.findUnique).not.toHaveBeenCalled();
    });

    it('should_handle_url_with_trailing_slash', async () => {
      // ARRANGE
      const url =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview/';
      const userId = 'user123';

      vi.mocked(mockUrlConverter.isValidTrnUrl).mockReturnValue(true);
      vi.mocked(mockPrisma.tracker.findUnique).mockResolvedValue(null);

      // ACT
      const result = await service.validateTrackerUrl(url, userId);

      // ASSERT
      expect(result.isValid).toBe(true);
    });

    it('should_support_all_valid_platforms', async () => {
      // ARRANGE
      const platforms = ['steam', 'epic', 'xbl', 'psn', 'switch'];
      const userId = 'user123';

      for (const platform of platforms) {
        const url = `https://rocketleague.tracker.network/rocket-league/profile/${platform}/testuser/overview`;
        vi.mocked(mockUrlConverter.isValidTrnUrl).mockReturnValue(true);
        vi.mocked(mockPrisma.tracker.findUnique).mockResolvedValue(null);

        // ACT
        const result = await service.validateTrackerUrl(url, userId);

        // ASSERT
        expect(result.isValid).toBe(true);
      }
    });
  });

  describe('batchCheckUrlUniqueness', () => {
    it('should_return_empty_map_when_no_urls_provided', async () => {
      // ARRANGE
      const urls: string[] = [];

      // ACT
      const result = await service.batchCheckUrlUniqueness(urls);

      // ASSERT
      expect(result.size).toBe(0);
      expect(mockPrisma.tracker.findMany).not.toHaveBeenCalled();
    });

    it('should_return_all_unique_when_no_existing_trackers', async () => {
      // ARRANGE
      const urls = [
        'https://rocketleague.tracker.network/rocket-league/profile/steam/user1/overview',
        'https://rocketleague.tracker.network/rocket-league/profile/epic/user2/overview',
      ];

      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue([]);

      // ACT
      const result = await service.batchCheckUrlUniqueness(urls);

      // ASSERT
      expect(result.get(urls[0])).toBe(true);
      expect(result.get(urls[1])).toBe(true);
    });

    it('should_identify_duplicate_urls', async () => {
      // ARRANGE
      const urls = [
        'https://rocketleague.tracker.network/rocket-league/profile/steam/user1/overview',
        'https://rocketleague.tracker.network/rocket-league/profile/epic/user2/overview',
      ];
      const existingTrackers = [
        { url: urls[0], id: 'tracker123' },
      ];

      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        existingTrackers as any,
      );

      // ACT
      const result = await service.batchCheckUrlUniqueness(urls);

      // ASSERT
      expect(result.get(urls[0])).toBe(false);
      expect(result.get(urls[1])).toBe(true);
    });

    it('should_exclude_trackers_from_uniqueness_check', async () => {
      // ARRANGE
      const urls = [
        'https://rocketleague.tracker.network/rocket-league/profile/steam/user1/overview',
      ];
      const excludeTrackerIds = ['tracker123'];
      const existingTrackers = [
        { url: urls[0], id: 'tracker123' },
      ];

      vi.mocked(mockPrisma.tracker.findMany).mockResolvedValue(
        existingTrackers as any,
      );

      // ACT
      const result = await service.batchCheckUrlUniqueness(
        urls,
        excludeTrackerIds,
      );

      // ASSERT
      expect(result.get(urls[0])).toBe(true);
    });
  });

  describe('extractTrackerInfo', () => {
    it('should_extract_platform_and_username_from_valid_url', async () => {
      // ARRANGE
      const url =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview';

      // ACT
      const result = await service.extractTrackerInfo(url);

      // ASSERT
      expect(result.platform).toBe(GamePlatform.STEAM);
      expect(result.username).toBe('testuser');
    });

    it('should_throw_BadRequestException_when_url_cannot_be_parsed', async () => {
      // ARRANGE
      const url = 'invalid-url';

      // ACT & ASSERT
      // The method throws synchronously, so we need to wrap it in a function
      await expect(
        (async () => {
          return service.extractTrackerInfo(url);
        })(),
      ).rejects.toThrow(BadRequestException);
      await expect(
        (async () => {
          return service.extractTrackerInfo(url);
        })(),
      ).rejects.toThrow('Failed to parse tracker URL');
    });
  });
});

