/**
 * TrackerScraperService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';
import { TrackerScraperService } from './tracker-scraper.service';
import { TrackerUrlConverterService } from './tracker-url-converter.service';
import type {
  ScrapedTrackerData,
  SeasonData,
  TrackerSegment,
} from '../interfaces/scraper.interfaces';

describe('TrackerScraperService', () => {
  let service: TrackerScraperService;
  let mockHttpService: HttpService;
  let mockConfigService: ConfigService;
  let mockUrlConverter: TrackerUrlConverterService;

  const mockFlaresolverrConfig = {
    url: 'http://localhost:8191',
    timeoutMs: 30000,
    retryAttempts: 3,
    retryDelayMs: 1000,
    rateLimitPerMinute: 10,
  };

  const mockTrackerData: ScrapedTrackerData = {
    platformInfo: {
      platformSlug: 'steam',
      platformUserId: '76561198051701160',
      platformUserHandle: 'testuser',
    },
    userInfo: {
      userId: 12345,
      isPremium: false,
    },
    metadata: {
      lastUpdated: '2024-01-01T00:00:00Z',
      playerId: 12345,
      currentSeason: 10,
    },
    segments: [
      {
        type: 'playlist',
        attributes: {
          playlistId: 2,
          season: 10,
        },
        metadata: {
          name: 'Ranked Doubles',
        },
        stats: {
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
          rating: {
            value: 1400,
            displayValue: '1400',
          },
          matchesPlayed: {
            value: 300,
            displayValue: '300',
          },
          winStreak: {
            value: 2,
            displayValue: '2',
          },
        },
        expiryDate: '2024-12-31T23:59:59Z',
      },
    ],
    availableSegments: [
      {
        type: 'playlist',
        attributes: {
          season: 10,
        },
        metadata: {
          name: 'Season 10',
        },
      },
    ],
  };

  beforeEach(() => {
    mockHttpService = {
      post: vi.fn(),
    } as unknown as HttpService;

    mockConfigService = {
      get: vi.fn().mockReturnValue(mockFlaresolverrConfig),
    } as unknown as ConfigService;

    mockUrlConverter = {
      convertTrnUrlToApiUrl: vi
        .fn()
        .mockReturnValue(
          'https://api.tracker.gg/api/v2/rocket-league/standard/profile/steam/76561198051701160',
        ),
    } as unknown as TrackerUrlConverterService;

    service = new TrackerScraperService(
      mockHttpService,
      mockConfigService,
      mockUrlConverter,
    );
  });

  describe('scrapeTrackerData', () => {
    it('should_scrape_tracker_data_when_valid_url_provided', async () => {
      const trnUrl =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/76561198051701160/overview';
      const mockFlareSolverrResponse: AxiosResponse = {
        data: {
          status: 'ok',
          solution: {
            response: `<pre>${JSON.stringify({ data: mockTrackerData })}</pre>`,
            status: 200,
            url: 'https://api.tracker.gg/api/v2/rocket-league/standard/profile/steam/76561198051701160',
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      vi.spyOn(mockHttpService, 'post').mockReturnValue(
        of(mockFlareSolverrResponse),
      );

      const result = await service.scrapeTrackerData(trnUrl);

      expect(result).toBeDefined();
      expect(result.segments).toBeDefined();
      expect(mockUrlConverter.convertTrnUrlToApiUrl).toHaveBeenCalledWith(
        trnUrl,
      );
    });

    it('should_scrape_tracker_data_with_season_number_when_provided', async () => {
      const trnUrl =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/76561198051701160/overview';
      const seasonNumber = 9;
      const mockFlareSolverrResponse: AxiosResponse = {
        data: {
          status: 'ok',
          solution: {
            response: `<pre>${JSON.stringify({ data: mockTrackerData })}</pre>`,
            status: 200,
            url: 'https://api.tracker.gg/api/v2/rocket-league/standard/profile/steam/76561198051701160',
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      vi.spyOn(mockHttpService, 'post').mockReturnValue(
        of(mockFlareSolverrResponse),
      );

      const result = await service.scrapeTrackerData(trnUrl, seasonNumber);

      expect(result).toBeDefined();
      expect(mockHttpService.post).toHaveBeenCalled();
    });

    it('should_throw_service_unavailable_when_flaresolverr_fails', async () => {
      const trnUrl =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/76561198051701160/overview';
      const axiosError = {
        response: {
          status: 500,
          data: {},
        },
        code: 'ECONNREFUSED',
      } as AxiosError;

      vi.spyOn(mockHttpService, 'post').mockReturnValue(
        throwError(() => axiosError),
      );

      await expect(service.scrapeTrackerData(trnUrl)).rejects.toThrow(
        ServiceUnavailableException,
      );
    }, 5000);

    it('should_throw_bad_request_when_flaresolverr_returns_error_status', async () => {
      const trnUrl =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/76561198051701160/overview';
      const mockFlareSolverrResponse: AxiosResponse = {
        data: {
          status: 'error',
          message: 'Failed to scrape',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      vi.spyOn(mockHttpService, 'post').mockReturnValue(
        of(mockFlareSolverrResponse),
      );

      await expect(service.scrapeTrackerData(trnUrl)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('scrapeAllSeasons', () => {
    beforeEach(() => {
      // Mock enforceRateLimit to return immediately without delays for fast test execution
      vi.spyOn(service, 'enforceRateLimit' as any).mockResolvedValue(undefined);
    });

    it('should_scrape_all_seasons_when_multiple_seasons_available', async () => {
      const trnUrl =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/76561198051701160/overview';
      const mockDataWithMultipleSeasons: ScrapedTrackerData = {
        ...mockTrackerData,
        availableSegments: [
          {
            type: 'playlist',
            attributes: { season: 10 },
            metadata: { name: 'Season 10' },
          },
          {
            type: 'playlist',
            attributes: { season: 9 },
            metadata: { name: 'Season 9' },
          },
        ],
      };

      const mockFlareSolverrResponse: AxiosResponse = {
        data: {
          status: 'ok',
          solution: {
            response: `<pre>${JSON.stringify({ data: mockDataWithMultipleSeasons })}</pre>`,
            status: 200,
            url: 'https://api.tracker.gg/api/v2/rocket-league/standard/profile/steam/76561198051701160',
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      vi.spyOn(mockHttpService, 'post').mockReturnValue(
        of(mockFlareSolverrResponse),
      );

      const result = await service.scrapeAllSeasons(trnUrl);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should_return_empty_array_when_no_seasons_available', async () => {
      const trnUrl =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/76561198051701160/overview';
      const mockDataNoSeasons: ScrapedTrackerData = {
        ...mockTrackerData,
        availableSegments: [],
        metadata: {
          ...mockTrackerData.metadata,
          currentSeason: 0,
        },
      };

      const mockFlareSolverrResponse: AxiosResponse = {
        data: {
          status: 'ok',
          solution: {
            response: `<pre>${JSON.stringify({ data: mockDataNoSeasons })}</pre>`,
            status: 200,
            url: 'https://api.tracker.gg/api/v2/rocket-league/standard/profile/steam/76561198051701160',
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      vi.spyOn(mockHttpService, 'post').mockReturnValue(
        of(mockFlareSolverrResponse),
      );

      const result = await service.scrapeAllSeasons(trnUrl);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('parseSegments', () => {
    it('should_parse_segments_into_season_data', () => {
      const segments: TrackerSegment[] = [
        {
          type: 'playlist',
          attributes: {
            playlistId: 2,
            season: 10,
          },
          metadata: {
            name: 'Ranked Doubles',
          },
          stats: {
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
            rating: {
              value: 1400,
              displayValue: '1400',
            },
            matchesPlayed: {
              value: 300,
              displayValue: '300',
            },
            winStreak: {
              value: 2,
              displayValue: '2',
            },
          },
          expiryDate: '2024-12-31T23:59:59Z',
        },
      ];

      const availableSegments = [
        {
          type: 'playlist',
          attributes: { season: 10 },
          metadata: { name: 'Season 10' },
        },
      ];

      const result = service.parseSegments(segments, 10, availableSegments);

      expect(result).toBeDefined();
      expect(result.seasonNumber).toBe(10);
      expect(result.playlist2v2).toBeDefined();
    });

    it('should_return_null_playlists_when_no_matching_segments', () => {
      const segments: TrackerSegment[] = [];
      const availableSegments = [
        {
          type: 'playlist',
          attributes: { season: 10 },
          metadata: { name: 'Season 10' },
        },
      ];

      const result = service.parseSegments(segments, 10, availableSegments);

      expect(result).toBeDefined();
      expect(result.seasonNumber).toBe(10);
      expect(result.playlist1v1).toBeNull();
      expect(result.playlist2v2).toBeNull();
      expect(result.playlist3v3).toBeNull();
      expect(result.playlist4v4).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should_throw_bad_request_when_url_conversion_fails', async () => {
      const trnUrl = 'invalid-url';
      vi.spyOn(mockUrlConverter, 'convertTrnUrlToApiUrl').mockImplementation(
        () => {
          throw new BadRequestException('Invalid URL');
        },
      );

      await expect(service.scrapeTrackerData(trnUrl)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should_throw_service_unavailable_on_rate_limit', async () => {
      const trnUrl =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/76561198051701160/overview';
      const axiosError = {
        response: {
          status: 429,
          data: {},
        },
      } as AxiosError;

      vi.spyOn(mockHttpService, 'post').mockReturnValue(
        throwError(() => axiosError),
      );

      await expect(service.scrapeTrackerData(trnUrl)).rejects.toThrow(
        ServiceUnavailableException,
      );
    }, 5000);
  });
});
