import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  TrackerScrapingLog,
  TrackerScrapingStatus,
  Prisma,
} from '@prisma/client';

/**
 * TrackerScrapingLogRepository - Handles all database operations for TrackerScrapingLog entity
 * Single Responsibility: Data access layer for TrackerScrapingLog entity
 */
@Injectable()
export class TrackerScrapingLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new scraping log entry
   */
  async create(
    data: {
      trackerId: string;
      status: TrackerScrapingStatus;
      seasonsScraped: number;
      seasonsFailed: number;
      startedAt: Date;
      errorMessage?: string | null;
      metadata?: Prisma.InputJsonValue;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<TrackerScrapingLog> {
    const client = tx || this.prisma;
    return client.trackerScrapingLog.create({
      data,
    });
  }

  /**
   * Update a scraping log entry
   */
  async update(
    id: string,
    data: {
      status?: TrackerScrapingStatus;
      seasonsScraped?: number;
      seasonsFailed?: number;
      completedAt?: Date | null;
      errorMessage?: string | null;
      metadata?: Prisma.InputJsonValue;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<TrackerScrapingLog> {
    const client = tx || this.prisma;
    return client.trackerScrapingLog.update({
      where: { id },
      data,
    });
  }

  /**
   * Find scraping logs by tracker ID
   */
  async findByTrackerId(
    trackerId: string,
    options?: { limit?: number; orderBy?: 'asc' | 'desc' },
    tx?: Prisma.TransactionClient,
  ): Promise<TrackerScrapingLog[]> {
    const client = tx || this.prisma;
    return client.trackerScrapingLog.findMany({
      where: { trackerId },
      orderBy: { startedAt: options?.orderBy || 'desc' },
      take: options?.limit,
    });
  }
}
