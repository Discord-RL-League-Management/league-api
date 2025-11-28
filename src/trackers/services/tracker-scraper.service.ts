import {
  Injectable,
  Logger,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, timeout, retry, catchError, throwError } from 'rxjs';
import { AxiosError, AxiosRequestConfig } from 'axios';
import * as Joi from 'joi';
import { TrackerUrlConverterService } from './tracker-url-converter.service';
import {
  ScrapedTrackerData,
  SeasonData,
  PlaylistData,
  TrackerSegment,
} from '../interfaces/scraper.interfaces';
import { trackerSegmentStatsSchema } from '../schemas/tracker-segment.schema';

/**
 * Playlist ID mapping from tracker.gg API to our internal representation
 * Based on user clarification: ranked 1v1 is 1, ranked 2v2 is 2, ranked 3v3 is 3, ranked 4v4 is 8
 * Also supporting alternative IDs that may appear in API responses: 10, 11, 13, 61
 */
const PLAYLIST_ID_MAP: Record<
  number,
  'playlist1v1' | 'playlist2v2' | 'playlist3v3' | 'playlist4v4'
> = {
  1: 'playlist1v1', // Ranked Duel 1v1 (primary ID)
  2: 'playlist2v2', // Ranked Doubles 2v2 (primary ID)
  3: 'playlist3v3', // Ranked Standard 3v3 (primary ID)
  8: 'playlist4v4', // Ranked 4v4 Quads (primary ID)
  // Alternative IDs that may appear in some API responses
  10: 'playlist1v1', // Ranked Duel 1v1 (alternative ID)
  11: 'playlist2v2', // Ranked Doubles 2v2 (alternative ID)
  13: 'playlist3v3', // Ranked Standard 3v3 (alternative ID)
  61: 'playlist4v4', // Ranked 4v4 Quads (alternative ID)
};

@Injectable()
export class TrackerScraperService {
  private readonly logger = new Logger(TrackerScraperService.name);
  private readonly zyteApiKey: string;
  private readonly zyteProxyHost: string;
  private readonly zyteProxyPort: number;
  private readonly zyteTimeout: number;
  private readonly zyteRetryAttempts: number;
  private readonly zyteRetryDelay: number;
  private readonly rateLimitPerMinute: number;
  private lastRequestTime: number = 0;
  private requestCount: number = 0;
  private rateLimitWindowStart: number = Date.now();

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly urlConverter: TrackerUrlConverterService,
  ) {
    const zyteConfig = this.configService.get('zyte');
    this.zyteApiKey = zyteConfig.apiKey;
    this.zyteProxyHost = zyteConfig.proxyHost;
    this.zyteProxyPort = zyteConfig.proxyPort;
    this.zyteTimeout = zyteConfig.timeoutMs;
    this.zyteRetryAttempts = zyteConfig.retryAttempts;
    this.zyteRetryDelay = zyteConfig.retryDelayMs;
    this.rateLimitPerMinute = zyteConfig.rateLimitPerMinute;
  }

  /**
   * Scrape tracker data for a single season (or current season if no season specified)
   * @param trnUrl - TRN profile URL
   * @param seasonNumber - Optional season number, if not provided uses current season
   */
  async scrapeTrackerData(
    trnUrl: string,
    seasonNumber?: number,
  ): Promise<ScrapedTrackerData> {
    try {
      // Convert TRN URL to tracker.gg API URL
      const apiUrl = this.urlConverter.convertTrnUrlToApiUrl(trnUrl);

      // Add season parameter if provided
      const urlWithSeason = seasonNumber
        ? `${apiUrl}?season=${seasonNumber}`
        : apiUrl;

      this.logger.debug(`Scraping tracker data from: ${urlWithSeason}`);

      // Make request through Zyte proxy
      const response = await this.makeProxyRequest(urlWithSeason);

      // Parse and validate response
      const data = this.parseApiResponse(response);

      this.logger.debug(
        `Successfully scraped data: ${data.segments.length} segments, ${data.availableSegments.length} available seasons`,
      );

      return data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to scrape tracker data: ${errorMessage}`,
        error,
      );
      if (
        error instanceof BadRequestException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }
      throw new ServiceUnavailableException(
        `Failed to scrape tracker data: ${errorMessage}`,
      );
    }
  }

  /**
   * Scrape all available seasons for a tracker
   * @param trnUrl - TRN profile URL
   */
  async scrapeAllSeasons(trnUrl: string): Promise<SeasonData[]> {
    try {
      // Get base data to find available seasons
      const baseData = await this.scrapeTrackerData(trnUrl);

      // Extract available season numbers
      const availableSeasons = baseData.availableSegments
        .filter((seg) => seg.type === 'playlist' && seg.attributes.season)
        .map((seg) => seg.attributes.season)
        .filter((season): season is number => typeof season === 'number')
        .sort((a, b) => b - a); // Sort descending (newest first)

      this.logger.debug(
        `Found ${availableSeasons.length} available seasons for scraping`,
      );

      if (availableSeasons.length === 0) {
        this.logger.warn('No seasons available for scraping');
        // Still try to parse current season from base data
        const currentSeasonData = this.parseSegments(
          baseData.segments,
          baseData.metadata.currentSeason,
          baseData.availableSegments,
        );
        return currentSeasonData ? [currentSeasonData] : [];
      }

      // Process current season from base data if available (avoid extra API call)
      const currentSeason = baseData.metadata.currentSeason;
      const currentSeasonData = currentSeason
        ? this.parseSegments(
            baseData.segments,
            currentSeason,
            baseData.availableSegments,
          )
        : null;

      // Filter out current season from availableSeasons to avoid duplicate scraping
      const seasonsToScrape = availableSeasons.filter(
        (season) => season !== currentSeason,
      );

      // Scrape each season (excluding current season which we already have)
      const seasonDataPromises = seasonsToScrape.map(async (seasonNum) => {
        try {
          await this.enforceRateLimit();
          const seasonData = await this.scrapeTrackerData(trnUrl, seasonNum);
          return this.parseSegments(
            seasonData.segments,
            seasonNum,
            baseData.availableSegments,
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Failed to scrape season ${seasonNum}: ${errorMessage}`,
          );
          // Return null for failed seasons, we'll filter them out
          return null;
        }
      });

      const seasonResults = await Promise.all(seasonDataPromises);

      // Filter out null results (failed seasons)
      const validSeasons = seasonResults.filter(
        (season): season is SeasonData => season !== null,
      );

      // Add current season data if we have it
      if (currentSeasonData) {
        validSeasons.push(currentSeasonData);
      }

      // Sort by season number descending (newest first)
      validSeasons.sort((a, b) => b.seasonNumber - a.seasonNumber);

      this.logger.log(
        `Successfully scraped ${validSeasons.length} of ${availableSeasons.length} seasons (including current season from base data)`,
      );

      return validSeasons;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to scrape all seasons: ${errorMessage}`, error);
      throw error;
    }
  }

  /**
   * Parse segments array into SeasonData format
   * Filters for playlist segments and groups by season
   */
  parseSegments(
    segments: TrackerSegment[],
    seasonNumber: number,
    availableSegments?: Array<{
      attributes: { season: number };
      metadata: { name: string };
    }>,
  ): SeasonData {
    // Filter for playlist segments only (not overview, playlistAverage, peak-rating)
    const playlistSegments = segments.filter(
      (seg) =>
        seg.type === 'playlist' && seg.attributes.season === seasonNumber,
    );

    // Initialize season data
    const seasonData: SeasonData = {
      seasonNumber,
      seasonName: this.extractSeasonName(
        segments,
        seasonNumber,
        availableSegments,
      ),
      playlist1v1: null,
      playlist2v2: null,
      playlist3v3: null,
      playlist4v4: null,
    };

    // Extract playlist data for each playlist type
    for (const segment of playlistSegments) {
      const playlistId = segment.attributes.playlistId;
      if (!playlistId || typeof playlistId !== 'number') {
        continue;
      }

      // Map playlistId to our field name
      const fieldName = PLAYLIST_ID_MAP[playlistId];
      if (!fieldName) {
        // Skip unsupported playlists (Hoops, Rumble, etc.)
        continue;
      }

      const playlistData = this.extractPlaylistData(segment);
      if (playlistData) {
        seasonData[fieldName] = playlistData;
      }
    }

    return seasonData;
  }

  /**
   * Extract playlist data from a segment
   */
  private extractPlaylistData(segment: TrackerSegment): PlaylistData | null {
    try {
      const stats = segment.stats;

      // Prevent runtime errors if tracker.gg API response structure changes
      const validationResult = trackerSegmentStatsSchema.validate(stats, {
        allowUnknown: true,
        stripUnknown: false,
        abortEarly: false,
      });

      if (validationResult.error) {
        const playlistId = segment.attributes?.playlistId;
        const segmentType = segment.type || 'unknown';
        const errorDetails = validationResult.error.details
          .map((detail) => detail.message)
          .join('; ');

        this.logger.warn(
          `Invalid stats structure in segment (type: ${segmentType}, playlistId: ${playlistId}): ${errorDetails}. ` +
            `This may indicate the tracker.gg API response structure has changed.`,
        );
        return null;
      }

      const tier = stats.tier;
      const division = stats.division;
      const rating = stats.rating;
      const matchesPlayed = stats.matchesPlayed;
      const winStreak = stats.winStreak;

      return {
        rank: tier?.metadata?.name || null,
        rankValue: typeof tier?.value === 'number' ? tier.value : null,
        division: division?.metadata?.name || null,
        divisionValue:
          typeof division?.value === 'number' ? division.value : null,
        rating: typeof rating?.value === 'number' ? rating.value : null,
        matchesPlayed:
          typeof matchesPlayed?.value === 'number' ? matchesPlayed.value : null,
        winStreak:
          typeof winStreak?.value === 'number' ? winStreak.value : null,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to extract playlist data: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Extract season name from segments or availableSegments
   * @param segments - All segments from the API response
   * @param seasonNumber - Season number to find name for
   * @param availableSegments - Optional availableSegments array for season names
   */
  private extractSeasonName(
    segments: TrackerSegment[],
    seasonNumber: number,
    availableSegments?: Array<{
      attributes: { season: number };
      metadata: { name: string };
    }>,
  ): string | null {
    // First, try to find season name in availableSegments
    if (availableSegments) {
      const seasonSegment = availableSegments.find(
        (seg) => seg.attributes.season === seasonNumber,
      );
      if (seasonSegment?.metadata?.name) {
        return seasonSegment.metadata.name;
      }
    }

    // Try to find season name in overview segment metadata
    const overviewSegment = segments.find((seg) => seg.type === 'overview');
    if (overviewSegment?.metadata?.name) {
      return overviewSegment.metadata.name;
    }

    // Default to season number if no name found
    return `Season ${seasonNumber}`;
  }

  /**
   * Make HTTP request through Zyte proxy
   */
  private async makeProxyRequest(url: string): Promise<any> {
    // Enforce rate limiting
    await this.enforceRateLimit();

    // Configure proxy for axios
    const proxyConfig: AxiosRequestConfig = {
      proxy: {
        protocol: 'http',
        host: this.zyteProxyHost,
        port: this.zyteProxyPort,
        auth: {
          username: this.zyteApiKey,
          password: '',
        },
      },
      timeout: this.zyteTimeout,
      headers: {
        'User-Agent': 'LeagueManagement-Bot/1.0',
      },
    };

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, proxyConfig).pipe(
          timeout(this.zyteTimeout),
          retry({
            count: this.zyteRetryAttempts,
            delay: this.zyteRetryDelay,
          }),
          catchError((error: AxiosError) => {
            // Check for Zyte-specific error headers (case-insensitive)
            const headers = error.response?.headers || {};
            const zyteErrorTitle =
              headers['zyte-error-title'] || headers['Zyte-Error-Title'];
            const zyteErrorType =
              headers['zyte-error-type'] || headers['Zyte-Error-Type'];
            const zyteRequestId =
              headers['zyte-request-id'] || headers['Zyte-Request-ID'];

            if (zyteErrorTitle || zyteErrorType) {
              this.logger.error(
                `Zyte proxy error: ${zyteErrorTitle || zyteErrorType} (Request ID: ${zyteRequestId})`,
              );
              return throwError(
                () =>
                  new ServiceUnavailableException(
                    `Zyte proxy error: ${zyteErrorTitle || zyteErrorType}`,
                  ),
              );
            }

            // Handle HTTP errors
            if (error.response) {
              if (error.response.status === 429) {
                this.logger.warn('Rate limit hit from Zyte proxy');
                return throwError(
                  () =>
                    new ServiceUnavailableException(
                      'Rate limit exceeded. Please try again later.',
                    ),
                );
              }

              if (error.response.status >= 500) {
                this.logger.error(
                  `Zyte proxy server error: ${error.response.status}`,
                );
                return throwError(
                  () =>
                    new ServiceUnavailableException(
                      'Zyte proxy service unavailable',
                    ),
                );
              }
            }

            // Network errors
            if (error.code === 'ECONNABORTED') {
              return throwError(
                () =>
                  new ServiceUnavailableException(
                    'Request timeout while connecting to Zyte proxy',
                  ),
              );
            }

            return throwError(() => error);
          }),
        ),
      );

      // Check for Zyte error headers in successful responses (case-insensitive)
      const responseHeaders = response.headers || {};
      const zyteErrorTitle =
        responseHeaders['zyte-error-title'] ||
        responseHeaders['Zyte-Error-Title'];
      const zyteErrorType =
        responseHeaders['zyte-error-type'] ||
        responseHeaders['Zyte-Error-Type'];
      if (zyteErrorTitle || zyteErrorType) {
        const zyteRequestId =
          responseHeaders['zyte-request-id'] ||
          responseHeaders['Zyte-Request-ID'];
        this.logger.error(
          `Zyte proxy error in response: ${zyteErrorTitle || zyteErrorType} (Request ID: ${zyteRequestId})`,
        );
        throw new ServiceUnavailableException(
          `Zyte proxy error: ${zyteErrorTitle || zyteErrorType}`,
        );
      }

      // Log Zyte request ID for debugging (case-insensitive)
      const zyteRequestId =
        responseHeaders['zyte-request-id'] ||
        responseHeaders['Zyte-Request-ID'];
      if (zyteRequestId) {
        this.logger.debug(`Zyte Request ID: ${zyteRequestId}`);
      }

      return response.data;
    } catch (error) {
      if (
        error instanceof ServiceUnavailableException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Proxy request failed: ${errorMessage}`, error);
      throw new ServiceUnavailableException(
        `Failed to make request through Zyte proxy: ${errorMessage}`,
      );
    }
  }

  /**
   * Parse and validate API response
   * Response from tracker.gg API has structure: { data: { ... } }
   */
  private parseApiResponse(response: any): ScrapedTrackerData {
    // Handle both direct response and nested data structure
    let data = response;
    if (response && response.data) {
      data = response.data;
    }

    if (!data) {
      throw new BadRequestException('Invalid API response: missing data');
    }

    if (!data.segments || !Array.isArray(data.segments)) {
      throw new BadRequestException(
        'Invalid API response: missing or invalid segments array',
      );
    }

    if (!data.availableSegments || !Array.isArray(data.availableSegments)) {
      throw new BadRequestException(
        'Invalid API response: missing or invalid availableSegments array',
      );
    }

    return {
      platformInfo: data.platformInfo || {},
      userInfo: data.userInfo || {},
      metadata: data.metadata || {},
      segments: data.segments,
      availableSegments: data.availableSegments,
    };
  }

  /**
   * Enforce rate limiting for Zyte API
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window

    // Reset window if we've moved to a new minute
    if (now - this.rateLimitWindowStart >= windowMs) {
      this.rateLimitWindowStart = now;
      this.requestCount = 0;
    }

    // Check if we've exceeded rate limit
    if (this.requestCount >= this.rateLimitPerMinute) {
      const waitTime = windowMs - (now - this.rateLimitWindowStart);
      this.logger.warn(
        `Rate limit reached. Waiting ${waitTime}ms before next request`,
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      // Reset after waiting
      this.rateLimitWindowStart = Date.now();
      this.requestCount = 0;
    }

    // Ensure minimum delay between requests
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minDelay = (60 * 1000) / this.rateLimitPerMinute; // Minimum delay between requests
    if (timeSinceLastRequest < minDelay && this.lastRequestTime > 0) {
      const delay = minDelay - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }
}
