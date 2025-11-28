import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TrackerSnapshotRepository } from '../repositories/tracker-snapshot.repository';
import { TrackerRepository } from '../repositories/tracker.repository';
import { VisibilityService } from '../../infrastructure/visibility/services/visibility.service';

@Injectable()
export class TrackerSnapshotService {
  private readonly logger = new Logger(TrackerSnapshotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly snapshotRepository: TrackerSnapshotRepository,
    private readonly trackerRepository: TrackerRepository,
    private readonly visibilityService: VisibilityService,
  ) {}

  /**
   * Create a new snapshot
   */
  async createSnapshot(
    trackerId: string,
    enteredBy: string,
    data: {
      capturedAt?: Date;
      seasonNumber?: number;
      ones?: number;
      twos?: number;
      threes?: number;
      fours?: number;
      onesGamesPlayed?: number;
      twosGamesPlayed?: number;
      threesGamesPlayed?: number;
      foursGamesPlayed?: number;
      guildIds?: string[];
    },
  ) {
    // Verify tracker exists
    const tracker = await this.trackerRepository.findById(trackerId);
    if (!tracker) {
      throw new NotFoundException('Tracker not found');
    }

    if (tracker.isDeleted) {
      throw new BadRequestException(
        'Cannot create snapshot for deleted tracker',
      );
    }

    // Create snapshot
    const snapshot = await this.snapshotRepository.create({
      trackerId,
      enteredBy,
      ...data,
    });

    // Add guild visibility if provided
    if (data.guildIds && data.guildIds.length > 0) {
      for (const guildId of data.guildIds) {
        await this.visibilityService.addVisibility(
          'tracker_snapshot',
          snapshot.id,
          'guild',
          guildId,
        );
      }
    }

    this.logger.log(`Created snapshot ${snapshot.id} for tracker ${trackerId}`);

    return snapshot;
  }

  /**
   * Get snapshot by ID
   */
  async getSnapshotById(id: string) {
    const snapshot = await this.snapshotRepository.findById(id);
    if (!snapshot) {
      throw new NotFoundException('Snapshot not found');
    }
    return snapshot;
  }

  /**
   * Get all snapshots for a tracker
   */
  async getSnapshotsByTracker(trackerId: string) {
    // Verify tracker exists
    const tracker = await this.trackerRepository.findById(trackerId);
    if (!tracker) {
      throw new NotFoundException('Tracker not found');
    }

    return this.snapshotRepository.findByTrackerId(trackerId);
  }

  /**
   * Get snapshots for a tracker filtered by season
   */
  async getSnapshotsByTrackerAndSeason(
    trackerId: string,
    seasonNumber: number,
  ) {
    // Verify tracker exists
    const tracker = await this.trackerRepository.findById(trackerId);
    if (!tracker) {
      throw new NotFoundException('Tracker not found');
    }

    return this.snapshotRepository.findByTrackerIdAndSeason(
      trackerId,
      seasonNumber,
    );
  }

  /**
   * Get snapshots visible to a guild
   */
  async getSnapshotsByGuild(guildId: string) {
    return this.snapshotRepository.findByGuildId(guildId);
  }

  /**
   * Add guild visibility to a snapshot
   */
  async addGuildVisibility(snapshotId: string, guildId: string) {
    const snapshot = await this.getSnapshotById(snapshotId);
    await this.visibilityService.addVisibility(
      'tracker_snapshot',
      snapshotId,
      'guild',
      guildId,
    );
    this.logger.log(
      `Added guild ${guildId} visibility to snapshot ${snapshotId}`,
    );
  }

  /**
   * Remove guild visibility from a snapshot
   */
  async removeGuildVisibility(snapshotId: string, guildId: string) {
    const snapshot = await this.getSnapshotById(snapshotId);
    await this.visibilityService.removeVisibility(
      'tracker_snapshot',
      snapshotId,
      'guild',
      guildId,
    );
    this.logger.log(
      `Removed guild ${guildId} visibility from snapshot ${snapshotId}`,
    );
  }
}
