import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, Settings, PrismaClient } from '@prisma/client';

/**
 * SettingsRepository - Single Responsibility: Data access layer for Settings entity
 *
 * Pure data access layer with no business logic.
 * Handles all database operations for Settings model.
 */
@Injectable()
export class SettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find settings by owner
   */
  async findByOwner(
    ownerType: string,
    ownerId: string,
  ): Promise<Settings | null> {
    return this.prisma.settings.findUnique({
      where: {
        ownerType_ownerId: {
          ownerType,
          ownerId,
        },
      },
    });
  }

  /**
   * Create settings
   */
  async create(data: Prisma.SettingsCreateInput): Promise<Settings> {
    return this.prisma.settings.create({ data });
  }

  /**
   * Update settings
   */
  async update(
    ownerType: string,
    ownerId: string,
    data: Prisma.SettingsUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Settings> {
    const client = tx || this.prisma;
    return client.settings.update({
      where: {
        ownerType_ownerId: {
          ownerType,
          ownerId,
        },
      },
      data,
    });
  }

  /**
   * Upsert settings
   */
  async upsert(
    ownerType: string,
    ownerId: string,
    data: Prisma.SettingsCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Settings> {
    const client = tx || this.prisma;
    return client.settings.upsert({
      where: {
        ownerType_ownerId: {
          ownerType,
          ownerId,
        },
      },
      create: data,
      update: {
        settings: data.settings,
        schemaVersion: data.schemaVersion,
        configVersion: data.configVersion,
        updatedAt: new Date(),
      },
    });
  }
}
