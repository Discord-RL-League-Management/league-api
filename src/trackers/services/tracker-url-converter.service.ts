import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import type { ILoggingService } from '../../infrastructure/logging/interfaces/logging.interface';

@Injectable()
export class TrackerUrlConverterService {
  private readonly serviceName = TrackerUrlConverterService.name;
  private readonly TRN_PROFILE_REGEX =
    /^https:\/\/rocketleague\.tracker\.network\/rocket-league\/profile\/([^/]+)\/([^/]+)\/overview\/?$/i;
  private readonly TRACKER_GG_API_BASE =
    'https://api.tracker.gg/api/v2/rocket-league/standard/profile';

  constructor(
    @Inject('ILoggingService')
    private readonly loggingService: ILoggingService,
  ) {}

  /**
   * Convert TRN URL to tracker.gg API URL
   * @param trnUrl - TRN profile URL (e.g., https://rocketleague.tracker.network/rocket-league/profile/steam/76561198051701160/overview)
   * @returns tracker.gg API URL (e.g., https://api.tracker.gg/api/v2/rocket-league/standard/profile/steam/76561198051701160)
   */
  convertTrnUrlToApiUrl(trnUrl: string): string {
    try {
      // Parse TRN URL
      const match = trnUrl.match(this.TRN_PROFILE_REGEX);
      if (!match || match.length < 3) {
        throw new BadRequestException(
          'Invalid TRN URL format. Expected: https://rocketleague.tracker.network/rocket-league/profile/{platform}/{username}/overview',
        );
      }

      const platform = match[1].toLowerCase();
      const username = match[2];

      // Map platform names (some platforms might have different names in API)
      const apiPlatform = this.mapPlatformToApiFormat(platform);

      // URL encode username
      const encodedUsername = encodeURIComponent(username);

      // Construct tracker.gg API URL
      const apiUrl = `${this.TRACKER_GG_API_BASE}/${apiPlatform}/${encodedUsername}`;

      this.loggingService.debug(
        `Converted TRN URL to API URL: ${trnUrl} -> ${apiUrl}`,
        this.serviceName,
      );

      return apiUrl;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.loggingService.error(
        `Error converting TRN URL to API URL: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      throw new BadRequestException('Failed to convert tracker URL to API URL');
    }
  }

  /**
   * Map platform name from TRN format to tracker.gg API format
   * Most platforms use the same name, but this allows for any differences
   */
  private mapPlatformToApiFormat(platform: string): string {
    const platformMap: Record<string, string> = {
      steam: 'steam',
      epic: 'epic',
      xbl: 'xbl',
      psn: 'psn',
      switch: 'switch',
    };

    const normalizedPlatform = platform.toLowerCase();
    if (!platformMap[normalizedPlatform]) {
      throw new BadRequestException(
        `Unsupported platform: ${platform}. Supported platforms: steam, epic, xbl, psn, switch`,
      );
    }

    return platformMap[normalizedPlatform];
  }

  /**
   * Validate that a URL is in the correct TRN format
   */
  isValidTrnUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return (
        urlObj.protocol === 'https:' &&
        urlObj.hostname === 'rocketleague.tracker.network' &&
        this.TRN_PROFILE_REGEX.test(url)
      );
    } catch {
      return false;
    }
  }
}
