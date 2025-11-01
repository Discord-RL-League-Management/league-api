import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GuildSettings, SettingsHistory } from '@prisma/client';
import { GuildSettingsDto } from '../dto/guild-settings.dto';
import { GuildSettings as SettingsInterface } from '../interfaces/settings.interface';

/**
 * GuildSettingsRepository - Handles all database operations for GuildSettings entity
 * Single Responsibility: Data access layer for GuildSettings entity
 * 
 * Separates data access concerns from business logic.
 * Settings are stored as JSON, so this repository handles serialization/deserialization.
 */
@Injectable()
export class GuildSettingsRepository {
  constructor(private prisma: PrismaService) {}

  /**
   * Find settings by guild ID
   */
  async findByGuildId(guildId: string): Promise<GuildSettings | null> {
    return this.prisma.guildSettings.findUnique({
      where: { guildId },
    });
  }

  /**
   * Check if settings exist for guild
   */
  async exists(guildId: string): Promise<boolean> {
    const settings = await this.prisma.guildSettings.findUnique({
      where: { guildId },
      select: { id: true },
    });
    return !!settings;
  }

  /**
   * Create new settings
   */
  async create(
    guildId: string,
    settings: SettingsInterface | Record<string, any>,
  ): Promise<GuildSettings> {
    return this.prisma.guildSettings.create({
      data: {
        guildId,
        settings: JSON.parse(JSON.stringify(settings)),
      },
    });
  }

  /**
   * Update existing settings
   */
  async update(
    guildId: string,
    settings: SettingsInterface | Record<string, any>,
  ): Promise<GuildSettings> {
    return this.prisma.guildSettings.update({
      where: { guildId },
      data: {
        settings: JSON.parse(JSON.stringify(settings)),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Upsert settings (create if not exists, update if exists)
   */
  async upsert(
    guildId: string,
    settings: SettingsInterface | Record<string, any>,
  ): Promise<GuildSettings> {
    return this.prisma.guildSettings.upsert({
      where: { guildId },
      update: {
        settings: JSON.parse(JSON.stringify(settings)),
        updatedAt: new Date(),
      },
      create: {
        guildId,
        settings: JSON.parse(JSON.stringify(settings)),
      },
    });
  }

  /**
   * Delete settings
   */
  async delete(guildId: string): Promise<GuildSettings> {
    return this.prisma.guildSettings.delete({
      where: { guildId },
    });
  }

  /**
   * Update settings with transaction and history tracking
   */
  async updateWithHistory(
    guildId: string,
    settings: SettingsInterface | Record<string, any>,
    userId: string,
    action: 'update' | 'reset' = 'update',
    changes?: Record<string, any>,
  ): Promise<GuildSettings> {
    return this.prisma.$transaction(async (tx) => {
      const updatedSettings = await tx.guildSettings.upsert({
        where: { guildId },
        update: {
          settings: JSON.parse(JSON.stringify(settings)),
          updatedAt: new Date(),
        },
        create: {
          guildId,
          settings: JSON.parse(JSON.stringify(settings)),
        },
      });

      await tx.settingsHistory.create({
        data: {
          guildId,
          userId,
          action,
          changes: changes || (settings as Record<string, any>),
          timestamp: new Date(),
        },
      });

      return updatedSettings;
    });
  }

  /**
   * Get settings history for audit trail
   */
  async getHistory(
    guildId: string,
    limit: number = 50,
  ): Promise<
    Array<
      SettingsHistory & {
        user?: {
          username: string | null;
          globalName: string | null;
        };
      }
    >
  > {
    return this.prisma.settingsHistory.findMany({
      where: { guildId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        user: {
          select: { username: true, globalName: true },
        },
      },
    });
  }
}


