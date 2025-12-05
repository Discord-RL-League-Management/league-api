import { Injectable } from '@nestjs/common';
import { SettingsRepository } from '../repositories/settings.repository';
import { Settings, Prisma } from '@prisma/client';

/**
 * SettingsService - Single Responsibility: Settings management
 *
 * Handles settings operations for any entity type.
 * Replaces domain-specific GuildSettings with generic settings pattern.
 */
@Injectable()
export class SettingsService {
  constructor(private readonly repository: SettingsRepository) {}

  /**
   * Get settings for an owner
   */
  async getSettings(
    ownerType: string,
    ownerId: string,
  ): Promise<Settings | null> {
    return this.repository.findByOwner(ownerType, ownerId);
  }

  /**
   * Upsert settings (create or update)
   */
  async upsertSettings(
    ownerType: string,
    ownerId: string,
    settings: Prisma.InputJsonValue,
    schemaVersion = 1,
    configVersion?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Settings> {
    return this.repository.upsert(
      ownerType,
      ownerId,
      {
        ownerType,
        ownerId,
        settings,
        schemaVersion,
        configVersion,
      },
      tx,
    );
  }

  /**
   * Update settings
   */
  async updateSettings(
    ownerType: string,
    ownerId: string,
    settings: Prisma.InputJsonValue,
    tx?: Prisma.TransactionClient,
  ): Promise<Settings> {
    return this.repository.update(
      ownerType,
      ownerId,
      {
        settings,
        updatedAt: new Date(),
      },
      tx,
    );
  }
}
