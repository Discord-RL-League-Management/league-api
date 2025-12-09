import {
  Injectable,
  Logger,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, timeout, retry, catchError, throwError } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';
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
  private readonly decodoApiKey: string;
  private readonly decodoApiUrl: string;
  private readonly decodoTimeout: number;
  private readonly decodoRetryAttempts: number;
  private readonly decodoRetryDelay: number;
  private readonly rateLimitPerMinute: number;
  private lastRequestTime: number = 0;
  private requestCount: number = 0;
  private rateLimitWindowStart: number = Date.now();

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly urlConverter: TrackerUrlConverterService,
  ) {
    const decodoConfig = this.configService.get<{
      apiKey: string;
      apiUrl: string;
      timeoutMs: number;
      retryAttempts: number;
      retryDelayMs: number;
      rateLimitPerMinute: number;
    }>('decodo');
    if (!decodoConfig) {
      throw new Error('Decodo configuration is missing');
    }
    this.decodoApiKey = decodoConfig.apiKey;
    this.decodoApiUrl = decodoConfig.apiUrl;
    this.decodoTimeout = decodoConfig.timeoutMs;
    this.decodoRetryAttempts = decodoConfig.retryAttempts;
    this.decodoRetryDelay = decodoConfig.retryDelayMs;
    this.rateLimitPerMinute = decodoConfig.rateLimitPerMinute;
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
      const apiUrl = this.urlConverter.convertTrnUrlToApiUrl(trnUrl);

      const urlWithSeason = seasonNumber
        ? `${apiUrl}?season=${seasonNumber}`
        : apiUrl;

      this.logger.debug(`Scraping tracker data from: ${urlWithSeason}`);

      const response = await this.makeProxyRequest(urlWithSeason);

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
      const baseData = await this.scrapeTrackerData(trnUrl);

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

      const validSeasons = seasonResults.filter(
        (season): season is SeasonData => season !== null,
      );

      if (currentSeasonData) {
        validSeasons.push(currentSeasonData);
      }

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
   * Make HTTP request through Decodo scraper API
   */
  private async makeProxyRequest(url: string): Promise<AxiosResponse<unknown>> {
    await this.enforceRateLimit();

    try {
      // Note: 'target' and 'device_type' are only available in Advanced plan
      // For Core plan, we only send the URL
      const requestBody = {
        url: url,
      };

      const response = await firstValueFrom(
        this.httpService
          .post<{
            content?: string;
            statusCode?: number;
            status?: string;
            task_id?: string;
            message?: string;
          }>(this.decodoApiUrl, requestBody, {
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Authorization: `Basic ${this.decodoApiKey}`,
            },
            timeout: this.decodoTimeout,
          })
          .pipe(
            timeout(this.decodoTimeout),
            retry({
              count: this.decodoRetryAttempts,
              delay: this.decodoRetryDelay,
            }),
            catchError((error: AxiosError) => {
              if (error.response) {
                if (error.response.status === 429) {
                  this.logger.warn('Rate limit hit from Decodo API');
                  return throwError(
                    () =>
                      new ServiceUnavailableException(
                        'Rate limit exceeded. Please try again later.',
                      ),
                  );
                }
                if (error.response.status >= 500) {
                  this.logger.error(
                    `Decodo API server error: ${error.response.status}`,
                  );
                  return throwError(
                    () =>
                      new ServiceUnavailableException(
                        'Decodo scraper service unavailable',
                      ),
                  );
                }
              }

              if (error.code === 'ECONNABORTED') {
                return throwError(
                  () =>
                    new ServiceUnavailableException(
                      'Request timeout while connecting to Decodo API',
                    ),
                );
              }

              if (error.response?.status === 400) {
                this.logger.error(
                  `Decodo API 400 error: ${JSON.stringify(error.response.data)}`,
                );
              }
              return throwError(() => error);
            }),
          ),
      );

      // Decodo returns error status in the response body with status: "failed"
      if (
        response.data &&
        typeof response.data === 'object' &&
        'status' in response.data
      ) {
        const decodoResponse = response.data as {
          status?: string;
          status_code?: number;
          message?: string;
          task_id?: string;
        };
        if (decodoResponse.status === 'failed') {
          const errorMessage =
            decodoResponse.message ||
            `Decodo scraping failed with status code: ${decodoResponse.status_code || 'unknown'}`;
          this.logger.error(
            `Decodo scraping failed: ${errorMessage} (Task ID: ${decodoResponse.task_id || 'unknown'})`,
          );
          throw new ServiceUnavailableException(
            `Failed to scrape target: ${errorMessage}`,
          );
        }
      }

      this.logger.debug(
        `Decodo API response received. Status: ${response.status}, Data type: ${typeof response.data}, Has content field: ${response.data && typeof response.data === 'object' && 'content' in response.data}`,
      );
      return response;
    } catch (error) {
      if (
        error instanceof ServiceUnavailableException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Decodo API request failed: ${errorMessage}`, error);
      throw new ServiceUnavailableException(
        `Failed to make request through Decodo API: ${errorMessage}`,
      );
    }
  }

  /**
   * Parse and validate API response
   * Response from Decodo API may have structure: { content?: string } or direct JSON
   * Response from tracker.gg API has structure: { data: { ... } }
   */
  private parseApiResponse(
    response: AxiosResponse<unknown> | { data?: unknown },
  ): ScrapedTrackerData {
    let responseData: unknown = response;
    if (response && typeof response === 'object' && 'data' in response) {
      responseData = (response as AxiosResponse<unknown>).data || response;
    }

    const responseDataType = typeof responseData;
    const isObject = responseData !== null && typeof responseData === 'object';
    const keys =
      isObject && responseData !== null && typeof responseData === 'object'
        ? Object.keys(responseData).join(', ')
        : 'N/A';
    this.logger.debug(
      `Parsing API response. ResponseData type: ${responseDataType}, Is object: ${isObject}, Keys: ${keys}`,
    );

    // Handle Decodo response format: { content?: string; statusCode?: number }
    // If Decodo wraps the response in a 'content' field, extract and parse it
    if (
      responseData &&
      typeof responseData === 'object' &&
      'content' in responseData
    ) {
      const decodoResponse = responseData as { content?: string };
      this.logger.debug(
        `Decodo response has 'content' field. Content type: ${typeof decodoResponse.content}`,
      );
      if (decodoResponse.content) {
        try {
          responseData = JSON.parse(decodoResponse.content);
          this.logger.debug(
            `Successfully parsed Decodo content. Parsed type: ${typeof responseData}`,
          );
        } catch (parseError) {
          this.logger.error(
            'Failed to parse Decodo response content as JSON',
            parseError,
          );
          throw new BadRequestException(
            'Invalid API response: failed to parse Decodo content',
          );
        }
      }
    }

    // Handle both direct response and nested data structure from tracker.gg
    let data: unknown = responseData;
    if (
      responseData &&
      typeof responseData === 'object' &&
      'data' in responseData
    ) {
      data = (responseData as { data?: unknown }).data || responseData;
    }

    if (!data || typeof data !== 'object') {
      throw new BadRequestException('Invalid API response: missing data');
    }

    const trackerData = data as {
      segments?: TrackerSegment[];
      availableSegments?: Array<{
        type: string;
        attributes: { season: number };
        metadata: { name: string };
      }>;
      platformInfo?: ScrapedTrackerData['platformInfo'];
      userInfo?: ScrapedTrackerData['userInfo'];
      metadata?: ScrapedTrackerData['metadata'];
    };

    if (!trackerData.segments || !Array.isArray(trackerData.segments)) {
      throw new BadRequestException(
        'Invalid API response: missing or invalid segments array',
      );
    }

    if (
      !trackerData.availableSegments ||
      !Array.isArray(trackerData.availableSegments)
    ) {
      throw new BadRequestException(
        'Invalid API response: missing or invalid availableSegments array',
      );
    }

    return {
      platformInfo:
        trackerData.platformInfo ||
        ({
          platformSlug: '',
          platformUserId: '',
          platformUserHandle: '',
        } as ScrapedTrackerData['platformInfo']),
      userInfo:
        trackerData.userInfo ||
        ({ userId: 0, isPremium: false } as ScrapedTrackerData['userInfo']),
      metadata:
        trackerData.metadata ||
        ({
          lastUpdated: '',
          playerId: 0,
          currentSeason: 0,
        } as ScrapedTrackerData['metadata']),
      segments: trackerData.segments,
      availableSegments: trackerData.availableSegments,
    };
  }

  /**
   * Enforce rate limiting for Decodo API
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window

    if (now - this.rateLimitWindowStart >= windowMs) {
      this.rateLimitWindowStart = now;
      this.requestCount = 0;
    }

    if (this.requestCount >= this.rateLimitPerMinute) {
      const waitTime = windowMs - (now - this.rateLimitWindowStart);
      this.logger.warn(
        `Rate limit reached. Waiting ${waitTime}ms before next request`,
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      this.rateLimitWindowStart = Date.now();
      this.requestCount = 0;
    }

    const timeSinceLastRequest = now - this.lastRequestTime;
    const minDelay = (60 * 1000) / this.rateLimitPerMinute;
    if (timeSinceLastRequest < minDelay && this.lastRequestTime > 0) {
      const delay = minDelay - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }
}
