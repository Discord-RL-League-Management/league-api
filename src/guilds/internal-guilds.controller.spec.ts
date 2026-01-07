/**
 * InternalGuildsController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { InternalGuildsController } from './internal-guilds.controller';
import { GuildsService } from './guilds.service';
import { GuildSettingsService } from './guild-settings.service';
import { GuildSyncService } from './services/guild-sync.service';

describe('InternalGuildsController', () => {
  let controller: InternalGuildsController;
  let mockGuildsService: GuildsService;
  let mockGuildSettingsService: GuildSettingsService;
  let mockGuildSyncService: GuildSyncService;

  const mockGuild = {
    id: 'guild-123',
    name: 'Test Guild',
    icon: 'icon_hash',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockGuildsService = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      exists: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    } as unknown as GuildsService;

    mockGuildSettingsService = {
      getSettings: vi.fn(),
      updateSettings: vi.fn(),
    } as unknown as GuildSettingsService;

    mockGuildSyncService = {
      syncGuildWithMembers: vi.fn(),
    } as unknown as GuildSyncService;

    const moduleRef = await Test.createTestingModule({
      controllers: [InternalGuildsController],
      providers: [
        { provide: GuildsService, useValue: mockGuildsService },
        { provide: GuildSettingsService, useValue: mockGuildSettingsService },
        { provide: GuildSyncService, useValue: mockGuildSyncService },
      ],
    }).compile();

    controller = moduleRef.get<InternalGuildsController>(
      InternalGuildsController,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findAll', () => {
    it('should_return_all_guilds_when_called', async () => {
      const guilds = [mockGuild];
      vi.mocked(mockGuildsService.findAll).mockResolvedValue(guilds);

      const result = await controller.findAll();

      expect(result).toEqual(guilds);
      expect(mockGuildsService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should_return_guild_when_found', async () => {
      vi.mocked(mockGuildsService.findOne).mockResolvedValue(mockGuild);

      const result = await controller.findOne('guild-123');

      expect(result).toEqual(mockGuild);
      expect(mockGuildsService.findOne).toHaveBeenCalledWith('guild-123');
    });
  });

  describe('create', () => {
    it('should_create_guild_when_valid_dto_provided', async () => {
      const createDto = { id: 'guild-123', name: 'Test Guild' };
      vi.mocked(mockGuildsService.create).mockResolvedValue(mockGuild);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockGuild);
      expect(mockGuildsService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('upsert', () => {
    it('should_return_200_when_guild_exists', async () => {
      const createDto = { id: 'guild-123', name: 'Test Guild' };
      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      } as unknown as Response;

      vi.mocked(mockGuildsService.exists).mockResolvedValue(true);
      vi.mocked(mockGuildsService.upsert).mockResolvedValue(mockGuild);

      await controller.upsert(createDto, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(mockGuild);
    });

    it('should_return_201_when_guild_created', async () => {
      const createDto = { id: 'guild-new', name: 'New Guild' };
      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      } as unknown as Response;

      vi.mocked(mockGuildsService.exists).mockResolvedValue(false);
      vi.mocked(mockGuildsService.upsert).mockResolvedValue(mockGuild);

      await controller.upsert(createDto, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CREATED);
    });
  });

  describe('syncGuildWithMembers', () => {
    it('should_sync_guild_with_members_when_valid_data_provided', async () => {
      const syncData = {
        guild: { id: 'guild-123', name: 'Test Guild' },
        members: [{ userId: 'user-1', username: 'User1', roles: ['role-1'] }],
        roles: { admin: [{ id: 'role-1', name: 'Admin' }] },
      };
      vi.mocked(mockGuildSyncService.syncGuildWithMembers).mockResolvedValue({
        guild: mockGuild,
        membersUpdated: 1,
      });

      const result = await controller.syncGuildWithMembers(
        'guild-123',
        syncData,
      );

      expect(mockGuildSyncService.syncGuildWithMembers).toHaveBeenCalledWith(
        'guild-123',
        syncData.guild,
        syncData.members,
        syncData.roles,
      );
      expect(result).toBeDefined();
    });
  });

  describe('update', () => {
    it('should_update_guild_when_valid_dto_provided', async () => {
      const updateDto = { name: 'Updated Guild' };
      vi.mocked(mockGuildsService.update).mockResolvedValue({
        ...mockGuild,
        name: 'Updated Guild',
      });

      const result = await controller.update('guild-123', updateDto);

      expect(mockGuildsService.update).toHaveBeenCalledWith(
        'guild-123',
        updateDto,
      );
      expect(result.name).toBe('Updated Guild');
    });
  });

  describe('remove', () => {
    it('should_remove_guild_when_called', async () => {
      vi.mocked(mockGuildsService.remove).mockResolvedValue(mockGuild);

      const result = await controller.remove('guild-123');

      expect(mockGuildsService.remove).toHaveBeenCalledWith('guild-123');
      expect(result).toEqual(mockGuild);
    });
  });

  describe('getSettings', () => {
    it('should_return_settings_when_guild_exists', async () => {
      const settings = { bot_command_channels: [] };
      vi.mocked(mockGuildSettingsService.getSettings).mockResolvedValue(
        settings,
      );

      const result = await controller.getSettings('guild-123');

      expect(mockGuildSettingsService.getSettings).toHaveBeenCalledWith(
        'guild-123',
      );
      expect(result).toEqual(settings);
    });
  });

  describe('updateSettings', () => {
    it('should_update_settings_when_valid_dto_provided', async () => {
      const settingsDto = { bot_command_channels: [] };
      const updatedSettings = { bot_command_channels: [] };
      vi.mocked(mockGuildSettingsService.updateSettings).mockResolvedValue(
        updatedSettings,
      );

      const result = await controller.updateSettings('guild-123', settingsDto);

      expect(mockGuildSettingsService.updateSettings).toHaveBeenCalledWith(
        'guild-123',
        settingsDto,
        'bot',
      );
      expect(result).toEqual(updatedSettings);
    });
  });
});
