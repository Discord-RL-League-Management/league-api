import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Prisma,
  TrackerRegistration,
  TrackerRegistrationStatus,
  GamePlatform,
  Game,
} from '@prisma/client';

@Injectable()
export class TrackerRegistrationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId: string;
    guildId: string;
    url: string;
    game?: Game;
    platform?: GamePlatform;
    username?: string;
    jobId?: string;
  }): Promise<TrackerRegistration> {
    return this.prisma.trackerRegistration.create({
      data,
      include: {
        user: true,
        guild: true,
      },
    });
  }

  async findById(id: string): Promise<TrackerRegistration | null> {
    return this.prisma.trackerRegistration.findUnique({
      where: { id },
      include: {
        user: true,
        guild: true,
        processedByUser: true,
        tracker: true,
      },
    });
  }

  async findByJobId(jobId: string): Promise<TrackerRegistration | null> {
    return this.prisma.trackerRegistration.findUnique({
      where: { jobId },
      include: {
        user: true,
        guild: true,
      },
    });
  }

  async findNextPendingByGuild(
    guildId: string,
  ): Promise<TrackerRegistration | null> {
    return this.prisma.trackerRegistration.findFirst({
      where: {
        guildId,
        status: 'PENDING',
      },
      include: {
        user: true,
        guild: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findByGuildAndUser(
    guildId: string,
    username: string,
  ): Promise<TrackerRegistration | null> {
    return this.prisma.trackerRegistration.findFirst({
      where: {
        guildId,
        user: {
          username: {
            equals: username,
            mode: 'insensitive',
          },
        },
        status: 'PENDING',
      },
      include: {
        user: true,
        guild: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async update(
    id: string,
    data: Prisma.TrackerRegistrationUpdateInput,
  ): Promise<TrackerRegistration> {
    return this.prisma.trackerRegistration.update({
      where: { id },
      data,
      include: {
        user: true,
        guild: true,
        processedByUser: true,
        tracker: true,
      },
    });
  }

  async updateStatus(
    id: string,
    status: TrackerRegistrationStatus,
    processedBy?: string,
    rejectionReason?: string,
  ): Promise<TrackerRegistration> {
    return this.prisma.trackerRegistration.update({
      where: { id },
      data: {
        status,
        processedBy,
        processedAt: status === 'COMPLETED' || status === 'REJECTED' ? new Date() : undefined,
        rejectionReason,
      },
      include: {
        user: true,
        guild: true,
        processedByUser: true,
        tracker: true,
      },
    });
  }

  async getStatsByGuild(guildId: string): Promise<{
    pending: number;
    processing: number;
    completed: number;
    rejected: number;
    failed: number;
  }> {
    const [pending, processing, completed, rejected, failed] =
      await Promise.all([
        this.prisma.trackerRegistration.count({
          where: { guildId, status: 'PENDING' },
        }),
        this.prisma.trackerRegistration.count({
          where: { guildId, status: 'PROCESSING' },
        }),
        this.prisma.trackerRegistration.count({
          where: { guildId, status: 'COMPLETED' },
        }),
        this.prisma.trackerRegistration.count({
          where: { guildId, status: 'REJECTED' },
        }),
        this.prisma.trackerRegistration.count({
          where: { guildId, status: 'FAILED' },
        }),
      ]);

    return {
      pending,
      processing,
      completed,
      rejected,
      failed,
    };
  }

  /**
   * Check if a URL has a pending or processing registration
   * Used for uniqueness validation
   */
  async findPendingByUrl(url: string): Promise<TrackerRegistration | null> {
    return this.prisma.trackerRegistration.findFirst({
      where: {
        url,
        status: {
          in: ['PENDING', 'PROCESSING'],
        },
      },
    });
  }
}


