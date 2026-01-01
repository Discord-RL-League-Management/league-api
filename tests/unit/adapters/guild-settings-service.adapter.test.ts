/**
 * GuildSettingsServiceAdapter Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GuildSettingsServiceAdapter } from '@/guilds/adapters/guild-settings-service.adapter';
import { GuildSettingsService } from '@/guilds/guild-settings.service';
import { GuildSettingsDto } from '@/guilds/dto/guild-settings.dto';
import { GuildSettings } from '@/guilds/interfaces/settings.interface';
import { Settings } from '@prisma/client';
import { JsonValue } from '@prisma/client/runtime/library';

describe('GuildSettingsServiceAdapter', () => {
  let adapter: GuildSettingsServiceAdapter;
  let mockGuildSettingsService: GuildSettingsService;

  const mockGuildSettings: GuildSettings = {
    _metadata: {
      version: '1.0.0',
      schemaVersion: 1,
    },
    bot_command_channels: [],
  };

  const mockSettings: Settings = {
    id: 'settings_123',
    ownerType: 'guild',
    ownerId: 'guild_123',
    settings: mockGuildSettings as unknown as JsonValue,
    schemaVersion: 1,
    configVersion: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockGuildSettingsService = {
      getSettings: vi.fn(),
      updateSettings: vi.fn(),
      resetSettings: vi.fn(),
      getSettingsHistory: vi.fn(),
    } as unknown as GuildSettingsService;

    adapter = new GuildSettingsServiceAdapter(mockGuildSettingsService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getSettings', () => {
    it('should_delegate_get_settings_to_guild_settings_service_when_called', async () => {
      // ARRANGE
      const guildId = '123456789012345678';
      vi.spyOn(mockGuildSettingsService, 'getSettings').mockResolvedValue(
        mockGuildSettings,
      );

      // ACT
      const result = await adapter.getSettings(guildId);

      // ASSERT
      expect(result).toBe(mockGuildSettings);
      expect(mockGuildSettingsService.getSettings).toHaveBeenCalledWith(
        guildId,
      );
    });
  });

  describe('updateSettings', () => {
    it('should_delegate_update_settings_to_guild_settings_service_when_called', async () => {
      // ARRANGE
      const guildId = '123456789012345678';
      const userId = 'user_123456789012345678';
      const dto: GuildSettingsDto = {
        bot_command_channels: [{ id: 'channel_123', name: 'Test Channel' }],
      };
      vi.spyOn(mockGuildSettingsService, 'updateSettings').mockResolvedValue(
        mockSettings,
      );

      // ACT
      const result = await adapter.updateSettings(guildId, dto, userId);

      // ASSERT
      expect(result).toBe(mockSettings);
      expect(mockGuildSettingsService.updateSettings).toHaveBeenCalledWith(
        guildId,
        dto,
        userId,
      );
    });
  });

  describe('resetSettings', () => {
    it('should_delegate_reset_settings_to_guild_settings_service_when_called', async () => {
      // ARRANGE
      const guildId = '123456789012345678';
      const userId = 'user_123456789012345678';
      vi.spyOn(mockGuildSettingsService, 'resetSettings').mockResolvedValue(
        mockSettings,
      );

      // ACT
      const result = await adapter.resetSettings(guildId, userId);

      // ASSERT
      expect(result).toBe(mockSettings);
      expect(mockGuildSettingsService.resetSettings).toHaveBeenCalledWith(
        guildId,
        userId,
      );
    });
  });

  describe('getSettingsHistory', () => {
    it('should_delegate_get_settings_history_to_guild_settings_service_when_called_without_limit', async () => {
      // ARRANGE
      const guildId = '123456789012345678';
      const expectedHistory = [
        {
          id: 'log_1',
          action: 'update',
          timestamp: new Date(),
          userId: 'user_123',
          guildId: 'guild_123',
          entityType: 'guild_settings',
          entityId: 'guild_123',
          eventType: 'SETTINGS_UPDATED',
          changes: {},
          metadata: {},
        },
        {
          id: 'log_2',
          action: 'reset',
          timestamp: new Date(),
          userId: 'user_123',
          guildId: 'guild_123',
          entityType: 'guild_settings',
          entityId: 'guild_123',
          eventType: 'SETTINGS_UPDATED',
          changes: {},
          metadata: {},
        },
      ];
      vi.spyOn(
        mockGuildSettingsService,
        'getSettingsHistory',
      ).mockResolvedValue(expectedHistory);

      // ACT
      const result = await adapter.getSettingsHistory(guildId);

      // ASSERT
      expect(result).toBe(expectedHistory);
      expect(mockGuildSettingsService.getSettingsHistory).toHaveBeenCalledWith(
        guildId,
        undefined,
      );
    });

    it('should_delegate_get_settings_history_to_guild_settings_service_when_called_with_limit', async () => {
      // ARRANGE
      const guildId = '123456789012345678';
      const limit = 10;
      const expectedHistory = [
        {
          id: 'log_1',
          action: 'update',
          timestamp: new Date(),
          userId: 'user_123',
          guildId: 'guild_123',
          entityType: 'guild_settings',
          entityId: 'guild_123',
          eventType: 'SETTINGS_UPDATED',
          changes: {},
          metadata: {},
        },
      ];
      vi.spyOn(
        mockGuildSettingsService,
        'getSettingsHistory',
      ).mockResolvedValue(expectedHistory);

      // ACT
      const result = await adapter.getSettingsHistory(guildId, limit);

      // ASSERT
      expect(result).toBe(expectedHistory);
      expect(mockGuildSettingsService.getSettingsHistory).toHaveBeenCalledWith(
        guildId,
        limit,
      );
    });
  });
});
