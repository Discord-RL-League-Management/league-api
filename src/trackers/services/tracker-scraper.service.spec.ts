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

    it('should_handle_season_scraping_failures_gracefully', async () => {
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

      const baseResponse: AxiosResponse = {
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

      const errorResponse = throwError(
        () =>
          ({
            response: { status: 500 },
            code: 'ECONNREFUSED',
          }) as AxiosError,
      );

      vi.spyOn(service, 'enforceRateLimit' as any).mockResolvedValue(undefined);
      vi.spyOn(mockHttpService, 'post')
        .mockReturnValueOnce(of(baseResponse))
        .mockReturnValueOnce(errorResponse);

      const result = await service.scrapeAllSeasons(trnUrl);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    }, 5000);

    it('should_handle_available_segments_with_non_playlist_type', async () => {
      const trnUrl =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/76561198051701160/overview';
      const mockDataWithMixedSegments: ScrapedTrackerData = {
        ...mockTrackerData,
        availableSegments: [
          {
            type: 'playlist',
            attributes: { season: 10 },
            metadata: { name: 'Season 10' },
          },
          {
            type: 'overview',
            attributes: {},
            metadata: { name: 'Overview' },
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
            response: `<pre>${JSON.stringify({ data: mockDataWithMixedSegments })}</pre>`,
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

    it('should_throw_error_when_base_scrape_fails', async () => {
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

      await expect(service.scrapeAllSeasons(trnUrl)).rejects.toThrow(
        ServiceUnavailableException,
      );
    }, 5000);
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

    it('should_parse_all_playlist_types_when_multiple_segments_provided', () => {
      const segments: TrackerSegment[] = [
        {
          type: 'playlist',
          attributes: {
            playlistId: 1,
            season: 10,
          },
          metadata: {
            name: 'Ranked Duel',
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
              value: 17,
              displayValue: 'Champion II',
              metadata: {
                name: 'Champion II',
              },
            },
            division: {
              value: 3,
              displayValue: 'Division III',
              metadata: {
                name: 'Division III',
              },
            },
            rating: {
              value: 1350,
              displayValue: '1350',
            },
            matchesPlayed: {
              value: 250,
              displayValue: '250',
            },
            winStreak: {
              value: 1,
              displayValue: '1',
            },
          },
          expiryDate: '2024-12-31T23:59:59Z',
        },
        {
          type: 'playlist',
          attributes: {
            playlistId: 3,
            season: 10,
          },
          metadata: {
            name: 'Ranked Standard',
          },
          stats: {
            tier: {
              value: 16,
              displayValue: 'Champion I',
              metadata: {
                name: 'Champion I',
              },
            },
            division: {
              value: 4,
              displayValue: 'Division IV',
              metadata: {
                name: 'Division IV',
              },
            },
            rating: {
              value: 1300,
              displayValue: '1300',
            },
            matchesPlayed: {
              value: 200,
              displayValue: '200',
            },
            winStreak: {
              value: 0,
              displayValue: '0',
            },
          },
          expiryDate: '2024-12-31T23:59:59Z',
        },
        {
          type: 'playlist',
          attributes: {
            playlistId: 8,
            season: 10,
          },
          metadata: {
            name: 'Ranked 4v4',
          },
          stats: {
            tier: {
              value: 15,
              displayValue: 'Diamond III',
              metadata: {
                name: 'Diamond III',
              },
            },
            division: {
              value: 1,
              displayValue: 'Division I',
              metadata: {
                name: 'Division I',
              },
            },
            rating: {
              value: 1250,
              displayValue: '1250',
            },
            matchesPlayed: {
              value: 150,
              displayValue: '150',
            },
            winStreak: {
              value: 3,
              displayValue: '3',
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
      expect(result.playlist1v1).toBeDefined();
      expect(result.playlist2v2).toBeDefined();
      expect(result.playlist3v3).toBeDefined();
      expect(result.playlist4v4).toBeDefined();
    });

    it('should_skip_unsupported_playlist_ids', () => {
      const segments: TrackerSegment[] = [
        {
          type: 'playlist',
          attributes: {
            playlistId: 99,
            season: 10,
          },
          metadata: {
            name: 'Unsupported Playlist',
          },
          stats: {},
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
      expect(result.playlist1v1).toBeNull();
      expect(result.playlist2v2).toBeNull();
      expect(result.playlist3v3).toBeNull();
      expect(result.playlist4v4).toBeNull();
    });

    it('should_use_season_name_from_available_segments_when_provided', () => {
      const segments: TrackerSegment[] = [];
      const availableSegments = [
        {
          type: 'playlist',
          attributes: { season: 10 },
          metadata: { name: 'Season 10 - Champions' },
        },
      ];

      const result = service.parseSegments(segments, 10, availableSegments);

      expect(result).toBeDefined();
      expect(result.seasonName).toBe('Season 10 - Champions');
    });

    it('should_use_overview_segment_name_when_available_segments_not_provided', () => {
      const segments: TrackerSegment[] = [
        {
          type: 'overview',
          attributes: {},
          metadata: { name: 'Rocket League Overview' },
          stats: {},
          expiryDate: '2024-12-31T23:59:59Z',
        },
      ];

      const result = service.parseSegments(segments, 10);

      expect(result).toBeDefined();
      expect(result.seasonName).toBe('Rocket League Overview');
    });

    it('should_use_default_season_name_when_no_metadata_available', () => {
      const segments: TrackerSegment[] = [];

      const result = service.parseSegments(segments, 10);

      expect(result).toBeDefined();
      expect(result.seasonName).toBe('Season 10');
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

    it('should_throw_service_unavailable_on_server_error', async () => {
      const trnUrl =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/76561198051701160/overview';
      const axiosError = {
        response: {
          status: 500,
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

    it('should_throw_service_unavailable_on_connection_timeout', async () => {
      const trnUrl =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/76561198051701160/overview';
      const axiosError = {
        code: 'ECONNABORTED',
        response: undefined,
      } as AxiosError;

      vi.spyOn(mockHttpService, 'post').mockReturnValue(
        throwError(() => axiosError),
      );

      await expect(service.scrapeTrackerData(trnUrl)).rejects.toThrow(
        ServiceUnavailableException,
      );
    }, 5000);

    it('should_throw_bad_request_when_flaresolverr_response_missing_solution', async () => {
      const trnUrl =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/76561198051701160/overview';
      const mockFlareSolverrResponse: AxiosResponse = {
        data: {
          status: 'ok',
          solution: undefined,
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
        BadRequestException,
      );
    });

    it('should_throw_bad_request_when_json_not_found_in_pre_tag', async () => {
      const trnUrl =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/76561198051701160/overview';
      const mockFlareSolverrResponse: AxiosResponse = {
        data: {
          status: 'ok',
          solution: {
            response: '<html><body>No JSON here</body></html>',
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

      await expect(service.scrapeTrackerData(trnUrl)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should_throw_bad_request_when_invalid_json_in_pre_tag', async () => {
      const trnUrl =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/76561198051701160/overview';
      const mockFlareSolverrResponse: AxiosResponse = {
        data: {
          status: 'ok',
          solution: {
            response: '<pre>{invalid json}</pre>',
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

      await expect(service.scrapeTrackerData(trnUrl)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should_throw_bad_request_when_missing_segments_in_response', async () => {
      const trnUrl =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/76561198051701160/overview';
      const invalidData = {
        data: {
          availableSegments: [],
        },
      };
      const mockFlareSolverrResponse: AxiosResponse = {
        data: {
          status: 'ok',
          solution: {
            response: `<pre>${JSON.stringify(invalidData)}</pre>`,
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

      await expect(service.scrapeTrackerData(trnUrl)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should_throw_bad_request_when_missing_available_segments_in_response', async () => {
      const trnUrl =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/76561198051701160/overview';
      const invalidData = {
        data: {
          segments: [],
        },
      };
      const mockFlareSolverrResponse: AxiosResponse = {
        data: {
          status: 'ok',
          solution: {
            response: `<pre>${JSON.stringify(invalidData)}</pre>`,
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

      await expect(service.scrapeTrackerData(trnUrl)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should_handle_generic_error_and_wrap_in_service_unavailable', async () => {
      const trnUrl =
        'https://rocketleague.tracker.network/rocket-league/profile/steam/76561198051701160/overview';

      vi.spyOn(mockHttpService, 'post').mockReturnValue(
        throwError(() => new Error('Generic error')),
      );

      await expect(service.scrapeTrackerData(trnUrl)).rejects.toThrow(
        ServiceUnavailableException,
      );
    }, 5000);
  });
});
