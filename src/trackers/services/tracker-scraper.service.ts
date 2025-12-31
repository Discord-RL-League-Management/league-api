import {
  Injectable,
  BadRequestException,
  ServiceUnavailableException,
  Inject,
} from '@nestjs/common';
import { ILoggingService } from '../../infrastructure/logging/interfaces/logging.interface';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, retry, catchError } from 'rxjs';
import { IConfigurationService } from '../../infrastructure/configuration/interfaces/configuration.interface';
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
  private readonly serviceName = TrackerScraperService.name;
  private readonly flaresolverrUrl: string;
  private readonly flaresolverrTimeout: number;
  private readonly flaresolverrRetryAttempts: number;
  private readonly flaresolverrRetryDelay: number;
  private readonly rateLimitPerMinute: number;
  private lastRequestTime: number = 0;
  private requestCount: number = 0;
  private rateLimitWindowStart: number = Date.now();

  constructor(
    private readonly httpService: HttpService,
    @Inject(IConfigurationService)
    private readonly configService: IConfigurationService,
    private readonly urlConverter: TrackerUrlConverterService,
    @Inject(ILoggingService)
    private readonly loggingService: ILoggingService,
  ) {
    const flaresolverrConfig = this.configService.get<{
      url: string;
      timeoutMs: number;
      retryAttempts: number;
      retryDelayMs: number;
      rateLimitPerMinute: number;
    }>('flaresolverr');
    if (!flaresolverrConfig) {
      throw new Error('FlareSolverr configuration is missing');
    }
    this.flaresolverrUrl = flaresolverrConfig.url;
    this.flaresolverrTimeout = flaresolverrConfig.timeoutMs;
    this.flaresolverrRetryAttempts = flaresolverrConfig.retryAttempts;
    this.flaresolverrRetryDelay = flaresolverrConfig.retryDelayMs;
    this.rateLimitPerMinute = flaresolverrConfig.rateLimitPerMinute;
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

      this.loggingService.debug(
        `Scraping tracker data from: ${urlWithSeason}`,
        this.serviceName,
      );

      const response = await this.makeProxyRequest(urlWithSeason);

      const data = this.parseApiResponse(response);

      this.loggingService.debug(
        `Successfully scraped data: ${data.segments.length} segments, ${data.availableSegments.length} available seasons`,
        this.serviceName,
      );

      return data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.loggingService.error(
        `Failed to scrape tracker data: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
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

      this.loggingService.debug(
        `Found ${availableSeasons.length} available seasons for scraping`,
        this.serviceName,
      );

      if (availableSeasons.length === 0) {
        this.loggingService.warn(
          'No seasons available for scraping',
          this.serviceName,
        );
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
          this.loggingService.error(
            `Failed to scrape season ${seasonNum}: ${errorMessage}`,
            undefined,
            this.serviceName,
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

      this.loggingService.log(
        `Successfully scraped ${validSeasons.length} of ${availableSeasons.length} seasons (including current season from base data)`,
        this.serviceName,
      );

      return validSeasons;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.loggingService.error(
        `Failed to scrape all seasons: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
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

        this.loggingService.warn(
          `Invalid stats structure in segment (type: ${segmentType}, playlistId: ${playlistId}): ${errorDetails}. ` +
            `This may indicate the tracker.gg API response structure has changed.`,
          this.serviceName,
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
      this.loggingService.warn(
        `Failed to extract playlist data: ${errorMessage}`,
        this.serviceName,
      );
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
   * Make HTTP request through FlareSolverr scraper API
   */
  private async makeProxyRequest(url: string): Promise<AxiosResponse<unknown>> {
    await this.enforceRateLimit();

    try {
      const requestBody = {
        cmd: 'request.get',
        url: url,
        maxTimeout: this.flaresolverrTimeout,
      };

      const errorHandler = catchError((error: AxiosError) => {
        if (error.response) {
          if (error.response.status === 429) {
            this.loggingService.warn(
              'Rate limit hit from FlareSolverr API',
              this.serviceName,
            );
            throw new ServiceUnavailableException(
              'Rate limit exceeded. Please try again later.',
            );
          }
          if (error.response.status >= 500) {
            this.loggingService.error(
              `FlareSolverr API server error: ${error.response.status}`,
              undefined,
              this.serviceName,
            );
            throw new ServiceUnavailableException(
              'FlareSolverr scraper service unavailable',
            );
          }
        }

        if (error.code === 'ECONNABORTED') {
          throw new ServiceUnavailableException(
            'Request timeout while connecting to FlareSolverr API',
          );
        }

        if (error.response?.status === 400) {
          this.loggingService.error(
            `FlareSolverr API 400 error: ${JSON.stringify(error.response.data)}`,
            undefined,
            this.serviceName,
          );
        }
        throw error;
      });

      const httpObservable = this.httpService.post<{
        status?: string;
        message?: string;
        solution?: {
          response?: string;
          status?: number;
          url?: string;
        };
      }>(`${this.flaresolverrUrl}/v1`, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: this.flaresolverrTimeout,
      });

      const observableWithRetry =
        this.flaresolverrRetryAttempts > 0
          ? httpObservable.pipe(
              retry({
                count: this.flaresolverrRetryAttempts,
                delay: this.flaresolverrRetryDelay,
              }),
              errorHandler,
            )
          : httpObservable.pipe(errorHandler);

      const response = (await firstValueFrom(
        observableWithRetry,
      )) as AxiosResponse<unknown>;

      // FlareSolverr returns error status in the response body with status: "error" or "failed"
      if (
        response.data &&
        typeof response.data === 'object' &&
        'status' in response.data
      ) {
        const flaresolverrResponse = response.data as {
          status?: string;
          message?: string;
        };
        if (flaresolverrResponse.status !== 'ok') {
          const errorMessage =
            flaresolverrResponse.message ||
            `FlareSolverr scraping failed with status: ${flaresolverrResponse.status || 'unknown'}`;
          this.loggingService.error(
            `FlareSolverr scraping failed: ${errorMessage}`,
            undefined,
            this.serviceName,
          );
          throw new ServiceUnavailableException(
            `Failed to scrape target: ${errorMessage}`,
          );
        }
      }

      this.loggingService.debug(
        `FlareSolverr API response received. Status: ${response.status}, Data type: ${typeof response.data}`,
        this.serviceName,
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
      this.loggingService.error(
        `FlareSolverr API request failed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      throw new ServiceUnavailableException(
        `Failed to make request through FlareSolverr API: ${errorMessage}`,
      );
    }
  }

  /**
   * Parse and validate API response
   * Response from FlareSolverr API has structure: { status: "ok", solution: { response: "<html>...<pre>{JSON}</pre>..." } }
   * Response from tracker.gg API (after extraction) has structure: { data: { ... } }
   */
  private parseApiResponse(
    response: AxiosResponse<unknown> | { data?: unknown },
  ): ScrapedTrackerData {
    let responseData = this.extractResponseData(response);
    this.logResponseData(responseData);

    // Handle FlareSolverr response format
    if (this.isFlareSolverrResponse(responseData)) {
      responseData = this.parseFlareSolverrResponse(responseData);
    }

    // Handle both direct response and nested data structure from tracker.gg
    const data = this.extractTrackerData(responseData);
    const trackerData = this.validateAndNormalizeTrackerData(data);

    return this.buildScrapedTrackerData(trackerData);
  }

  /**
   * Extract response data from Axios response or direct object
   */
  private extractResponseData(
    response: AxiosResponse<unknown> | { data?: unknown },
  ): unknown {
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as AxiosResponse<unknown>).data || response;
    }
    return response;
  }

  /**
   * Log response data for debugging
   */
  private logResponseData(responseData: unknown): void {
    const responseDataType = typeof responseData;
    const isObject = responseData !== null && typeof responseData === 'object';
    const keys =
      isObject && responseData !== null && typeof responseData === 'object'
        ? Object.keys(responseData).join(', ')
        : 'N/A';
    this.loggingService.debug(
      `Parsing API response. ResponseData type: ${responseDataType}, Is object: ${isObject}, Keys: ${keys}`,
      this.serviceName,
    );
  }

  /**
   * Check if response is in FlareSolverr format
   */
  private isFlareSolverrResponse(responseData: unknown): boolean {
    return (
      responseData !== null &&
      typeof responseData === 'object' &&
      'status' in responseData &&
      'solution' in responseData
    );
  }

  /**
   * Parse FlareSolverr response and extract JSON from HTML
   */
  private parseFlareSolverrResponse(responseData: unknown): unknown {
    const flaresolverrResponse = responseData as {
      status?: string;
      message?: string;
      solution?: {
        response?: string;
        status?: number;
        url?: string;
      };
    };

    this.validateFlareSolverrStatus(flaresolverrResponse);
    const htmlResponse = this.extractHtmlResponse(flaresolverrResponse);
    return this.extractJsonFromHtml(htmlResponse);
  }

  /**
   * Validate FlareSolverr response status
   */
  private validateFlareSolverrStatus(flaresolverrResponse: {
    status?: string;
    message?: string;
  }): void {
    if (flaresolverrResponse.status !== 'ok') {
      const errorMessage =
        flaresolverrResponse.message ||
        `FlareSolverr scraping failed with status: ${flaresolverrResponse.status}`;
      this.loggingService.error(
        `FlareSolverr scraping failed: ${errorMessage}`,
        undefined,
        this.serviceName,
      );
      throw new ServiceUnavailableException(
        `Failed to scrape target: ${errorMessage}`,
      );
    }
  }

  /**
   * Extract HTML response from FlareSolverr solution
   */
  private extractHtmlResponse(flaresolverrResponse: {
    solution?: { response?: string };
  }): string {
    if (!flaresolverrResponse.solution?.response) {
      throw new BadRequestException(
        'Invalid FlareSolverr response: missing solution.response',
      );
    }

    const htmlResponse = flaresolverrResponse.solution.response;
    this.loggingService.debug(
      `FlareSolverr response has HTML content. Length: ${htmlResponse.length}`,
      this.serviceName,
    );
    return htmlResponse;
  }

  /**
   * Extract JSON from HTML <pre> tag
   */
  private extractJsonFromHtml(htmlResponse: string): unknown {
    try {
      const preTagMatch = htmlResponse.match(/<pre[^>]*>(.*?)<\/pre>/s);
      if (!preTagMatch || !preTagMatch[1]) {
        throw new BadRequestException(
          'Invalid FlareSolverr response: could not find JSON in <pre> tag',
        );
      }

      const jsonString = preTagMatch[1];
      const parsed = JSON.parse(jsonString) as unknown;
      this.loggingService.debug(
        `Successfully extracted and parsed JSON from HTML <pre> tag`,
        this.serviceName,
      );
      return parsed;
    } catch (parseError) {
      this.loggingService.error(
        `Failed to extract or parse JSON from FlareSolverr HTML response: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        parseError instanceof Error ? parseError.stack : undefined,
        this.serviceName,
      );
      throw new BadRequestException(
        'Invalid API response: failed to parse JSON from FlareSolverr HTML response',
      );
    }
  }

  /**
   * Extract tracker data from response, handling nested data structure
   */
  private extractTrackerData(responseData: unknown): unknown {
    if (
      responseData &&
      typeof responseData === 'object' &&
      'data' in responseData
    ) {
      return (responseData as { data?: unknown }).data || responseData;
    }
    return responseData;
  }

  /**
   * Validate and normalize tracker data structure
   */
  private validateAndNormalizeTrackerData(data: unknown): {
    segments: TrackerSegment[];
    availableSegments: Array<{
      type: string;
      attributes: { season: number };
      metadata: { name: string };
    }>;
    platformInfo?: ScrapedTrackerData['platformInfo'];
    userInfo?: ScrapedTrackerData['userInfo'];
    metadata?: ScrapedTrackerData['metadata'];
  } {
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
      segments: trackerData.segments,
      availableSegments: trackerData.availableSegments,
      platformInfo: trackerData.platformInfo,
      userInfo: trackerData.userInfo,
      metadata: trackerData.metadata,
    };
  }

  /**
   * Build ScrapedTrackerData with default values for missing fields
   */
  private buildScrapedTrackerData(trackerData: {
    segments: TrackerSegment[];
    availableSegments: Array<{
      type: string;
      attributes: { season: number };
      metadata: { name: string };
    }>;
    platformInfo?: ScrapedTrackerData['platformInfo'];
    userInfo?: ScrapedTrackerData['userInfo'];
    metadata?: ScrapedTrackerData['metadata'];
  }): ScrapedTrackerData {
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
   * Enforce rate limiting for FlareSolverr API
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
      this.loggingService.warn(
        `Rate limit reached. Waiting ${waitTime}ms before next request`,
        this.serviceName,
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
