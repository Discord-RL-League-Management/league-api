/**
 * SettingsRepository Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SettingsRepository } from './settings.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { Settings, Prisma } from '@prisma/client';

describe('SettingsRepository', () => {
  let repository: SettingsRepository;
  let mockPrisma: PrismaService;

  const mockSettings: Settings = {
    id: 'settings_123',
    ownerType: 'Guild',
    ownerId: 'guild_123',
    settings: { key: 'value' },
    schemaVersion: 1,
    configVersion: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrisma = {
      settings: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        upsert: vi.fn(),
      },
    } as unknown as PrismaService;

    repository = new SettingsRepository(mockPrisma);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findByOwner', () => {
    it('should_return_settings_when_found', async () => {
      const ownerType = 'Guild';
      const ownerId = 'guild_123';

      vi.mocked(mockPrisma.settings.findUnique).mockResolvedValue(mockSettings);

      const result = await repository.findByOwner(ownerType, ownerId);

      expect(result).toEqual(mockSettings);
      expect(mockPrisma.settings.findUnique).toHaveBeenCalledWith({
        where: {
          ownerType_ownerId: {
            ownerType,
            ownerId,
          },
        },
      });
    });

    it('should_return_null_when_settings_not_found', async () => {
      const ownerType = 'Guild';
      const ownerId = 'guild_123';

      vi.mocked(mockPrisma.settings.findUnique).mockResolvedValue(null);

      const result = await repository.findByOwner(ownerType, ownerId);

      expect(result).toBeNull();
      expect(mockPrisma.settings.findUnique).toHaveBeenCalledWith({
        where: {
          ownerType_ownerId: {
            ownerType,
            ownerId,
          },
        },
      });
    });
  });

  describe('create', () => {
    it('should_create_settings', async () => {
      const data: Prisma.SettingsCreateInput = {
        ownerType: 'Guild',
        ownerId: 'guild_123',
        settings: { key: 'value' },
        schemaVersion: 1,
      };

      vi.mocked(mockPrisma.settings.create).mockResolvedValue(mockSettings);

      const result = await repository.create(data);

      expect(result).toEqual(mockSettings);
      expect(mockPrisma.settings.create).toHaveBeenCalledWith({ data });
    });
  });

  describe('update', () => {
    it('should_update_settings_without_transaction', async () => {
      const ownerType = 'Guild';
      const ownerId = 'guild_123';
      const data: Prisma.SettingsUpdateInput = {
        settings: { key: 'updated-value' },
      };
      const updatedSettings = { ...mockSettings, settings: data.settings };

      vi.mocked(mockPrisma.settings.update).mockResolvedValue(updatedSettings);

      const result = await repository.update(ownerType, ownerId, data);

      expect(result).toEqual(updatedSettings);
      expect(mockPrisma.settings.update).toHaveBeenCalledWith({
        where: {
          ownerType_ownerId: {
            ownerType,
            ownerId,
          },
        },
        data,
      });
    });

    it('should_update_settings_with_transaction', async () => {
      const ownerType = 'Guild';
      const ownerId = 'guild_123';
      const data: Prisma.SettingsUpdateInput = {
        settings: { key: 'updated-value' },
      };
      const mockTx = {
        settings: {
          update: vi.fn().mockResolvedValue(mockSettings),
        },
      } as unknown as Prisma.TransactionClient;

      const result = await repository.update(ownerType, ownerId, data, mockTx);

      expect(result).toEqual(mockSettings);
      expect(mockTx.settings.update).toHaveBeenCalledWith({
        where: {
          ownerType_ownerId: {
            ownerType,
            ownerId,
          },
        },
        data,
      });
      expect(mockPrisma.settings.update).not.toHaveBeenCalled();
    });
  });

  describe('upsert', () => {
    it('should_upsert_settings_without_transaction', async () => {
      const ownerType = 'Guild';
      const ownerId = 'guild_123';
      const data: Prisma.SettingsCreateInput = {
        ownerType,
        ownerId,
        settings: { key: 'value' },
        schemaVersion: 1,
      };

      vi.mocked(mockPrisma.settings.upsert).mockResolvedValue(mockSettings);

      const result = await repository.upsert(ownerType, ownerId, data);

      expect(result).toEqual(mockSettings);
      expect(mockPrisma.settings.upsert).toHaveBeenCalledWith({
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
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should_upsert_settings_with_transaction', async () => {
      const ownerType = 'Guild';
      const ownerId = 'guild_123';
      const data: Prisma.SettingsCreateInput = {
        ownerType,
        ownerId,
        settings: { key: 'value' },
        schemaVersion: 1,
      };
      const mockTx = {
        settings: {
          upsert: vi.fn().mockResolvedValue(mockSettings),
        },
      } as unknown as Prisma.TransactionClient;

      const result = await repository.upsert(ownerType, ownerId, data, mockTx);

      expect(result).toEqual(mockSettings);
      expect(mockTx.settings.upsert).toHaveBeenCalledWith({
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
          updatedAt: expect.any(Date),
        },
      });
      expect(mockPrisma.settings.upsert).not.toHaveBeenCalled();
    });
  });
});
