import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TrackerRepository } from '../repositories/tracker.repository';
import { GamePlatform, Game } from '@prisma/client';

@Injectable()
export class TrackerService {
  private readonly logger = new Logger(TrackerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly trackerRepository: TrackerRepository,
  ) {}

  /**
   * Create a new tracker
   */
  async createTracker(
    url: string,
    game: Game,
    platform: GamePlatform,
    username: string,
    userId: string,
    displayName?: string,
  ) {
    return this.trackerRepository.create({
      url,
      game,
      platform,
      username,
      userId,
      displayName,
    });
  }

  /**
   * Get tracker by ID
   */
  async getTrackerById(id: string) {
    const tracker = await this.trackerRepository.findById(id);
    if (!tracker) {
      throw new NotFoundException('Tracker not found');
    }
    return tracker;
  }

  /**
   * Get trackers for a user
   */
  async getTrackersByUserId(userId: string) {
    return this.trackerRepository.findByUserId(userId);
  }

  /**
   * Get trackers accessible to a guild
   * Guilds can access trackers for users who are members of that guild
   */
  async getTrackersByGuild(guildId: string) {
    return this.trackerRepository.findByGuildId(guildId);
  }

  /**
   * Get tracker by URL
   */
  async getTrackerByUrl(url: string) {
    return this.trackerRepository.findByUrl(url);
  }

  /**
   * Update tracker metadata
   */
  async updateTracker(
    id: string,
    displayName?: string,
    isActive?: boolean,
  ) {
    const tracker = await this.getTrackerById(id);

    const updateData: any = {};
    if (displayName !== undefined) {
      updateData.displayName = displayName;
    }
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    return this.trackerRepository.update(id, updateData);
  }

  /**
   * Soft delete a tracker
   */
  async deleteTracker(id: string) {
    const tracker = await this.getTrackerById(id);
    return this.trackerRepository.softDelete(id);
  }

  /**
   * Check if a URL is unique
   */
  async checkUrlUniqueness(url: string): Promise<boolean> {
    return this.trackerRepository.checkUrlUniqueness(url);
  }
}






