import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GamePlatform, Game } from '@prisma/client';

export interface ParsedTrackerUrl {
  platform: GamePlatform;
  username: string;
  game: Game;
  isValid: boolean;
}

@Injectable()
export class TrackerValidationService {
  private readonly logger = new Logger(TrackerValidationService.name);
  private readonly TRN_BASE_URL = 'https://rocketleague.tracker.network';
  private readonly TRN_PROFILE_REGEX = /^https:\/\/rocketleague\.tracker\.network\/profile\/([^\/]+)\/([^\/]+)\/?$/i;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate and parse a TRN tracker URL
   * Returns parsed information or throws BadRequestException
   */
  async validateTrackerUrl(url: string): Promise<ParsedTrackerUrl> {
    // 1. Basic URL format validation
    if (!this.isValidUrlFormat(url)) {
      throw new BadRequestException(
        'Invalid tracker URL format. Must be: https://rocketleague.tracker.network/profile/{platform}/{username}',
      );
    }

    // 2. Parse URL to extract platform and username
    const parsed = this.parseTrackerUrl(url);
    if (!parsed) {
      throw new BadRequestException('Failed to parse tracker URL');
    }

    // 3. Validate platform is supported
    if (!this.isValidPlatform(parsed.platform)) {
      throw new BadRequestException(
        `Unsupported platform: ${parsed.platform}. Supported platforms: steam, epic, xbl, psn, switch`,
      );
    }

    // 4. Validate username format (basic validation)
    if (!this.isValidUsername(parsed.username)) {
      throw new BadRequestException('Invalid username format in tracker URL');
    }

    // 5. Check uniqueness in database
    const isUnique = await this.checkUrlUniqueness(url);
    if (!isUnique) {
      throw new BadRequestException(
        'This tracker URL has already been registered with another user.',
      );
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
   */
  private isValidUrlFormat(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return (
        urlObj.protocol === 'https:' &&
        urlObj.hostname === 'rocketleague.tracker.network' &&
        urlObj.pathname.startsWith('/profile/')
      );
    } catch {
      return false;
    }
  }

  /**
   * Parse tracker URL to extract platform and username
   */
  private parseTrackerUrl(url: string): { platform: string; username: string } | null {
    const match = url.match(this.TRN_PROFILE_REGEX);
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
   */
  private async checkUrlUniqueness(url: string): Promise<boolean> {
    const existingTracker = await this.prisma.tracker.findUnique({
      where: { url },
    });

    if (existingTracker) {
      return false;
    }

    // Also check pending registrations
    const pendingRegistration = await this.prisma.trackerRegistration.findFirst({
      where: {
        url,
        status: {
          in: ['PENDING', 'PROCESSING'],
        },
      },
    });

    return !pendingRegistration;
  }

  /**
   * Extract platform and username from URL (public helper)
   */
  async extractTrackerInfo(url: string): Promise<{
    platform: GamePlatform;
    username: string;
  }> {
    const parsed = this.parseTrackerUrl(url);
    if (!parsed) {
      throw new BadRequestException('Failed to parse tracker URL');
    }

    return {
      platform: this.mapPlatformToEnum(parsed.platform),
      username: parsed.username,
    };
  }
}


