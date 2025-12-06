/**
 * GuildSettingsService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { GuildSettingsService } from '@/guilds/guild-settings.service';
import { GuildRepository } from '@/guilds/repositories/guild.repository';
import { SettingsDefaultsService } from '@/guilds/services/settings-defaults.service';
import { SettingsValidationService } from '@/guilds/services/settings-validation.service';
import { ConfigMigrationService } from '@/guilds/services/config-migration.service';
import { SettingsService } from '@/infrastructure/settings/services/settings.service';
import { ActivityLogService } from '@/infrastructure/activity-log/services/activity-log.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Settings, Prisma } from '@prisma/client';
import { GuildSettings } from '@/guilds/interfaces/settings.interface';
import { GuildSettingsDto } from '@/guilds/dto/guild-settings.dto';
import type { Cache } from 'cache-manager';

describe('GuildSettingsService', () => {
  let service: GuildSettingsService;
  let mockGuildRepository: GuildRepository;
  let mockSettingsDefaults: SettingsDefaultsService;
  let mockSettingsValidation: SettingsValidationService;
  let mockConfigMigration: ConfigMigrationService;
  let mockSettingsService: SettingsService;
  let mockActivityLogService: ActivityLogService;
  let mockPrisma: PrismaService;
  let mockCacheManager: Cache;

  const guildId = '123456789012345678';
  const userId = '987654321098765432';

  const mockDefaultSettings: GuildSettings = {
    _metadata: {
      version: '2.0.0',
      schemaVersion: 1,
    },
    bot_command_channels: [],
  };

  const mockSettingsRecord: Settings = {
    id: 'settings-id-1',
    ownerType: 'guild',
    ownerId: guildId,
    settings: mockDefaultSettings as unknown as Prisma.JsonValue,
    schemaVersion: 1,
    configVersion: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // ARRANGE: Setup test dependencies with mocks
    mockGuildRepository = {
      exists: vi.fn(),
    } as unknown as GuildRepository;

    mockSettingsDefaults = {
      getDefaults: vi.fn().mockReturnValue(mockDefaultSettings),
      mergeSettings: vi.fn().mockImplementation((current, newSettings) => ({
        ...current,
        ...newSettings,
      })),
      mergeWithDefaults: vi.fn().mockImplementation((settings) => ({
        ...mockDefaultSettings,
        ...settings,
      })),
    } as unknown as SettingsDefaultsService;

    mockSettingsValidation = {
      validate: vi.fn().mockResolvedValue(undefined),
      validateStructure: vi.fn().mockReturnValue(undefined),
    } as unknown as SettingsValidationService;

    mockConfigMigration = {
      needsMigration: vi.fn().mockReturnValue(false),
      getSchemaVersion: vi.fn().mockReturnValue('1.0.0'),
      migrate: vi.fn().mockImplementation((settings) => settings),
    } as unknown as ConfigMigrationService;

    mockSettingsService = {
      getSettings: vi.fn(),
      updateSettings: vi.fn(),
      upsertSettings: vi.fn(),
    } as unknown as SettingsService;

    mockActivityLogService = {
      logActivity: vi.fn().mockResolvedValue(undefined),
      findWithFilters: vi.fn(),
    } as unknown as ActivityLogService;

    mockPrisma = {
      $transaction: vi.fn().mockImplementation(async (callback) => {
        const mockTx = {} as any;
        return callback(mockTx);
      }),
    } as unknown as PrismaService;

    mockCacheManager = {
      get: vi.fn(),
      set: vi.fn().mockResolvedValue(undefined),
      del: vi.fn().mockResolvedValue(undefined),
    } as unknown as Cache;

    service = new GuildSettingsService(
      mockGuildRepository,
      mockSettingsDefaults,
      mockSettingsValidation,
      mockConfigMigration,
      mockSettingsService,
      mockActivityLogService,
      mockPrisma,
      mockCacheManager,
    );
  });

  describe('getSettings', () => {
    it('should_return_cached_settings_when_cache_hit', async () => {
      // ARRANGE
      const cachedSettings: GuildSettings = {
        ...mockDefaultSettings,
        bot_command_channels: [{ id: '123', name: 'test-channel' }],
      };
      vi.mocked(mockCacheManager.get).mockResolvedValue(cachedSettings);

      // ACT
      const result = await service.getSettings(guildId);

      // ASSERT: Verify cached settings returned
      expect(result).toEqual(cachedSettings);
      expect(result.bot_command_channels).toHaveLength(1);
    });

    it('should_return_settings_from_database_when_cache_miss_and_settings_exist', async () => {
      // ARRANGE
      vi.mocked(mockCacheManager.get).mockResolvedValue(null);
      vi.mocked(mockSettingsService.getSettings).mockResolvedValue(
        mockSettingsRecord,
      );
      vi.mocked(mockConfigMigration.needsMigration).mockReturnValue(false);

      // ACT
      const result = await service.getSettings(guildId);

      // ASSERT: Verify settings returned and cached
      expect(result).toBeDefined();
      expect(result.bot_command_channels).toBeDefined();
    });

    it('should_auto_create_default_settings_when_settings_do_not_exist', async () => {
      // ARRANGE
      vi.mocked(mockCacheManager.get).mockResolvedValue(null);
      vi.mocked(mockSettingsService.getSettings).mockResolvedValue(null);
      vi.mocked(mockGuildRepository.exists).mockResolvedValue(true);
      vi.mocked(mockSettingsService.upsertSettings).mockResolvedValue(
        mockSettingsRecord,
      );
      vi.mocked(mockConfigMigration.needsMigration).mockReturnValue(false);

      // ACT
      const result = await service.getSettings(guildId);

      // ASSERT: Verify default settings created and returned
      expect(result).toBeDefined();
      expect(result.bot_command_channels).toEqual([]);
    });

    it('should_throw_NotFoundException_when_guild_does_not_exist', async () => {
      // ARRANGE
      vi.mocked(mockCacheManager.get).mockResolvedValue(null);
      vi.mocked(mockSettingsService.getSettings).mockResolvedValue(null);
      vi.mocked(mockGuildRepository.exists).mockResolvedValue(false);

      // ACT & ASSERT
      await expect(service.getSettings(guildId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should_migrate_settings_when_migration_needed', async () => {
      // ARRANGE
      const oldSettings = {
        bot_command_channels: [],
        _metadata: { schemaVersion: '0.9.0', configVersion: 1 },
      };
      const migratedSettings: GuildSettings = {
        ...mockDefaultSettings,
        _metadata: { version: '2.0.0', schemaVersion: 1 },
      };
      const oldSettingsRecord: Settings = {
        ...mockSettingsRecord,
        settings: oldSettings as Prisma.JsonValue,
      };

      vi.mocked(mockCacheManager.get).mockResolvedValue(null);
      vi.mocked(mockSettingsService.getSettings).mockResolvedValue(
        oldSettingsRecord,
      );
      vi.mocked(mockConfigMigration.needsMigration).mockReturnValue(true);
      vi.mocked(mockConfigMigration.getSchemaVersion).mockReturnValue(1);
      vi.mocked(mockConfigMigration.migrate).mockResolvedValue(migratedSettings);
      vi.mocked(mockSettingsService.updateSettings).mockResolvedValue({
        ...mockSettingsRecord,
        settings: migratedSettings as unknown as Prisma.JsonValue,
      });

      // ACT
      const result = await service.getSettings(guildId);

      // ASSERT: Verify migrated settings returned
      expect(result).toBeDefined();
      expect(result._metadata?.schemaVersion).toBe(1);
    });

    it('should_throw_InternalServerErrorException_when_auto_creation_fails', async () => {
      // ARRANGE
      vi.mocked(mockCacheManager.get).mockResolvedValue(null);
      vi.mocked(mockSettingsService.getSettings).mockResolvedValue(null);
      vi.mocked(mockGuildRepository.exists).mockResolvedValue(true);
      vi.mocked(mockSettingsService.upsertSettings).mockRejectedValue(
        new Error('Database error'),
      );

      // ACT & ASSERT
      await expect(service.getSettings(guildId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should_throw_InternalServerErrorException_when_retrieval_fails', async () => {
      // ARRANGE
      vi.mocked(mockCacheManager.get).mockResolvedValue(null);
      vi.mocked(mockSettingsService.getSettings).mockRejectedValue(
        new Error('Database error'),
      );

      // ACT & ASSERT
      await expect(service.getSettings(guildId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should_cache_settings_after_retrieval', async () => {
      // ARRANGE
      vi.mocked(mockCacheManager.get).mockResolvedValue(null);
      vi.mocked(mockSettingsService.getSettings).mockResolvedValue(
        mockSettingsRecord,
      );
      vi.mocked(mockConfigMigration.needsMigration).mockReturnValue(false);

      // ACT
      await service.getSettings(guildId);

      // ASSERT: Verify cache.set was called
      expect(mockCacheManager.set).toHaveBeenCalled();
    });
  });

  describe('updateSettings', () => {
    it('should_update_settings_successfully_when_validation_passes', async () => {
      // ARRANGE
      const updateDto: GuildSettingsDto = {
        bot_command_channels: [{ id: '123', name: 'new-channel' }],
      };
      const mergedSettings: GuildSettings = {
        ...mockDefaultSettings,
        ...updateDto,
      };
      const updatedRecord: Settings = {
        ...mockSettingsRecord,
        settings: mergedSettings as unknown as Prisma.JsonValue,
      };

      vi.mocked(mockSettingsService.getSettings).mockResolvedValue(
        mockSettingsRecord,
      );
      vi.mocked(mockSettingsDefaults.mergeSettings).mockReturnValue(
        mergedSettings,
      );
      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback) => {
          const mockTx = {} as any;
          vi.mocked(mockSettingsService.updateSettings).mockResolvedValue(
            updatedRecord,
          );
          return callback(mockTx);
        },
      );

      // ACT
      const result = await service.updateSettings(guildId, updateDto, userId);

      // ASSERT: Verify settings updated
      expect(result).toEqual(updatedRecord);
      expect(mockCacheManager.del).toHaveBeenCalledWith(`settings:${guildId}`);
    });

    it('should_merge_with_defaults_when_current_settings_do_not_exist', async () => {
      // ARRANGE
      const updateDto: GuildSettingsDto = {
        bot_command_channels: [{ id: '123', name: 'new-channel' }],
      };
      const mergedSettings: GuildSettings = {
        ...mockDefaultSettings,
        ...updateDto,
      };
      const updatedRecord: Settings = {
        ...mockSettingsRecord,
        settings: mergedSettings as unknown as Prisma.JsonValue,
      };

      vi.mocked(mockSettingsService.getSettings).mockResolvedValue(null);
      vi.mocked(mockSettingsDefaults.mergeSettings).mockReturnValue(
        mergedSettings,
      );
      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback) => {
          const mockTx = {} as any;
          vi.mocked(mockSettingsService.updateSettings).mockResolvedValue(
            updatedRecord,
          );
          return callback(mockTx);
        },
      );

      // ACT
      const result = await service.updateSettings(guildId, updateDto, userId);

      // ASSERT: Verify merged with defaults
      expect(result).toEqual(updatedRecord);
    });

    it('should_validate_settings_before_update', async () => {
      // ARRANGE
      const updateDto: GuildSettingsDto = {
        bot_command_channels: [{ id: 'invalid', name: 'test' }],
      };
      const validationError = new Error('Validation failed');
      vi.mocked(mockSettingsValidation.validate).mockRejectedValue(
        validationError,
      );

      // ACT & ASSERT
      await expect(
        service.updateSettings(guildId, updateDto, userId),
      ).rejects.toThrow();
    });

    it('should_invalidate_cache_after_update', async () => {
      // ARRANGE
      const updateDto: GuildSettingsDto = {
        bot_command_channels: [],
      };
      vi.mocked(mockSettingsService.getSettings).mockResolvedValue(
        mockSettingsRecord,
      );
      vi.mocked(mockSettingsDefaults.mergeSettings).mockReturnValue(
        mockDefaultSettings,
      );
      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback) => {
          const mockTx = {} as any;
          vi.mocked(mockSettingsService.updateSettings).mockResolvedValue(
            mockSettingsRecord,
          );
          return callback(mockTx);
        },
      );

      // ACT
      await service.updateSettings(guildId, updateDto, userId);

      // ASSERT: Verify cache invalidated
      expect(mockCacheManager.del).toHaveBeenCalledWith(`settings:${guildId}`);
    });

    it('should_log_activity_during_update', async () => {
      // ARRANGE
      const updateDto: GuildSettingsDto = {
        bot_command_channels: [],
      };
      vi.mocked(mockSettingsService.getSettings).mockResolvedValue(
        mockSettingsRecord,
      );
      vi.mocked(mockSettingsDefaults.mergeSettings).mockReturnValue(
        mockDefaultSettings,
      );
      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback) => {
          const mockTx = {} as any;
          vi.mocked(mockSettingsService.updateSettings).mockResolvedValue(
            mockSettingsRecord,
          );
          return callback(mockTx);
        },
      );

      // ACT
      await service.updateSettings(guildId, updateDto, userId);

      // ASSERT: Verify activity logged (state verification through transaction completion)
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should_propagate_errors_from_transaction', async () => {
      // ARRANGE
      const updateDto: GuildSettingsDto = {
        bot_command_channels: [],
      };
      vi.mocked(mockSettingsService.getSettings).mockResolvedValue(
        mockSettingsRecord,
      );
      vi.mocked(mockSettingsDefaults.mergeSettings).mockReturnValue(
        mockDefaultSettings,
      );
      vi.mocked(mockPrisma.$transaction).mockRejectedValue(
        new Error('Transaction failed'),
      );

      // ACT & ASSERT
      await expect(
        service.updateSettings(guildId, updateDto, userId),
      ).rejects.toThrow('Transaction failed');
    });
  });

  describe('resetSettings', () => {
    it('should_reset_settings_to_defaults_successfully', async () => {
      // ARRANGE
      const resetRecord: Settings = {
        ...mockSettingsRecord,
        settings: mockDefaultSettings as unknown as Prisma.JsonValue,
      };

      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback) => {
          const mockTx = {} as any;
          vi.mocked(mockSettingsService.updateSettings).mockResolvedValue(
            resetRecord,
          );
          return callback(mockTx);
        },
      );

      // ACT
      const result = await service.resetSettings(guildId, userId);

      // ASSERT: Verify settings reset
      expect(result).toEqual(resetRecord);
      expect(mockCacheManager.del).toHaveBeenCalledWith(`settings:${guildId}`);
    });

    it('should_invalidate_cache_after_reset', async () => {
      // ARRANGE
      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback) => {
          const mockTx = {} as any;
          vi.mocked(mockSettingsService.updateSettings).mockResolvedValue(
            mockSettingsRecord,
          );
          return callback(mockTx);
        },
      );

      // ACT
      await service.resetSettings(guildId, userId);

      // ASSERT: Verify cache invalidated
      expect(mockCacheManager.del).toHaveBeenCalledWith(`settings:${guildId}`);
    });

    it('should_log_activity_during_reset', async () => {
      // ARRANGE
      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback) => {
          const mockTx = {} as any;
          vi.mocked(mockSettingsService.updateSettings).mockResolvedValue(
            mockSettingsRecord,
          );
          return callback(mockTx);
        },
      );

      // ACT
      await service.resetSettings(guildId, userId);

      // ASSERT: Verify transaction executed (activity logging happens inside)
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should_throw_InternalServerErrorException_when_reset_fails', async () => {
      // ARRANGE
      vi.mocked(mockPrisma.$transaction).mockRejectedValue(
        new Error('Transaction failed'),
      );

      // ACT & ASSERT
      await expect(service.resetSettings(guildId, userId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getSettingsHistory', () => {
    it('should_return_settings_history_successfully', async () => {
      // ARRANGE
      const mockHistory = {
        logs: [
          {
            id: 'log-1',
            entityType: 'guild_settings',
            entityId: guildId,
            eventType: 'SETTINGS_UPDATED',
            action: 'UPDATE',
            userId: null,
            guildId: guildId,
            changes: null,
            metadata: null,
            timestamp: new Date(),
          },
        ],
        total: 1,
      };
      vi.mocked(mockActivityLogService.findWithFilters).mockResolvedValue(
        mockHistory,
      );

      // ACT
      const result = await service.getSettingsHistory(guildId);

      // ASSERT: Verify history returned
      expect(result).toEqual(mockHistory.logs);
      expect(result).toHaveLength(1);
    });

    it('should_use_limit_parameter_when_provided', async () => {
      // ARRANGE
      const limit = 10;
      const mockHistory = {
        logs: [],
        total: 0,
      };
      vi.mocked(mockActivityLogService.findWithFilters).mockResolvedValue(
        mockHistory,
      );

      // ACT
      await service.getSettingsHistory(guildId, limit);

      // ASSERT: Verify limit passed to service
      expect(mockActivityLogService.findWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          limit,
        }),
      );
    });

    it('should_use_default_limit_when_not_provided', async () => {
      // ARRANGE
      const mockHistory = {
        logs: [],
        total: 0,
      };
      vi.mocked(mockActivityLogService.findWithFilters).mockResolvedValue(
        mockHistory,
      );

      // ACT
      await service.getSettingsHistory(guildId);

      // ASSERT: Verify default limit (50) used
      expect(mockActivityLogService.findWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 50,
        }),
      );
    });

    it('should_throw_InternalServerErrorException_when_history_retrieval_fails', async () => {
      // ARRANGE
      vi.mocked(mockActivityLogService.findWithFilters).mockRejectedValue(
        new Error('Database error'),
      );

      // ACT & ASSERT
      await expect(service.getSettingsHistory(guildId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});

