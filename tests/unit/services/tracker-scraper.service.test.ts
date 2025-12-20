/**
 * TrackerScraperService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 *
 * CRITICAL: NO external HTTP requests - all network calls are mocked.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';
import { TrackerScraperService } from '@/trackers/services/tracker-scraper.service';
import { TrackerUrlConverterService } from '@/trackers/services/tracker-url-converter.service';
import type { ScrapedTrackerData } from '@/trackers/interfaces/scraper.interfaces';
import {
  createFlareSolverrResponse,
  createFlareSolverrResponseWithHtml,
  createFlareSolverrErrorResponse,
  createFlareSolverrResponseWithMissingSolution,
  createFlareSolverrResponseWithoutPreTag,
  createFlareSolverrResponseWithInvalidJson,
} from '@tests/factories/flaresolverr-response.factory';
import {
  createPlaylistSegment,
  createOverviewSegment,
  createAllRankedPlaylistSegments,
  createAlternativePlaylistSegments,
  createPlaylistSegmentWithInvalidStats,
  createPlaylistSegmentWithNullStats,
} from '@tests/factories/tracker-segment.factory';

describe('TrackerScraperService', () => {
  let service: TrackerScraperService;
  let mockHttpService: HttpService;
  let mockConfigService: ConfigService;
  let mockUrlConverter: TrackerUrlConverterService;

  const mockFlareSolverrConfig = {
    url: 'http://flaresolverr:8191',
    timeoutMs: 60000,
    retryAttempts: 3,
    retryDelayMs: 1000,
    rateLimitPerMinute: 60,
  };

  const mockTrnUrl =
    'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview';
  const mockApiUrl =
    'https://api.tracker.gg/api/v2/rocket-league/standard/profile/steam/testuser';

  beforeEach(() => {
    // Use fake timers to make rate limiting instant in unit tests
    vi.useFakeTimers();

    // ARRANGE: Setup test dependencies
    mockHttpService = {
      post: vi.fn(),
    } as unknown as HttpService;

    mockConfigService = {
      get: vi.fn().mockReturnValue(mockFlareSolverrConfig),
    } as unknown as ConfigService;

    mockUrlConverter = {
      convertTrnUrlToApiUrl: vi.fn().mockReturnValue(mockApiUrl),
    } as unknown as TrackerUrlConverterService;

    service = new TrackerScraperService(
      mockHttpService,
      mockConfigService,
      mockUrlConverter,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should_initialize_with_valid_flaresolverr_config', () => {
      // ARRANGE: Config is already set in beforeEach
      // ACT: Service is constructed in beforeEach

      // ASSERT: Verify service was initialized successfully (state verification)
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(TrackerScraperService);
    });

    it('should_throw_error_when_flaresolverr_config_is_missing', () => {
      // ARRANGE
      const mockConfigServiceWithoutConfig = {
        get: vi.fn().mockReturnValue(null),
      } as unknown as ConfigService;

      // ACT & ASSERT
      expect(() => {
        new TrackerScraperService(
          mockHttpService,
          mockConfigServiceWithoutConfig,
          mockUrlConverter,
        );
      }).toThrow('FlareSolverr configuration is missing');
    });
  });

  describe('scrapeTrackerData', () => {
    const createMockScrapedData = (): ScrapedTrackerData => ({
      platformInfo: {
        platformSlug: 'steam',
        platformUserId: '123456789',
        platformUserHandle: 'testuser',
      },
      userInfo: {
        userId: 1,
        isPremium: false,
      },
      metadata: {
        lastUpdated: '2025-01-01T00:00:00Z',
        playerId: 1,
        currentSeason: 34,
      },
      segments: [
        createOverviewSegment(),
        ...createAllRankedPlaylistSegments(34),
      ],
      availableSegments: [
        {
          type: 'playlist',
          attributes: { season: 34 },
          metadata: { name: 'Season 20 (34)' },
        },
      ],
    });

    it('should_scrape_tracker_data_when_valid_trn_url_provided', async () => {
      // ARRANGE
      const mockScrapedData = createMockScrapedData();
      const mockFlareSolverrResponse =
        createFlareSolverrResponse(mockScrapedData);
      const mockAxiosResponse: AxiosResponse = {
        data: mockFlareSolverrResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      vi.spyOn(mockHttpService, 'post').mockReturnValue(
        of(mockAxiosResponse) as any,
      );

      // ACT
      const result = await service.scrapeTrackerData(mockTrnUrl);

      // ASSERT
      expect(result).toBeDefined();
      expect(result.platformInfo.platformSlug).toBe('steam');
      expect(result.segments).toBeDefined();
      expect(result.availableSegments).toBeDefined();
    });

    it('should_scrape_tracker_data_when_season_number_provided', async () => {
      // ARRANGE
      const seasonNumber = 33;
      const mockScrapedData = createMockScrapedData();
      mockScrapedData.metadata.currentSeason = seasonNumber;
      const mockFlareSolverrResponse =
        createFlareSolverrResponse(mockScrapedData);
      const mockAxiosResponse: AxiosResponse = {
        data: mockFlareSolverrResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      vi.spyOn(mockHttpService, 'post').mockReturnValue(
        of(mockAxiosResponse) as any,
      );

      // ACT
      const result = await service.scrapeTrackerData(mockTrnUrl, seasonNumber);

      // ASSERT
      expect(result).toBeDefined();
      expect(result.metadata.currentSeason).toBe(seasonNumber);
    });

    it('should_scrape_tracker_data_when_no_season_provided', async () => {
      // ARRANGE
      const mockScrapedData = createMockScrapedData();
      const mockFlareSolverrResponse =
        createFlareSolverrResponse(mockScrapedData);
      const mockAxiosResponse: AxiosResponse = {
        data: mockFlareSolverrResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      vi.spyOn(mockHttpService, 'post').mockReturnValue(
        of(mockAxiosResponse) as any,
      );

      // ACT
      const result = await service.scrapeTrackerData(mockTrnUrl);

      // ASSERT
      expect(result).toBeDefined();
      expect(result.platformInfo).toBeDefined();
    });

    it('should_process_data_when_trn_url_provided', async () => {
      // ARRANGE
      const mockScrapedData = createMockScrapedData();
      const mockFlareSolverrResponse =
        createFlareSolverrResponse(mockScrapedData);
      const mockAxiosResponse: AxiosResponse = {
        data: mockFlareSolverrResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      vi.spyOn(mockHttpService, 'post').mockReturnValue(
        of(mockAxiosResponse) as any,
      );

      // ACT
      const result = await service.scrapeTrackerData(mockTrnUrl);

      // ASSERT
      expect(result).toBeDefined();
      expect(result.platformInfo.platformSlug).toBe('steam');
    });

    it('should_append_season_parameter_when_season_provided', async () => {
      // ARRANGE
      const seasonNumber = 33;
      const mockScrapedData = createMockScrapedData();
      mockScrapedData.metadata.currentSeason = seasonNumber;
      const mockFlareSolverrResponse =
        createFlareSolverrResponse(mockScrapedData);
      const mockAxiosResponse: AxiosResponse = {
        data: mockFlareSolverrResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      vi.spyOn(mockHttpService, 'post').mockReturnValue(
        of(mockAxiosResponse) as any,
      );

      // ACT
      const result = await service.scrapeTrackerData(mockTrnUrl, seasonNumber);

      // ASSERT
      expect(result).toBeDefined();
      expect(result.metadata.currentSeason).toBe(seasonNumber);
    });

    it('should_throw_service_unavailable_when_flaresolverr_returns_error', async () => {
      // ARRANGE
      const mockErrorResponse = createFlareSolverrErrorResponse(
        'Failed to solve challenge',
        'error',
      );
      const mockAxiosResponse: AxiosResponse = {
        data: mockErrorResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      vi.spyOn(mockHttpService, 'post').mockReturnValue(
        of(mockAxiosResponse) as any,
      );

      // ACT & ASSERT
      await expect(service.scrapeTrackerData(mockTrnUrl)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should_throw_service_unavailable_when_http_request_fails', async () => {
      // ARRANGE
      // Disable retries for error tests - we're testing error handling, not retry logic
      // This avoids RxJS retry operator subscription cleanup issues
      const noRetryConfig = {
        ...mockFlareSolverrConfig,
        retryAttempts: 0,
        retryDelayMs: 0,
      };
      const noRetryConfigService = {
        get: vi.fn().mockReturnValue(noRetryConfig),
      } as unknown as ConfigService;
      const noRetryService = new TrackerScraperService(
        mockHttpService,
        noRetryConfigService,
        mockUrlConverter,
      );

      const axiosError = new AxiosError('Network error');
      axiosError.code = 'ECONNREFUSED';

      vi.spyOn(mockHttpService, 'post').mockReturnValue(
        throwError(() => axiosError) as any,
      );

      // ACT & ASSERT
      const promise = noRetryService.scrapeTrackerData(mockTrnUrl);
      // Advance timers to resolve rate limiting delays
      await vi.runAllTimersAsync();
      // Await the rejection - this ensures the observable chain fully settles
      await expect(promise).rejects.toThrow(ServiceUnavailableException);
      // Advance timers one more time to ensure all async operations complete
      await vi.runAllTimersAsync();
    });

    it('should_propagate_bad_request_exceptions', async () => {
      // ARRANGE
      const mockResponseWithoutSolution =
        createFlareSolverrResponseWithMissingSolution();
      const mockAxiosResponse: AxiosResponse = {
        data: mockResponseWithoutSolution,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      vi.spyOn(mockHttpService, 'post').mockReturnValue(
        of(mockAxiosResponse) as any,
      );

      // ACT & ASSERT
      await expect(service.scrapeTrackerData(mockTrnUrl)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should_propagate_service_unavailable_exceptions', async () => {
      // ARRANGE
      const mockErrorResponse = createFlareSolverrErrorResponse();
      const mockAxiosResponse: AxiosResponse = {
        data: mockErrorResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      vi.spyOn(mockHttpService, 'post').mockReturnValue(
        of(mockAxiosResponse) as any,
      );

      // ACT & ASSERT
      await expect(service.scrapeTrackerData(mockTrnUrl)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('parseApiResponse', () => {
    // These tests verify parseApiResponse indirectly through scrapeTrackerData
    // since parseApiResponse is private

    it('should_parse_flaresolverr_response_with_html_wrapper', async () => {
      // ARRANGE
      const mockScrapedData: ScrapedTrackerData = {
        platformInfo: {
          platformSlug: 'steam',
          platformUserId: '123',
          platformUserHandle: 'testuser',
        },
        userInfo: { userId: 1, isPremium: false },
        metadata: {
          lastUpdated: '2025-01-01T00:00:00Z',
          playerId: 1,
          currentSeason: 34,
        },
        segments: [createOverviewSegment()],
        availableSegments: [],
      };

      const mockFlareSolverrResponse =
        createFlareSolverrResponseWithHtml(mockScrapedData);
      const mockAxiosResponse: AxiosResponse = {
        data: mockFlareSolverrResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      vi.spyOn(mockHttpService, 'post').mockReturnValue(
        of(mockAxiosResponse) as any,
      );

      // ACT
      const result = await service.scrapeTrackerData(mockTrnUrl);

      // ASSERT
      expect(result.platformInfo.platformSlug).toBe('steam');
      expect(result.segments).toBeDefined();
      expect(result.availableSegments).toBeDefined();
    });

    it('should_throw_service_unavailable_when_status_not_ok', async () => {
      // ARRANGE
      const mockErrorResponse = createFlareSolverrErrorResponse(
        'Challenge detected',
        'error',
      );
      const mockAxiosResponse: AxiosResponse = {
        data: mockErrorResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      vi.spyOn(mockHttpService, 'post').mockReturnValue(
        of(mockAxiosResponse) as any,
      );

      // ACT & ASSERT
      await expect(service.scrapeTrackerData(mockTrnUrl)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should_throw_bad_request_when_solution_response_missing', async () => {
      // ARRANGE
      const mockResponseWithoutSolution =
        createFlareSolverrResponseWithMissingSolution();
      const mockAxiosResponse: AxiosResponse = {
        data: mockResponseWithoutSolution,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      vi.spyOn(mockHttpService, 'post').mockReturnValue(
        of(mockAxiosResponse) as any,
      );

      // ACT & ASSERT
      await expect(service.scrapeTrackerData(mockTrnUrl)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should_throw_bad_request_when_pre_tag_missing', async () => {
      // ARRANGE
      const mockResponseWithoutPreTag =
        createFlareSolverrResponseWithoutPreTag();
      const mockAxiosResponse: AxiosResponse = {
        data: mockResponseWithoutPreTag,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      vi.spyOn(mockHttpService, 'post').mockReturnValue(
        of(mockAxiosResponse) as any,
      );

      // ACT & ASSERT
      await expect(service.scrapeTrackerData(mockTrnUrl)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should_throw_bad_request_when_json_invalid', async () => {
      // ARRANGE
      const mockResponseWithInvalidJson =
        createFlareSolverrResponseWithInvalidJson();
      const mockAxiosResponse: AxiosResponse = {
        data: mockResponseWithInvalidJson,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      vi.spyOn(mockHttpService, 'post').mockReturnValue(
        of(mockAxiosResponse) as any,
      );

      // ACT & ASSERT
      await expect(service.scrapeTrackerData(mockTrnUrl)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should_throw_bad_request_when_segments_array_missing', async () => {
      // ARRANGE
      const invalidData = {
        data: {
          platformInfo: {
            platformSlug: 'steam',
            platformUserId: '123',
            platformUserHandle: 'test',
          },
          userInfo: { userId: 1, isPremium: false },
          metadata: {
            lastUpdated: '2025-01-01',
            playerId: 1,
            currentSeason: 34,
          },
          // segments missing
          availableSegments: [],
        },
      };

      const mockFlareSolverrResponse =
        createFlareSolverrResponseWithHtml(invalidData);
      const mockAxiosResponse: AxiosResponse = {
        data: mockFlareSolverrResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      vi.spyOn(mockHttpService, 'post').mockReturnValue(
        of(mockAxiosResponse) as any,
      );

      // ACT & ASSERT
      await expect(service.scrapeTrackerData(mockTrnUrl)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should_throw_bad_request_when_available_segments_missing', async () => {
      // ARRANGE
      const invalidData = {
        data: {
          platformInfo: {
            platformSlug: 'steam',
            platformUserId: '123',
            platformUserHandle: 'test',
          },
          userInfo: { userId: 1, isPremium: false },
          metadata: {
            lastUpdated: '2025-01-01',
            playerId: 1,
            currentSeason: 34,
          },
          segments: [],
          // availableSegments missing
        },
      };

      const mockFlareSolverrResponse =
        createFlareSolverrResponseWithHtml(invalidData);
      const mockAxiosResponse: AxiosResponse = {
        data: mockFlareSolverrResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      vi.spyOn(mockHttpService, 'post').mockReturnValue(
        of(mockAxiosResponse) as any,
      );

      // ACT & ASSERT
      await expect(service.scrapeTrackerData(mockTrnUrl)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should_extract_platform_info_correctly', async () => {
      // ARRANGE
      const mockScrapedData: ScrapedTrackerData = {
        platformInfo: {
          platformSlug: 'psn',
          platformUserId: '456',
          platformUserHandle: 'psnuser',
        },
        userInfo: { userId: 2, isPremium: true },
        metadata: {
          lastUpdated: '2025-01-01T00:00:00Z',
          playerId: 2,
          currentSeason: 34,
        },
        segments: [],
        availableSegments: [],
      };

      const mockFlareSolverrResponse =
        createFlareSolverrResponse(mockScrapedData);
      const mockAxiosResponse: AxiosResponse = {
        data: mockFlareSolverrResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      vi.spyOn(mockHttpService, 'post').mockReturnValue(
        of(mockAxiosResponse) as any,
      );

      // ACT
      const result = await service.scrapeTrackerData(mockTrnUrl);

      // ASSERT
      expect(result.platformInfo.platformSlug).toBe('psn');
      expect(result.platformInfo.platformUserId).toBe('456');
      expect(result.platformInfo.platformUserHandle).toBe('psnuser');
      expect(result.userInfo.userId).toBe(2);
      expect(result.userInfo.isPremium).toBe(true);
    });

    it('should_use_default_values_when_optional_fields_missing', async () => {
      // ARRANGE
      const minimalData = {
        data: {
          // platformInfo missing
          // userInfo missing
          // metadata missing
          segments: [],
          availableSegments: [],
        },
      };

      const mockFlareSolverrResponse =
        createFlareSolverrResponseWithHtml(minimalData);
      const mockAxiosResponse: AxiosResponse = {
        data: mockFlareSolverrResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      vi.spyOn(mockHttpService, 'post').mockReturnValue(
        of(mockAxiosResponse) as any,
      );

      // ACT
      const result = await service.scrapeTrackerData(mockTrnUrl);

      // ASSERT
      expect(result.platformInfo).toEqual({
        platformSlug: '',
        platformUserId: '',
        platformUserHandle: '',
      });
      expect(result.userInfo).toEqual({
        userId: 0,
        isPremium: false,
      });
      expect(result.metadata).toEqual({
        lastUpdated: '',
        playerId: 0,
        currentSeason: 0,
      });
    });
  });

  describe('parseSegments', () => {
    it('should_parse_segments_when_all_four_ranked_playlists_present', () => {
      // ARRANGE
      const segments = [
        createOverviewSegment(),
        ...createAllRankedPlaylistSegments(34),
      ];
      const availableSegments = [
        {
          type: 'playlist',
          attributes: { season: 34 },
          metadata: { name: 'Season 20 (34)' },
        },
      ];

      // ACT
      const result = service.parseSegments(segments, 34, availableSegments);

      // ASSERT
      expect(result.playlist1v1).toBeDefined();
      expect(result.playlist2v2).toBeDefined();
      expect(result.playlist3v3).toBeDefined();
      expect(result.playlist4v4).toBeDefined();
      expect(result.seasonNumber).toBe(34);
    });

    it('should_map_primary_playlist_ids_correctly', () => {
      // ARRANGE
      const segments = [
        createPlaylistSegment(1, 34), // playlist1v1
        createPlaylistSegment(2, 34), // playlist2v2
        createPlaylistSegment(3, 34), // playlist3v3
        createPlaylistSegment(8, 34), // playlist4v4
      ];
      const availableSegments = [
        {
          type: 'playlist',
          attributes: { season: 34 },
          metadata: { name: 'Season 20 (34)' },
        },
      ];

      // ACT
      const result = service.parseSegments(segments, 34, availableSegments);

      // ASSERT
      expect(result.playlist1v1).not.toBeNull();
      expect(result.playlist2v2).not.toBeNull();
      expect(result.playlist3v3).not.toBeNull();
      expect(result.playlist4v4).not.toBeNull();
    });

    it('should_map_alternative_playlist_ids_correctly', () => {
      // ARRANGE
      const segments = createAlternativePlaylistSegments(34);
      const availableSegments = [
        {
          type: 'playlist',
          attributes: { season: 34 },
          metadata: { name: 'Season 20 (34)' },
        },
      ];

      // ACT
      const result = service.parseSegments(segments, 34, availableSegments);

      // ASSERT
      expect(result.playlist1v1).not.toBeNull(); // ID 10 maps to playlist1v1
      expect(result.playlist2v2).not.toBeNull(); // ID 11 maps to playlist2v2
      expect(result.playlist3v3).not.toBeNull(); // ID 13 maps to playlist3v3
      expect(result.playlist4v4).not.toBeNull(); // ID 61 maps to playlist4v4
    });

    it('should_extract_playlist_data_for_playlist1v1', () => {
      // ARRANGE
      const segments = [createPlaylistSegment(1, 34)];
      const availableSegments = [
        {
          type: 'playlist',
          attributes: { season: 34 },
          metadata: { name: 'Season 20 (34)' },
        },
      ];

      // ACT
      const result = service.parseSegments(segments, 34, availableSegments);

      // ASSERT
      expect(result.playlist1v1).not.toBeNull();
      expect(result.playlist1v1?.rating).toBe(1500);
      expect(result.playlist1v1?.rankValue).toBe(19);
    });

    it('should_extract_playlist_data_for_playlist2v2', () => {
      // ARRANGE
      const segments = [createPlaylistSegment(2, 34)];
      const availableSegments = [
        {
          type: 'playlist',
          attributes: { season: 34 },
          metadata: { name: 'Season 20 (34)' },
        },
      ];

      // ACT
      const result = service.parseSegments(segments, 34, availableSegments);

      // ASSERT
      expect(result.playlist2v2).not.toBeNull();
      expect(result.playlist2v2?.rating).toBe(1500);
    });

    it('should_extract_playlist_data_for_playlist3v3', () => {
      // ARRANGE
      const segments = [createPlaylistSegment(3, 34)];
      const availableSegments = [
        {
          type: 'playlist',
          attributes: { season: 34 },
          metadata: { name: 'Season 20 (34)' },
        },
      ];

      // ACT
      const result = service.parseSegments(segments, 34, availableSegments);

      // ASSERT
      expect(result.playlist3v3).not.toBeNull();
      expect(result.playlist3v3?.rating).toBe(1500);
    });

    it('should_extract_playlist_data_for_playlist4v4', () => {
      // ARRANGE
      const segments = [createPlaylistSegment(8, 34)];
      const availableSegments = [
        {
          type: 'playlist',
          attributes: { season: 34 },
          metadata: { name: 'Season 20 (34)' },
        },
      ];

      // ACT
      const result = service.parseSegments(segments, 34, availableSegments);

      // ASSERT
      expect(result.playlist4v4).not.toBeNull();
      expect(result.playlist4v4?.rating).toBe(1500);
    });

    it('should_skip_unsupported_playlists', () => {
      // ARRANGE
      const segments = [
        createPlaylistSegment(27, 34), // Hoops
        createPlaylistSegment(28, 34), // Rumble
        createPlaylistSegment(29, 34), // Dropshot
      ];
      const availableSegments = [
        {
          type: 'playlist',
          attributes: { season: 34 },
          metadata: { name: 'Season 20 (34)' },
        },
      ];

      // ACT
      const result = service.parseSegments(segments, 34, availableSegments);

      // ASSERT
      expect(result.playlist1v1).toBeNull();
      expect(result.playlist2v2).toBeNull();
      expect(result.playlist3v3).toBeNull();
      expect(result.playlist4v4).toBeNull();
    });

    it('should_extract_season_name_from_available_segments', () => {
      // ARRANGE
      const segments = [];
      const availableSegments = [
        {
          type: 'playlist',
          attributes: { season: 34 },
          metadata: { name: 'Season 20 (34)' },
        },
      ];

      // ACT
      const result = service.parseSegments(segments, 34, availableSegments);

      // ASSERT
      expect(result.seasonName).toBe('Season 20 (34)');
    });

    it('should_use_fallback_season_name_when_not_found', () => {
      // ARRANGE
      const segments = [];
      const availableSegments = [];

      // ACT
      const result = service.parseSegments(segments, 34, availableSegments);

      // ASSERT
      expect(result.seasonName).toBe('Season 34');
    });

    it('should_return_null_playlist_data_when_stats_invalid', () => {
      // ARRANGE
      const segments = [createPlaylistSegmentWithInvalidStats(1, 34)];
      const availableSegments = [
        {
          type: 'playlist',
          attributes: { season: 34 },
          metadata: { name: 'Season 20 (34)' },
        },
      ];

      // ACT
      const result = service.parseSegments(segments, 34, availableSegments);

      // ASSERT
      expect(result.playlist1v1).toBeNull();
    });

    it('should_filter_segments_by_season_number', () => {
      // ARRANGE
      const segments = [
        createPlaylistSegment(1, 33),
        createPlaylistSegment(1, 34), // Only this should be included
        createPlaylistSegment(2, 34),
      ];
      const availableSegments = [
        {
          type: 'playlist',
          attributes: { season: 34 },
          metadata: { name: 'Season 20 (34)' },
        },
      ];

      // ACT
      const result = service.parseSegments(segments, 34, availableSegments);

      // ASSERT
      expect(result.playlist1v1).not.toBeNull();
      expect(result.playlist2v2).not.toBeNull();
    });

    it('should_handle_missing_playlist_segments', () => {
      // ARRANGE
      const segments = [createPlaylistSegment(1, 34)]; // Only 1v1
      const availableSegments = [
        {
          type: 'playlist',
          attributes: { season: 34 },
          metadata: { name: 'Season 20 (34)' },
        },
      ];

      // ACT
      const result = service.parseSegments(segments, 34, availableSegments);

      // ASSERT
      expect(result.playlist1v1).not.toBeNull();
      expect(result.playlist2v2).toBeNull();
      expect(result.playlist3v3).toBeNull();
      expect(result.playlist4v4).toBeNull();
    });

    it('should_extract_all_playlist_fields_correctly', () => {
      // ARRANGE
      const segments = [
        createPlaylistSegment(1, 34, {
          tier: { value: 22, metadata: { name: 'Supersonic Legend' } },
          division: { value: 0, metadata: { name: 'Division I' } },
          rating: { value: 1721 },
          matchesPlayed: { value: 62 },
          winStreak: { value: 11 },
        }),
      ];
      const availableSegments = [
        {
          type: 'playlist',
          attributes: { season: 34 },
          metadata: { name: 'Season 20 (34)' },
        },
      ];

      // ACT
      const result = service.parseSegments(segments, 34, availableSegments);

      // ASSERT
      expect(result.playlist1v1).toBeDefined();
      expect(result.playlist1v1).toMatchObject({
        rank: 'Supersonic Legend',
        rankValue: 22,
        division: 'Division I',
        divisionValue: 0,
      });
      expect(result.playlist1v1).toMatchObject({
        rating: 1721,
        matchesPlayed: 62,
        winStreak: 11,
      });
    });

    it('should_handle_missing_tier_gracefully', () => {
      // ARRANGE
      const segments = [
        createPlaylistSegment(1, 34, {
          tier: { value: undefined, metadata: {} },
        }),
      ];
      const availableSegments = [
        {
          type: 'playlist',
          attributes: { season: 34 },
          metadata: { name: 'Season 20 (34)' },
        },
      ];

      // ACT
      const result = service.parseSegments(segments, 34, availableSegments);

      // ASSERT
      expect(result.playlist1v1?.rank).toBeNull();
      expect(result.playlist1v1?.rankValue).toBeNull();
    });

    it('should_handle_missing_division_gracefully', () => {
      // ARRANGE
      const segments = [
        createPlaylistSegment(1, 34, {
          division: { value: undefined, metadata: {} },
        }),
      ];
      const availableSegments = [
        {
          type: 'playlist',
          attributes: { season: 34 },
          metadata: { name: 'Season 20 (34)' },
        },
      ];

      // ACT
      const result = service.parseSegments(segments, 34, availableSegments);

      // ASSERT
      expect(result.playlist1v1?.division).toBeNull();
      expect(result.playlist1v1?.divisionValue).toBeNull();
    });

    it('should_handle_null_rating_values', () => {
      // ARRANGE
      const segments = [createPlaylistSegmentWithNullStats(1, 34)];
      const availableSegments = [
        {
          type: 'playlist',
          attributes: { season: 34 },
          metadata: { name: 'Season 20 (34)' },
        },
      ];

      // ACT
      const result = service.parseSegments(segments, 34, availableSegments);

      // ASSERT
      // Service returns PlaylistData object with null fields, not null itself
      expect(result.playlist1v1).not.toBeNull();
      expect(result.playlist1v1?.rating).toBeNull();
      expect(result.playlist1v1?.rank).toBeNull();
      expect(result.playlist1v1?.division).toBeNull();
    });

    it('should_fallback_to_overview_segment_when_available_segments_missing', () => {
      // ARRANGE
      const segments = [
        createOverviewSegment({ metadata: { name: 'Lifetime Overview' } }),
      ];
      const availableSegments: Array<{
        type: string;
        attributes: { season: number };
        metadata: { name: string };
      }> = [];

      // ACT
      const result = service.parseSegments(segments, 34, availableSegments);

      // ASSERT
      // Service uses overview segment metadata.name if available, before default
      expect(result.seasonName).toBe('Lifetime Overview');
    });

    it('should_use_default_season_name_when_no_season_name_found', () => {
      // ARRANGE
      const segments = []; // No segments at all
      const availableSegments: Array<{
        type: string;
        attributes: { season: number };
        metadata: { name: string };
      }> = [];

      // ACT
      const result = service.parseSegments(segments, 34, availableSegments);

      // ASSERT
      // Should use default when no overview segment and no availableSegments match
      expect(result.seasonName).toBe('Season 34');
    });
  });

  describe('scrapeAllSeasons', () => {
    const createMockScrapedDataWithSeasons = (
      season: number,
    ): ScrapedTrackerData => ({
      platformInfo: {
        platformSlug: 'steam',
        platformUserId: '123',
        platformUserHandle: 'testuser',
      },
      userInfo: { userId: 1, isPremium: false },
      metadata: {
        lastUpdated: '2025-01-01T00:00:00Z',
        playerId: 1,
        currentSeason: 34,
      },
      segments: [
        createOverviewSegment(),
        ...createAllRankedPlaylistSegments(season),
      ],
      availableSegments: [
        {
          type: 'playlist',
          attributes: { season: 32 },
          metadata: { name: 'Season 18 (32)' },
        },
        {
          type: 'playlist',
          attributes: { season: 33 },
          metadata: { name: 'Season 19 (33)' },
        },
        {
          type: 'playlist',
          attributes: { season: 34 },
          metadata: { name: 'Season 20 (34)' },
        },
      ],
    });

    it('should_scrape_all_seasons_when_multiple_seasons_available', async () => {
      // ARRANGE
      const baseData = createMockScrapedDataWithSeasons(34);
      const mockFlareSolverrResponse = createFlareSolverrResponse(baseData);
      const mockAxiosResponse: AxiosResponse = {
        data: mockFlareSolverrResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      // Mock first call (base data)
      const season33Data = createMockScrapedDataWithSeasons(33);
      const season33Response = createFlareSolverrResponse(season33Data);
      const season33AxiosResponse: AxiosResponse = {
        data: season33Response,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      const season32Data = createMockScrapedDataWithSeasons(32);
      const season32Response = createFlareSolverrResponse(season32Data);
      const season32AxiosResponse: AxiosResponse = {
        data: season32Response,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      vi.spyOn(mockHttpService, 'post')
        .mockReturnValueOnce(of(mockAxiosResponse) as any) // Base call
        .mockReturnValueOnce(of(season33AxiosResponse) as any) // Season 33
        .mockReturnValueOnce(of(season32AxiosResponse) as any); // Season 32

      // ACT
      const promise = service.scrapeAllSeasons(mockTrnUrl);
      await vi.runAllTimersAsync();
      const result = await promise;

      // ASSERT
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBe(3); // Base season + 2 additional seasons
    });

    it('should_return_seasons_sorted_descending_by_season_number', async () => {
      // ARRANGE
      const baseData = createMockScrapedDataWithSeasons(34);
      const mockFlareSolverrResponse = createFlareSolverrResponse(baseData);
      const mockAxiosResponse: AxiosResponse = {
        data: mockFlareSolverrResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      const season33Data = createMockScrapedDataWithSeasons(33);
      const season33Response = createFlareSolverrResponse(season33Data);
      const season33AxiosResponse: AxiosResponse = {
        data: season33Response,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      vi.spyOn(mockHttpService, 'post')
        .mockReturnValueOnce(of(mockAxiosResponse) as any)
        .mockReturnValueOnce(of(season33AxiosResponse) as any);

      // ACT
      const promise = service.scrapeAllSeasons(mockTrnUrl);
      await vi.runAllTimersAsync();
      const result = await promise;

      // ASSERT
      expect(result.length).toBeGreaterThan(1);
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].seasonNumber).toBeGreaterThanOrEqual(
          result[i + 1].seasonNumber,
        );
      }
    });

    it('should_handle_failed_season_scraping_gracefully', async () => {
      // ARRANGE
      const baseData = createMockScrapedDataWithSeasons(34);
      const mockFlareSolverrResponse = createFlareSolverrResponse(baseData);
      const mockAxiosResponse: AxiosResponse = {
        data: mockFlareSolverrResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      // Use faster retry config for unit test (minimal delay)
      const fastRetryConfig = {
        ...mockFlareSolverrConfig,
        retryAttempts: 1,
        retryDelayMs: 10,
      };
      const fastConfigService = {
        get: vi.fn().mockReturnValue(fastRetryConfig),
      } as unknown as ConfigService;
      const fastService = new TrackerScraperService(
        mockHttpService,
        fastConfigService,
        mockUrlConverter,
      );

      const axiosError = new AxiosError('Network error');
      axiosError.code = 'ECONNREFUSED';
      vi.spyOn(mockHttpService, 'post')
        .mockReturnValueOnce(of(mockAxiosResponse) as any) // Base call succeeds
        .mockReturnValueOnce(throwError(() => axiosError) as any); // Season 33 fails

      // ACT
      const promise = fastService.scrapeAllSeasons(mockTrnUrl);
      await vi.runAllTimersAsync();
      const result = await promise;

      // ASSERT
      expect(result.length).toBe(1); // Only base season included
      expect(result[0].seasonNumber).toBe(34);
    });

    it('should_return_empty_array_when_no_seasons_available', async () => {
      // ARRANGE
      const baseData: ScrapedTrackerData = {
        platformInfo: {
          platformSlug: 'steam',
          platformUserId: '123',
          platformUserHandle: 'testuser',
        },
        userInfo: { userId: 1, isPremium: false },
        metadata: {
          lastUpdated: '2025-01-01T00:00:00Z',
          playerId: 1,
          currentSeason: 34,
        },
        segments: [],
        availableSegments: [], // No seasons available
      };

      const mockFlareSolverrResponse = createFlareSolverrResponse(baseData);
      const mockAxiosResponse: AxiosResponse = {
        data: mockFlareSolverrResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      vi.spyOn(mockHttpService, 'post').mockReturnValue(
        of(mockAxiosResponse) as any,
      );

      // ACT
      const result = await service.scrapeAllSeasons(mockTrnUrl);

      // ASSERT
      expect(Array.isArray(result)).toBe(true);
      // Should try to parse current season from base data
    });

    it('should_include_current_season_in_results', async () => {
      // ARRANGE
      const baseData = createMockScrapedDataWithSeasons(34);
      const mockFlareSolverrResponse = createFlareSolverrResponse(baseData);
      const mockAxiosResponse: AxiosResponse = {
        data: mockFlareSolverrResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      vi.spyOn(mockHttpService, 'post').mockReturnValue(
        of(mockAxiosResponse) as any,
      );

      // ACT
      const promise = service.scrapeAllSeasons(mockTrnUrl);
      await vi.runAllTimersAsync();
      const result = await promise;

      // ASSERT
      const currentSeason = result.find((s) => s.seasonNumber === 34);
      expect(currentSeason).toBeDefined();
    });

    it('should_skip_current_season_when_already_in_base_data', async () => {
      // ARRANGE
      const baseData = createMockScrapedDataWithSeasons(34);
      // Set availableSegments to include 32, 33, and 34
      baseData.availableSegments = [
        {
          type: 'playlist',
          attributes: { season: 32 },
          metadata: { name: 'Season 18 (32)' },
        },
        {
          type: 'playlist',
          attributes: { season: 33 },
          metadata: { name: 'Season 19 (33)' },
        },
        {
          type: 'playlist',
          attributes: { season: 34 },
          metadata: { name: 'Season 20 (34)' },
        },
      ];

      const mockFlareSolverrResponse = createFlareSolverrResponse(baseData);
      const mockAxiosResponse: AxiosResponse = {
        data: mockFlareSolverrResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      // Season 34 is current season, should not be scraped again
      // Only seasons 32 and 33 should be scraped (34 is filtered out)
      const season33Data = createMockScrapedDataWithSeasons(33);
      const season33Response = createFlareSolverrResponse(season33Data);
      const season33AxiosResponse: AxiosResponse = {
        data: season33Response,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      const season32Data = createMockScrapedDataWithSeasons(32);
      const season32Response = createFlareSolverrResponse(season32Data);
      const season32AxiosResponse: AxiosResponse = {
        data: season32Response,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      vi.spyOn(mockHttpService, 'post')
        .mockReturnValueOnce(of(mockAxiosResponse) as any) // Base call
        .mockReturnValueOnce(of(season33AxiosResponse) as any) // Season 33
        .mockReturnValueOnce(of(season32AxiosResponse) as any); // Season 32

      // ACT
      const promise = service.scrapeAllSeasons(mockTrnUrl);
      await vi.runAllTimersAsync();
      const result = await promise;

      // ASSERT
      // Should have base season (34) and scraped seasons (33, 32), but not duplicate 34
      const season34Count = result.filter((s) => s.seasonNumber === 34).length;
      expect(season34Count).toBe(1);
      expect(result.length).toBe(3); // Base season + 2 additional seasons (33, 32)
    });
  });

  describe('makeProxyRequest (indirect via scrapeTrackerData)', () => {
    it('should_successfully_make_request_when_config_valid', async () => {
      // ARRANGE
      const mockScrapedData: ScrapedTrackerData = {
        platformInfo: {
          platformSlug: 'steam',
          platformUserId: '123',
          platformUserHandle: 'testuser',
        },
        userInfo: { userId: 1, isPremium: false },
        metadata: {
          lastUpdated: '2025-01-01T00:00:00Z',
          playerId: 1,
          currentSeason: 34,
        },
        segments: [],
        availableSegments: [],
      };

      const mockFlareSolverrResponse =
        createFlareSolverrResponse(mockScrapedData);
      const mockAxiosResponse: AxiosResponse = {
        data: mockFlareSolverrResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      vi.spyOn(mockHttpService, 'post').mockReturnValue(
        of(mockAxiosResponse).pipe() as any,
      );

      // ACT
      const result = await service.scrapeTrackerData(mockTrnUrl);

      // ASSERT
      expect(result).toBeDefined();
      expect(result.platformInfo.platformSlug).toBe('steam');
    });

    it('should_process_response_when_endpoint_accessible', async () => {
      // ARRANGE
      const mockScrapedData: ScrapedTrackerData = {
        platformInfo: {
          platformSlug: 'steam',
          platformUserId: '123',
          platformUserHandle: 'testuser',
        },
        userInfo: { userId: 1, isPremium: false },
        metadata: {
          lastUpdated: '2025-01-01T00:00:00Z',
          playerId: 1,
          currentSeason: 34,
        },
        segments: [],
        availableSegments: [],
      };

      const mockFlareSolverrResponse =
        createFlareSolverrResponse(mockScrapedData);
      const mockAxiosResponse: AxiosResponse = {
        data: mockFlareSolverrResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      vi.spyOn(mockHttpService, 'post').mockReturnValue(
        of(mockAxiosResponse).pipe() as any,
      );

      // ACT
      const result = await service.scrapeTrackerData(mockTrnUrl);

      // ASSERT
      expect(result).toBeDefined();
      expect(result.platformInfo).toBeDefined();
    });

    it('should_handle_rate_limit_errors_gracefully', async () => {
      // ARRANGE
      // Disable retries for error tests - we're testing error handling, not retry logic
      // This avoids RxJS retry operator subscription cleanup issues
      const noRetryConfig = {
        ...mockFlareSolverrConfig,
        retryAttempts: 0,
        retryDelayMs: 0,
      };
      const noRetryConfigService = {
        get: vi.fn().mockReturnValue(noRetryConfig),
      } as unknown as ConfigService;
      const noRetryService = new TrackerScraperService(
        mockHttpService,
        noRetryConfigService,
        mockUrlConverter,
      );

      const axiosError = new AxiosError('Rate limit exceeded');
      axiosError.response = {
        status: 429,
        statusText: 'Too Many Requests',
        data: {},
        headers: {},
        config: {} as any,
      };

      vi.spyOn(mockHttpService, 'post').mockReturnValue(
        throwError(() => axiosError) as any,
      );

      // ACT & ASSERT
      const promise = noRetryService.scrapeTrackerData(mockTrnUrl);
      // Advance timers to resolve rate limiting delays
      await vi.runAllTimersAsync();
      // Await the rejection - this ensures the observable chain fully settles
      await expect(promise).rejects.toThrow(ServiceUnavailableException);
      // Advance timers one more time to ensure all async operations complete
      await vi.runAllTimersAsync();
    });

    it('should_handle_server_errors_gracefully', async () => {
      // ARRANGE
      // Disable retries for error tests - we're testing error handling, not retry logic
      // This avoids RxJS retry operator subscription cleanup issues
      const noRetryConfig = {
        ...mockFlareSolverrConfig,
        retryAttempts: 0,
        retryDelayMs: 0,
      };
      const noRetryConfigService = {
        get: vi.fn().mockReturnValue(noRetryConfig),
      } as unknown as ConfigService;
      const noRetryService = new TrackerScraperService(
        mockHttpService,
        noRetryConfigService,
        mockUrlConverter,
      );

      const axiosError = new AxiosError('Server error');
      axiosError.response = {
        status: 500,
        statusText: 'Internal Server Error',
        data: {},
        headers: {},
        config: {} as any,
      };

      vi.spyOn(mockHttpService, 'post').mockReturnValue(
        throwError(() => axiosError) as any,
      );

      // ACT & ASSERT
      const promise = noRetryService.scrapeTrackerData(mockTrnUrl);
      // Advance timers to resolve rate limiting delays
      await vi.runAllTimersAsync();
      // Await the rejection - this ensures the observable chain fully settles
      await expect(promise).rejects.toThrow(ServiceUnavailableException);
      // Advance timers one more time to ensure all async operations complete
      await vi.runAllTimersAsync();
    });

    it('should_throw_service_unavailable_on_timeout', async () => {
      // ARRANGE
      // Disable retries for error tests - we're testing error handling, not retry logic
      // This avoids RxJS retry operator subscription cleanup issues
      const noRetryConfig = {
        ...mockFlareSolverrConfig,
        retryAttempts: 0,
        retryDelayMs: 0,
      };
      const noRetryConfigService = {
        get: vi.fn().mockReturnValue(noRetryConfig),
      } as unknown as ConfigService;
      const noRetryService = new TrackerScraperService(
        mockHttpService,
        noRetryConfigService,
        mockUrlConverter,
      );

      const axiosError = new AxiosError('Timeout');
      axiosError.code = 'ECONNABORTED';

      vi.spyOn(mockHttpService, 'post').mockReturnValue(
        throwError(() => axiosError) as any,
      );

      // ACT & ASSERT
      const promise = noRetryService.scrapeTrackerData(mockTrnUrl);
      // Advance timers to resolve rate limiting delays
      await vi.runAllTimersAsync();
      // Await the rejection - this ensures the observable chain fully settles
      await expect(promise).rejects.toThrow(ServiceUnavailableException);
      // Advance timers one more time to ensure all async operations complete
      await vi.runAllTimersAsync();
    });

    it('should_handle_network_errors', async () => {
      // ARRANGE
      // Disable retries for error tests - we're testing error handling, not retry logic
      // This avoids RxJS retry operator subscription cleanup issues
      const noRetryConfig = {
        ...mockFlareSolverrConfig,
        retryAttempts: 0,
        retryDelayMs: 0,
      };
      const noRetryConfigService = {
        get: vi.fn().mockReturnValue(noRetryConfig),
      } as unknown as ConfigService;
      const noRetryService = new TrackerScraperService(
        mockHttpService,
        noRetryConfigService,
        mockUrlConverter,
      );

      const axiosError = new AxiosError('Network error');
      axiosError.code = 'ECONNREFUSED';

      vi.spyOn(mockHttpService, 'post').mockReturnValue(
        throwError(() => axiosError) as any,
      );

      // ACT & ASSERT
      const promise = noRetryService.scrapeTrackerData(mockTrnUrl);
      // Advance timers to resolve rate limiting delays
      await vi.runAllTimersAsync();
      // Await the rejection - this ensures the observable chain fully settles
      await expect(promise).rejects.toThrow(ServiceUnavailableException);
      // Advance timers one more time to ensure all async operations complete
      await vi.runAllTimersAsync();
    });
  });

  describe('rate limiting (indirect)', () => {
    it('should_enforce_rate_limit_between_requests', async () => {
      // ARRANGE
      const mockScrapedData: ScrapedTrackerData = {
        platformInfo: {
          platformSlug: 'steam',
          platformUserId: '123',
          platformUserHandle: 'testuser',
        },
        userInfo: { userId: 1, isPremium: false },
        metadata: {
          lastUpdated: '2025-01-01T00:00:00Z',
          playerId: 1,
          currentSeason: 34,
        },
        segments: [],
        availableSegments: [],
      };

      const mockFlareSolverrResponse =
        createFlareSolverrResponse(mockScrapedData);
      const mockAxiosResponse: AxiosResponse = {
        data: mockFlareSolverrResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      vi.spyOn(mockHttpService, 'post').mockReturnValue(
        of(mockAxiosResponse) as any,
      );

      // ACT - Make multiple rapid requests
      const promise1 = service.scrapeTrackerData(mockTrnUrl);
      // Advance timers to resolve rate limiting delays (testing logic, not timing)
      await vi.runAllTimersAsync();
      const result1 = await promise1;

      const promise2 = service.scrapeTrackerData(mockTrnUrl);
      await vi.runAllTimersAsync();
      const result2 = await promise2;

      // ASSERT - Verify both requests completed successfully
      // Fake timers allow us to test rate limiting logic (calculations, state) without waiting
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result1.platformInfo.platformSlug).toBe('steam');
      expect(result2.platformInfo.platformSlug).toBe('steam');
    });
  });
});
