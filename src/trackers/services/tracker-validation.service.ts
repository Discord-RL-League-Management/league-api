import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GamePlatform, Game } from '@prisma/client';
import { TrackerUrlConverterService } from './tracker-url-converter.service';

export interface ParsedTrackerUrl {
  platform: GamePlatform;
  username: string;
  game: Game;
  isValid: boolean;
}

@Injectable()
export class TrackerValidationService {
  private readonly serviceName = TrackerValidationService.name;
  private readonly TRN_BASE_URL = 'https://rocketleague.tracker.network';
  private readonly TRN_PROFILE_REGEX =
    /^https:\/\/rocketleague\.tracker\.network\/rocket-league\/profile\/([^/]+)\/([^/]+)\/overview\/?$/i;

  constructor(
    private readonly prisma: PrismaService,
    private readonly urlConverter: TrackerUrlConverterService,
  ) {}

  /**
   * Validate and parse a TRN tracker URL
   * Returns parsed information or throws BadRequestException
   * @param url - TRN profile URL
   * @param userId - User ID to check for uniqueness
   * @param excludeTrackerId - Optional tracker ID to exclude from URL uniqueness check (for replacement)
   * @param skipUniquenessCheck - Skip uniqueness check if already validated in batch
   */
  async validateTrackerUrl(
    url: string,
    userId: string,
    excludeTrackerId?: string,
    skipUniquenessCheck?: boolean,
  ): Promise<ParsedTrackerUrl> {
    if (!this.isValidUrlFormat(url)) {
      throw new BadRequestException(
        'Invalid tracker URL format. Must be: https://rocketleague.tracker.network/rocket-league/profile/{platform}/{username}/overview',
      );
    }

    if (!this.urlConverter.isValidTrnUrl(url)) {
      throw new BadRequestException('Invalid tracker URL format');
    }

    const parsed = this.parseTrackerUrl(url);
    if (!parsed) {
      throw new BadRequestException('Failed to parse tracker URL');
    }

    if (!this.isValidPlatform(parsed.platform)) {
      throw new BadRequestException(
        `Unsupported platform: ${parsed.platform}. Supported platforms: steam, epic, xbl, psn, switch`,
      );
    }

    if (!this.isValidUsername(parsed.username)) {
      throw new BadRequestException('Invalid username format in tracker URL');
    }

    if (!skipUniquenessCheck) {
      const isUnique = await this.checkUrlUniqueness(url, excludeTrackerId);
      if (!isUnique) {
        throw new BadRequestException(
          'This tracker URL has already been registered with another user.',
        );
      }
    }

    return {
      platform: this.mapPlatformToEnum(parsed.platform),
      username: parsed.username,
      game: Game.ROCKET_LEAGUE,
      isValid: true,
    };
  }

  /**
   * Validate URL format matches TRN pattern
   * Normalizes trailing slashes to match regex behavior (allows 0-1 trailing slash)
   */
  private isValidUrlFormat(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const normalizedPathname = urlObj.pathname.replace(/\/+$/, (match) =>
        match.length > 1 ? '/' : match,
      );
      return (
        urlObj.protocol === 'https:' &&
        urlObj.hostname === 'rocketleague.tracker.network' &&
        normalizedPathname.startsWith('/rocket-league/profile/') &&
        (normalizedPathname.endsWith('/overview') ||
          normalizedPathname.endsWith('/overview/'))
      );
    } catch {
      return false;
    }
  }

  /**
   * Parse tracker URL to extract platform and username
   */
  private parseTrackerUrl(
    url: string,
  ): { platform: string; username: string } | null {
    const normalizedUrl = url.replace(/\/+$/, (match) =>
      match.length > 1 ? '/' : match,
    );
    const match = normalizedUrl.match(this.TRN_PROFILE_REGEX);
    if (!match || match.length < 3) {
      return null;
    }

    const platform = match[1].toLowerCase();
    const username = match[2];

    return { platform, username };
  }

  /**
   * Validate platform is supported
   */
  private isValidPlatform(platform: string): boolean {
    const validPlatforms = ['steam', 'epic', 'xbl', 'psn', 'switch'];
    return validPlatforms.includes(platform.toLowerCase());
  }

  /**
   * Map string platform to enum
   */
  private mapPlatformToEnum(platform: string): GamePlatform {
    const platformMap: Record<string, GamePlatform> = {
      steam: GamePlatform.STEAM,
      epic: GamePlatform.EPIC,
      xbl: GamePlatform.XBL,
      psn: GamePlatform.PSN,
      switch: GamePlatform.SWITCH,
    };
    return platformMap[platform.toLowerCase()];
  }

  /**
   * Validate username format (basic validation)
   */
  private isValidUsername(username: string): boolean {
    if (!username || username.length === 0) {
      return false;
    }
    return username.length > 0 && username.length <= 100;
  }

  /**
   * Check if URL is unique in our system
   * @param url - URL to check
   * @param excludeTrackerId - Optional tracker ID to exclude from check (for replacement)
   */
  private async checkUrlUniqueness(
    url: string,
    excludeTrackerId?: string,
  ): Promise<boolean> {
    const existingTracker = await this.prisma.tracker.findUnique({
      where: { url },
    });

    if (!existingTracker) {
      return true;
    }

    if (excludeTrackerId && existingTracker.id === excludeTrackerId) {
      return true;
    }

    return false;
  }

  /**
   * Batch check URL uniqueness for multiple URLs
   * Optimizes N+1 query problem by checking all URLs in a single database query
   * @param urls - Array of URLs to check
   * @param excludeTrackerIds - Optional array of tracker IDs to exclude from check
   * @returns Map of URL to boolean indicating uniqueness
   */
  async batchCheckUrlUniqueness(
    urls: string[],
    excludeTrackerIds?: string[],
  ): Promise<Map<string, boolean>> {
    if (urls.length === 0) {
      return new Map();
    }

    const existingTrackers = await this.prisma.tracker.findMany({
      where: {
        url: { in: urls },
      },
      select: {
        url: true,
        id: true,
      },
    });

    const existingUrlMap = new Map<string, string>();
    for (const tracker of existingTrackers) {
      existingUrlMap.set(tracker.url, tracker.id);
    }

    const excludeSet = new Set(excludeTrackerIds || []);

    const resultMap = new Map<string, boolean>();
    for (const url of urls) {
      const existingTrackerId = existingUrlMap.get(url);
      if (!existingTrackerId) {
        resultMap.set(url, true);
      } else if (excludeSet.has(existingTrackerId)) {
        resultMap.set(url, true);
      } else {
        resultMap.set(url, false);
      }
    }

    return resultMap;
  }

  /**
   * Extract platform and username from URL (public helper)
   */
  extractTrackerInfo(url: string): Promise<{
    platform: GamePlatform;
    username: string;
  }> {
    const parsed = this.parseTrackerUrl(url);
    if (!parsed) {
      throw new BadRequestException('Failed to parse tracker URL');
    }

    return Promise.resolve({
      platform: this.mapPlatformToEnum(parsed.platform),
      username: parsed.username,
    });
  }
}
