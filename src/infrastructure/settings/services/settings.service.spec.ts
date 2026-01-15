/**
 * SettingsService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SettingsService } from './settings.service';
import { SettingsRepository } from '../repositories/settings.repository';
import { Settings, Prisma } from '@prisma/client';

describe('SettingsService', () => {
  let service: SettingsService;
  let mockRepository: SettingsRepository;

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
    mockRepository = {
      findByOwner: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    } as unknown as SettingsRepository;

    service = new SettingsService(mockRepository);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getSettings', () => {
    it('should_return_settings_when_settings_exist', async () => {
      const ownerType = 'Guild';
      const ownerId = 'guild_123';

      vi.mocked(mockRepository.findByOwner).mockResolvedValue(mockSettings);

      const result = await service.getSettings(ownerType, ownerId);

      expect(result).toEqual(mockSettings);
      expect(mockRepository.findByOwner).toHaveBeenCalledWith(
        ownerType,
        ownerId,
      );
    });

    it('should_return_null_when_settings_do_not_exist', async () => {
      const ownerType = 'Guild';
      const ownerId = 'guild_123';

      vi.mocked(mockRepository.findByOwner).mockResolvedValue(null);

      const result = await service.getSettings(ownerType, ownerId);

      expect(result).toBeNull();
      expect(mockRepository.findByOwner).toHaveBeenCalledWith(
        ownerType,
        ownerId,
      );
    });
  });

  describe('upsertSettings', () => {
    it('should_create_settings_when_settings_do_not_exist', async () => {
      const ownerType = 'Guild';
      const ownerId = 'guild_123';
      const settings = { key: 'value' };
      const schemaVersion = 1;
      const configVersion = '1.0.0';

      vi.mocked(mockRepository.upsert).mockResolvedValue(mockSettings);

      const result = await service.upsertSettings(
        ownerType,
        ownerId,
        settings,
        schemaVersion,
        configVersion,
      );

      expect(result).toEqual(mockSettings);
      expect(mockRepository.upsert).toHaveBeenCalledWith(
        ownerType,
        ownerId,
        {
          ownerType,
          ownerId,
          settings,
          schemaVersion,
          configVersion,
        },
        undefined,
      );
    });

    it('should_update_settings_when_settings_exist', async () => {
      const ownerType = 'Guild';
      const ownerId = 'guild_123';
      const settings = { key: 'updated-value' };
      const updatedSettings = { ...mockSettings, settings };

      vi.mocked(mockRepository.upsert).mockResolvedValue(updatedSettings);

      const result = await service.upsertSettings(ownerType, ownerId, settings);

      expect(result).toEqual(updatedSettings);
      expect(mockRepository.upsert).toHaveBeenCalledWith(
        ownerType,
        ownerId,
        {
          ownerType,
          ownerId,
          settings,
          schemaVersion: 1,
          configVersion: undefined,
        },
        undefined,
      );
    });

    it('should_use_default_schema_version_when_not_provided', async () => {
      const ownerType = 'Guild';
      const ownerId = 'guild_123';
      const settings = { key: 'value' };

      vi.mocked(mockRepository.upsert).mockResolvedValue(mockSettings);

      const result = await service.upsertSettings(ownerType, ownerId, settings);

      expect(result).toEqual(mockSettings);
      expect(mockRepository.upsert).toHaveBeenCalledWith(
        ownerType,
        ownerId,
        {
          ownerType,
          ownerId,
          settings,
          schemaVersion: 1,
          configVersion: undefined,
        },
        undefined,
      );
    });

    it('should_use_transaction_when_provided', async () => {
      const ownerType = 'Guild';
      const ownerId = 'guild_123';
      const settings = { key: 'value' };
      const mockTx = {} as Prisma.TransactionClient;

      vi.mocked(mockRepository.upsert).mockResolvedValue(mockSettings);

      const result = await service.upsertSettings(
        ownerType,
        ownerId,
        settings,
        1,
        undefined,
        mockTx,
      );

      expect(result).toEqual(mockSettings);
      expect(mockRepository.upsert).toHaveBeenCalledWith(
        ownerType,
        ownerId,
        {
          ownerType,
          ownerId,
          settings,
          schemaVersion: 1,
          configVersion: undefined,
        },
        mockTx,
      );
    });
  });

  describe('updateSettings', () => {
    it('should_update_existing_settings', async () => {
      const ownerType = 'Guild';
      const ownerId = 'guild_123';
      const settings = { key: 'updated-value' };
      const updatedSettings = { ...mockSettings, settings };

      vi.mocked(mockRepository.update).mockResolvedValue(updatedSettings);

      const result = await service.updateSettings(ownerType, ownerId, settings);

      expect(result).toEqual(updatedSettings);
      expect(mockRepository.update).toHaveBeenCalledWith(
        ownerType,
        ownerId,
        {
          settings,
          updatedAt: expect.any(Date),
        },
        undefined,
      );
    });

    it('should_use_transaction_when_provided', async () => {
      const ownerType = 'Guild';
      const ownerId = 'guild_123';
      const settings = { key: 'updated-value' };
      const mockTx = {} as Prisma.TransactionClient;

      vi.mocked(mockRepository.update).mockResolvedValue(mockSettings);

      const result = await service.updateSettings(
        ownerType,
        ownerId,
        settings,
        mockTx,
      );

      expect(result).toEqual(mockSettings);
      expect(mockRepository.update).toHaveBeenCalledWith(
        ownerType,
        ownerId,
        {
          settings,
          updatedAt: expect.any(Date),
        },
        mockTx,
      );
    });
  });
});
