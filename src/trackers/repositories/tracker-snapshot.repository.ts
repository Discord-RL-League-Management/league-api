import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, TrackerSnapshot } from '@prisma/client';

@Injectable()
export class TrackerSnapshotRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    trackerId: string;
    capturedAt?: Date;
    seasonNumber?: number;
    enteredBy: string;
    ones?: number;
    twos?: number;
    threes?: number;
    fours?: number;
    onesGamesPlayed?: number;
    twosGamesPlayed?: number;
    threesGamesPlayed?: number;
    foursGamesPlayed?: number;
    guildIds?: string[];
  }): Promise<TrackerSnapshot> {
    return this.prisma.trackerSnapshot.create({
      data: {
        trackerId: data.trackerId,
        capturedAt: data.capturedAt || new Date(),
        seasonNumber: data.seasonNumber,
        enteredBy: data.enteredBy,
        ones: data.ones,
        twos: data.twos,
        threes: data.threes,
        fours: data.fours,
        onesGamesPlayed: data.onesGamesPlayed,
        twosGamesPlayed: data.twosGamesPlayed,
        threesGamesPlayed: data.threesGamesPlayed,
        foursGamesPlayed: data.foursGamesPlayed,
      },
      include: {
        tracker: true,
        enteredByUser: true,
      },
    });
  }

  async findById(id: string): Promise<TrackerSnapshot | null> {
    return this.prisma.trackerSnapshot.findUnique({
      where: { id },
      include: {
        tracker: true,
        enteredByUser: true,
      },
    });
  }

  async findByTrackerId(trackerId: string): Promise<TrackerSnapshot[]> {
    return this.prisma.trackerSnapshot.findMany({
      where: { trackerId },
      orderBy: { capturedAt: 'desc' },
      include: {
        enteredByUser: true,
      },
    });
  }

  async findByTrackerIdAndSeason(
    trackerId: string,
    seasonNumber: number,
  ): Promise<TrackerSnapshot[]> {
    return this.prisma.trackerSnapshot.findMany({
      where: {
        trackerId,
        seasonNumber,
      },
      orderBy: { capturedAt: 'desc' },
    });
  }

  async findByGuildId(guildId: string): Promise<TrackerSnapshot[]> {
    // This method will need to be updated to use VisibilityService
    // For now, we'll need to find visible snapshots via EntityVisibility
    // This will be handled by the service layer using VisibilityService
    const visibleEntities = await this.prisma.entityVisibility.findMany({
      where: {
        entityType: 'tracker_snapshot',
        targetType: 'guild',
        targetId: guildId,
      },
    });

    if (visibleEntities.length === 0) {
      return [];
    }

    const snapshotIds = visibleEntities.map((v) => v.entityId);

    return this.prisma.trackerSnapshot.findMany({
      where: {
        id: {
          in: snapshotIds,
        },
      },
      include: {
        tracker: {
          include: {
            user: true,
          },
        },
        enteredByUser: true,
      },
      orderBy: { capturedAt: 'desc' },
    });
  }
}






