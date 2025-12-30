/**
 * GuildsService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InternalServerErrorException } from '@nestjs/common';
import { GuildsService } from '@/guilds/guilds.service';
import { GuildRepository } from '@/guilds/repositories/guild.repository';
import { SettingsDefaultsService } from '@/guilds/services/settings-defaults.service';
import { GuildErrorHandlerService } from '@/guilds/services/guild-error-handler.service';
import {
  GuildNotFoundException,
  GuildAlreadyExistsException,
} from '@/guilds/exceptions/guild.exceptions';
import { CreateGuildDto } from '@/guilds/dto/create-guild.dto';
import { UpdateGuildDto } from '@/guilds/dto/update-guild.dto';
import { Guild } from '@prisma/client';

describe('GuildsService', () => {
  let service: GuildsService;
  let mockGuildRepository: GuildRepository;
  let mockSettingsDefaults: SettingsDefaultsService;
  let mockErrorHandler: GuildErrorHandlerService;

  const mockGuild: Guild = {
    id: '123456789012345678',
    name: 'Test Guild',
    icon: 'guild_icon',
    ownerId: '987654321098765432',
    memberCount: 100,
    isActive: true,
    joinedAt: new Date(),
    leftAt: null,
  };

  const mockDefaultSettings = {
    _metadata: {
      schemaVersion: '1.0.0',
      configVersion: 1,
    },
    bot_command_channels: [],
  };

  beforeEach(() => {
    mockGuildRepository = {
      exists: vi.fn(),
      createWithSettings: vi.fn(),
      findAll: vi.fn(),
      findOne: vi.fn(),
      update: vi.fn(),
      removeWithCleanup: vi.fn(),
      findActiveGuildIds: vi.fn(),
      upsertWithSettings: vi.fn(),
    } as unknown as GuildRepository;

    mockSettingsDefaults = {
      getDefaults: vi.fn().mockReturnValue(mockDefaultSettings),
    } as unknown as SettingsDefaultsService;

    mockErrorHandler = {
      extractErrorInfo: vi.fn().mockReturnValue({
        message: 'Error message',
        code: 'ERROR_CODE',
        details: {},
      }),
    } as unknown as GuildErrorHandlerService;

    service = new GuildsService(
      mockSettingsDefaults,
      mockGuildRepository,
      mockErrorHandler,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('create', () => {
    it('should_create_guild_with_default_settings_when_guild_does_not_exist', async () => {
      const createDto: CreateGuildDto = {
        id: '123456789012345678',
        name: 'Test Guild',
        ownerId: '987654321098765432',
        memberCount: 100,
      };

      vi.mocked(mockGuildRepository.exists).mockResolvedValue(false);
      vi.mocked(mockGuildRepository.createWithSettings).mockResolvedValue(
        mockGuild,
      );

      const result = await service.create(createDto);

      expect(result).toEqual(mockGuild);
      expect(result.id).toBe(createDto.id);
      expect(result.name).toBe(createDto.name);
    });

    it('should_throw_GuildAlreadyExistsException_when_guild_already_exists', async () => {
      const createDto: CreateGuildDto = {
        id: '123456789012345678',
        name: 'Test Guild',
        ownerId: '987654321098765432',
      };

      vi.mocked(mockGuildRepository.exists).mockResolvedValue(true);

      await expect(service.create(createDto)).rejects.toThrow(
        GuildAlreadyExistsException,
      );
    });

    it('should_throw_InternalServerErrorException_when_repository_throws_unexpected_error', async () => {
      const createDto: CreateGuildDto = {
        id: '123456789012345678',
        name: 'Test Guild',
        ownerId: '987654321098765432',
      };

      vi.mocked(mockGuildRepository.exists).mockResolvedValue(false);
      vi.mocked(mockGuildRepository.createWithSettings).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.create(createDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should_propagate_ConflictException_when_repository_throws_conflict', async () => {
      const createDto: CreateGuildDto = {
        id: '123456789012345678',
        name: 'Test Guild',
        ownerId: '987654321098765432',
      };

      // Import ConflictException from the same module the service uses
      const { ConflictException } = await import(
        '@/common/exceptions/base.exception.js'
      );
      const conflictError = new ConflictException('Conflict');

      vi.mocked(mockGuildRepository.exists).mockResolvedValue(false);
      vi.mocked(mockGuildRepository.createWithSettings).mockRejectedValue(
        conflictError,
      );

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException as unknown as Error,
      );
    });
  });

  describe('findAll', () => {
    it('should_return_paginated_guilds_with_default_pagination', async () => {
      const mockGuilds = [
        mockGuild,
        { ...mockGuild, id: '999999999999999999' },
      ];
      const mockResult = {
        data: mockGuilds,
        page: 1,
        limit: 50,
        total: 2,
      };

      vi.mocked(mockGuildRepository.findAll).mockResolvedValue(mockResult);

      const result = await service.findAll();

      expect(result.guilds).toEqual(mockGuilds);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 50,
        total: 2,
        pages: 1,
      });
    });

    it('should_return_paginated_guilds_with_custom_pagination', async () => {
      const mockGuilds = Array.from({ length: 10 }, (_, i) => ({
        ...mockGuild,
        id: `${i}`.padStart(18, '0'),
      }));
      const mockResult = {
        data: mockGuilds,
        page: 2,
        limit: 5,
        total: 25,
      };

      vi.mocked(mockGuildRepository.findAll).mockResolvedValue(mockResult);

      const result = await service.findAll(2, 5);

      expect(result.pagination).toEqual({
        page: 2,
        limit: 5,
        total: 25,
        pages: 5, // Math.ceil(25 / 5)
      });
    });

    it('should_throw_InternalServerErrorException_when_repository_fails', async () => {
      vi.mocked(mockGuildRepository.findAll).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findAll()).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findOne', () => {
    it('should_return_guild_when_guild_exists', async () => {
      const guildId = '123456789012345678';
      vi.mocked(mockGuildRepository.findOne).mockResolvedValue(mockGuild);

      const result = await service.findOne(guildId);

      expect(result).toEqual(mockGuild);
      expect(result.id).toBe(guildId);
    });

    it('should_throw_GuildNotFoundException_when_guild_does_not_exist', async () => {
      const guildId = '999999999999999999';
      vi.mocked(mockGuildRepository.findOne).mockResolvedValue(null);

      await expect(service.findOne(guildId)).rejects.toThrow(
        GuildNotFoundException,
      );
    });

    it('should_throw_InternalServerErrorException_when_repository_fails', async () => {
      const guildId = '123456789012345678';
      vi.mocked(mockGuildRepository.findOne).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findOne(guildId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should_propagate_GuildNotFoundException_when_repository_throws_it', async () => {
      const guildId = '999999999999999999';
      const notFoundError = new GuildNotFoundException(guildId);
      vi.mocked(mockGuildRepository.findOne).mockRejectedValue(notFoundError);

      await expect(service.findOne(guildId)).rejects.toThrow(
        GuildNotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should_update_guild_when_guild_exists', async () => {
      const guildId = '123456789012345678';
      const updateDto: UpdateGuildDto = {
        name: 'Updated Guild Name',
        memberCount: 200,
      };
      const updatedGuild = { ...mockGuild, ...updateDto };

      vi.mocked(mockGuildRepository.exists).mockResolvedValue(true);
      vi.mocked(mockGuildRepository.update).mockResolvedValue(updatedGuild);

      const result = await service.update(guildId, updateDto);

      expect(result).toEqual(updatedGuild);
      expect(result.name).toBe(updateDto.name);
      expect(result.memberCount).toBe(updateDto.memberCount);
    });

    it('should_throw_GuildNotFoundException_when_guild_does_not_exist', async () => {
      const guildId = '999999999999999999';
      const updateDto: UpdateGuildDto = { name: 'Updated Name' };

      vi.mocked(mockGuildRepository.exists).mockResolvedValue(false);

      await expect(service.update(guildId, updateDto)).rejects.toThrow(
        GuildNotFoundException,
      );
    });

    it('should_throw_InternalServerErrorException_when_repository_fails', async () => {
      const guildId = '123456789012345678';
      const updateDto: UpdateGuildDto = { name: 'Updated Name' };

      vi.mocked(mockGuildRepository.exists).mockResolvedValue(true);
      vi.mocked(mockGuildRepository.update).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.update(guildId, updateDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('remove', () => {
    it('should_soft_delete_guild_when_guild_exists', async () => {
      const guildId = '123456789012345678';
      const deletedGuild = { ...mockGuild, isActive: false };

      vi.mocked(mockGuildRepository.exists).mockResolvedValue(true);
      vi.mocked(mockGuildRepository.removeWithCleanup).mockResolvedValue(
        deletedGuild,
      );

      const result = await service.remove(guildId);

      expect(result).toEqual(deletedGuild);
      expect(result.isActive).toBe(false);
    });

    it('should_throw_GuildNotFoundException_when_guild_does_not_exist', async () => {
      const guildId = '999999999999999999';

      vi.mocked(mockGuildRepository.exists).mockResolvedValue(false);

      await expect(service.remove(guildId)).rejects.toThrow(
        GuildNotFoundException,
      );
    });

    it('should_throw_InternalServerErrorException_when_repository_fails', async () => {
      const guildId = '123456789012345678';

      vi.mocked(mockGuildRepository.exists).mockResolvedValue(true);
      vi.mocked(mockGuildRepository.removeWithCleanup).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.remove(guildId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findActiveGuildIds', () => {
    it('should_return_array_of_active_guild_ids', async () => {
      const activeGuildIds = [
        '123456789012345678',
        '987654321098765432',
        '111111111111111111',
      ];

      vi.mocked(mockGuildRepository.findActiveGuildIds).mockResolvedValue(
        activeGuildIds,
      );

      const result = await service.findActiveGuildIds();

      expect(result).toEqual(activeGuildIds);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
    });

    it('should_return_empty_array_when_no_active_guilds_exist', async () => {
      vi.mocked(mockGuildRepository.findActiveGuildIds).mockResolvedValue([]);

      const result = await service.findActiveGuildIds();

      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });

    it('should_throw_InternalServerErrorException_when_repository_fails', async () => {
      vi.mocked(mockGuildRepository.findActiveGuildIds).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findActiveGuildIds()).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('exists', () => {
    it('should_return_true_when_guild_exists', async () => {
      const guildId = '123456789012345678';
      vi.mocked(mockGuildRepository.exists).mockResolvedValue(true);

      const result = await service.exists(guildId);

      expect(result).toBe(true);
    });

    it('should_return_false_when_guild_does_not_exist', async () => {
      const guildId = '999999999999999999';
      vi.mocked(mockGuildRepository.exists).mockResolvedValue(false);

      const result = await service.exists(guildId);

      expect(result).toBe(false);
    });
  });

  describe('upsert', () => {
    it('should_create_guild_when_guild_does_not_exist', async () => {
      const createDto: CreateGuildDto = {
        id: '123456789012345678',
        name: 'Test Guild',
        ownerId: '987654321098765432',
      };

      vi.mocked(mockGuildRepository.upsertWithSettings).mockResolvedValue(
        mockGuild,
      );

      const result = await service.upsert(createDto);

      expect(result).toEqual(mockGuild);
      expect(result.id).toBe(createDto.id);
    });

    it('should_update_guild_when_guild_already_exists', async () => {
      const createDto: CreateGuildDto = {
        id: '123456789012345678',
        name: 'Updated Guild Name',
        ownerId: '987654321098765432',
      };
      const updatedGuild = { ...mockGuild, name: createDto.name };

      vi.mocked(mockGuildRepository.upsertWithSettings).mockResolvedValue(
        updatedGuild,
      );

      const result = await service.upsert(createDto);

      expect(result).toEqual(updatedGuild);
      expect(result.name).toBe(createDto.name);
    });

    it('should_throw_InternalServerErrorException_with_error_details_when_repository_fails', async () => {
      const createDto: CreateGuildDto = {
        id: '123456789012345678',
        name: 'Test Guild',
        ownerId: '987654321098765432',
      };

      const dbError = new Error('Database constraint violation');
      vi.mocked(mockGuildRepository.upsertWithSettings).mockRejectedValue(
        dbError,
      );
      vi.mocked(mockErrorHandler.extractErrorInfo).mockReturnValue({
        message: 'Failed to upsert guild',
        code: 'GUILD_UPSERT_ERROR',
        details: { constraint: 'unique_guild_id' },
      });

      await expect(service.upsert(createDto)).rejects.toThrow(
        InternalServerErrorException,
      );

      // Verify error contains extracted error info
      await expect(service.upsert(createDto)).rejects.toThrow(
        'Failed to upsert guild',
      );
    });
  });
});
