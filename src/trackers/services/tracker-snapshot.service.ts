import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ILoggingService } from '../../infrastructure/logging/interfaces/logging.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { TrackerSnapshotRepository } from '../repositories/tracker-snapshot.repository';
import { TrackerRepository } from '../repositories/tracker.repository';
import { VisibilityService } from '../../infrastructure/visibility/services/visibility.service';

@Injectable()
export class TrackerSnapshotService {
  private readonly serviceName = TrackerSnapshotService.name;

  constructor(
    private readonly prisma: PrismaService,
    private readonly snapshotRepository: TrackerSnapshotRepository,
    private readonly trackerRepository: TrackerRepository,
    private readonly visibilityService: VisibilityService,
    @Inject(ILoggingService)
    private readonly loggingService: ILoggingService,
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
    const tracker = await this.trackerRepository.findById(trackerId);
    if (!tracker) {
      throw new NotFoundException('Tracker not found');
    }

    if (tracker.isDeleted) {
      throw new BadRequestException(
        'Cannot create snapshot for deleted tracker',
      );
    }

    const snapshot = await this.snapshotRepository.create({
      trackerId,
      enteredBy,
      ...data,
    });

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

    this.loggingService.log(
      `Created snapshot ${snapshot.id} for tracker ${trackerId}`,
      this.serviceName,
    );

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
   * @param trackerId - Tracker ID
   * @param skipValidation - If true, skips tracker existence check (use when tracker already validated)
   */
  async getSnapshotsByTracker(trackerId: string, skipValidation = false) {
    if (!skipValidation) {
      const tracker = await this.trackerRepository.findById(trackerId);
      if (!tracker) {
        throw new NotFoundException('Tracker not found');
      }
    }

    return this.snapshotRepository.findByTrackerId(trackerId);
  }

  /**
   * Get snapshots for a tracker filtered by season
   * @param trackerId - Tracker ID
   * @param seasonNumber - Season number to filter by
   * @param skipValidation - If true, skips tracker existence check (use when tracker already validated)
   */
  async getSnapshotsByTrackerAndSeason(
    trackerId: string,
    seasonNumber: number,
    skipValidation = false,
  ) {
    if (!skipValidation) {
      const tracker = await this.trackerRepository.findById(trackerId);
      if (!tracker) {
        throw new NotFoundException('Tracker not found');
      }
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
    await this.getSnapshotById(snapshotId);
    await this.visibilityService.addVisibility(
      'tracker_snapshot',
      snapshotId,
      'guild',
      guildId,
    );
    this.loggingService.log(
      `Added guild ${guildId} visibility to snapshot ${snapshotId}`,
      this.serviceName,
    );
  }

  /**
   * Remove guild visibility from a snapshot
   */
  async removeGuildVisibility(snapshotId: string, guildId: string) {
    await this.getSnapshotById(snapshotId);
    await this.visibilityService.removeVisibility(
      'tracker_snapshot',
      snapshotId,
      'guild',
      guildId,
    );
    this.loggingService.log(
      `Removed guild ${guildId} visibility from snapshot ${snapshotId}`,
      this.serviceName,
    );
  }
}
