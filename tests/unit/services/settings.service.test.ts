/**
 * SettingsService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SettingsService } from '@/infrastructure/settings/services/settings.service';
import { SettingsRepository } from '@/infrastructure/settings/repositories/settings.repository';
import { Settings } from '@prisma/client';

describe('SettingsService', () => {
  let service: SettingsService;
  let mockRepository: SettingsRepository;

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
    it('should_return_settings_when_found', async () => {
      const ownerType = 'guild';
      const ownerId = 'guild123';
      const settings: Settings = {
        id: 'settings123',
        ownerType,
        ownerId,
        settings: { key: 'value' },
        schemaVersion: 1,
        configVersion: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockRepository.findByOwner).mockResolvedValue(settings);

      const result = await service.getSettings(ownerType, ownerId);

      expect(result).toEqual(settings);
      expect(mockRepository.findByOwner).toHaveBeenCalledWith(
        ownerType,
        ownerId,
      );
    });

    it('should_return_null_when_settings_not_found', async () => {
      const ownerType = 'guild';
      const ownerId = 'guild123';

      vi.mocked(mockRepository.findByOwner).mockResolvedValue(null);

      const result = await service.getSettings(ownerType, ownerId);

      expect(result).toBeNull();
    });
  });

  describe('upsertSettings', () => {
    it('should_create_settings_when_not_exists', async () => {
      const ownerType = 'guild';
      const ownerId = 'guild123';
      const settingsData = { key: 'value' };
      const schemaVersion = 1;
      const configVersion = '1.0.0';
      const createdSettings: Settings = {
        id: 'settings123',
        ownerType,
        ownerId,
        settings: settingsData,
        schemaVersion,
        configVersion: configVersion || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockRepository.upsert).mockResolvedValue(createdSettings);

      const result = await service.upsertSettings(
        ownerType,
        ownerId,
        settingsData,
        schemaVersion,
        configVersion,
      );

      expect(result).toEqual(createdSettings);
      expect(mockRepository.upsert).toHaveBeenCalledWith(
        ownerType,
        ownerId,
        {
          ownerType,
          ownerId,
          settings: settingsData,
          schemaVersion,
          configVersion,
        },
        undefined,
      );
    });

    it('should_update_settings_when_exists', async () => {
      const ownerType = 'guild';
      const ownerId = 'guild123';
      const settingsData = { key: 'updated_value' };
      const updatedSettings: Settings = {
        id: 'settings123',
        ownerType,
        ownerId,
        settings: settingsData,
        schemaVersion: 1,
        configVersion: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockRepository.upsert).mockResolvedValue(updatedSettings);

      const result = await service.upsertSettings(
        ownerType,
        ownerId,
        settingsData,
      );

      expect(result).toEqual(updatedSettings);
    });

    it('should_support_transaction_client', async () => {
      const ownerType = 'guild';
      const ownerId = 'guild123';
      const settingsData = { key: 'value' };
      const tx = {} as any;
      const createdSettings: Settings = {
        id: 'settings123',
        ownerType,
        ownerId,
        settings: settingsData,
        schemaVersion: 1,
        configVersion: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockRepository.upsert).mockResolvedValue(createdSettings);

      const result = await service.upsertSettings(
        ownerType,
        ownerId,
        settingsData,
        1,
        undefined,
        tx,
      );

      expect(result).toEqual(createdSettings);
      expect(mockRepository.upsert).toHaveBeenCalledWith(
        ownerType,
        ownerId,
        expect.any(Object),
        tx,
      );
    });
  });

  describe('updateSettings', () => {
    it('should_update_existing_settings', async () => {
      const ownerType = 'guild';
      const ownerId = 'guild123';
      const settingsData = { key: 'updated_value' };
      const updatedSettings: Settings = {
        id: 'settings123',
        ownerType,
        ownerId,
        settings: settingsData,
        schemaVersion: 1,
        configVersion: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockRepository.update).mockResolvedValue(updatedSettings);

      const result = await service.updateSettings(
        ownerType,
        ownerId,
        settingsData,
      );

      expect(result).toEqual(updatedSettings);
      expect(mockRepository.update).toHaveBeenCalledWith(
        ownerType,
        ownerId,
        {
          settings: settingsData,
          updatedAt: expect.any(Date),
        },
        undefined,
      );
    });

    it('should_support_transaction_client', async () => {
      const ownerType = 'guild';
      const ownerId = 'guild123';
      const settingsData = { key: 'value' };
      const tx = {} as any;
      const updatedSettings: Settings = {
        id: 'settings123',
        ownerType,
        ownerId,
        settings: settingsData,
        schemaVersion: 1,
        configVersion: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(mockRepository.update).mockResolvedValue(updatedSettings);

      const result = await service.updateSettings(
        ownerType,
        ownerId,
        settingsData,
        tx,
      );

      expect(result).toEqual(updatedSettings);
      expect(mockRepository.update).toHaveBeenCalledWith(
        ownerType,
        ownerId,
        expect.any(Object),
        tx,
      );
    });
  });
});
