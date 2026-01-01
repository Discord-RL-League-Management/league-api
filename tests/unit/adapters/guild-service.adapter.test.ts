/**
 * GuildServiceAdapter Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GuildServiceAdapter } from '@/guilds/adapters/guild-service.adapter';
import { GuildsService } from '@/guilds/guilds.service';
import { CreateGuildDto } from '@/guilds/dto/create-guild.dto';
import { UpdateGuildDto } from '@/guilds/dto/update-guild.dto';
import { GuildQueryOptions } from '@/guilds/interfaces/guild-query.options';
import { Guild } from '@prisma/client';

describe('GuildServiceAdapter', () => {
  let adapter: GuildServiceAdapter;
  let mockGuildsService: GuildsService;

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

  beforeEach(() => {
    mockGuildsService = {
      create: vi.fn(),
      findAll: vi.fn(),
      findOne: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      findActiveGuildIds: vi.fn(),
      exists: vi.fn(),
      upsert: vi.fn(),
    } as unknown as GuildsService;

    adapter = new GuildServiceAdapter(mockGuildsService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('create', () => {
    it('should_delegate_create_to_guilds_service_when_called', async () => {
      // ARRANGE
      const dto: CreateGuildDto = {
        id: '123456789012345678',
        name: 'Test Guild',
        ownerId: '987654321098765432',
        memberCount: 100,
      };
      vi.spyOn(mockGuildsService, 'create').mockResolvedValue(mockGuild);

      // ACT
      const result = await adapter.create(dto);

      // ASSERT
      expect(result).toBe(mockGuild);
      expect(mockGuildsService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should_delegate_find_all_to_guilds_service_when_called_without_params', async () => {
      // ARRANGE
      const expectedResult = {
        guilds: [mockGuild],
        pagination: {
          page: 1,
          limit: 50,
          total: 1,
          pages: 1,
        },
      };
      vi.spyOn(mockGuildsService, 'findAll').mockResolvedValue(expectedResult);

      // ACT
      const result = await adapter.findAll();

      // ASSERT
      expect(result).toBe(expectedResult);
      expect(mockGuildsService.findAll).toHaveBeenCalledWith(
        undefined,
        undefined,
      );
    });

    it('should_delegate_find_all_to_guilds_service_when_called_with_pagination', async () => {
      // ARRANGE
      const page = 2;
      const limit = 10;
      const expectedResult = {
        guilds: [mockGuild],
        pagination: {
          page: 2,
          limit: 10,
          total: 1,
          pages: 1,
        },
      };
      vi.spyOn(mockGuildsService, 'findAll').mockResolvedValue(expectedResult);

      // ACT
      const result = await adapter.findAll(page, limit);

      // ASSERT
      expect(result).toBe(expectedResult);
      expect(mockGuildsService.findAll).toHaveBeenCalledWith(page, limit);
    });
  });

  describe('findOne', () => {
    it('should_delegate_find_one_to_guilds_service_when_called_without_options', async () => {
      // ARRANGE
      const id = '123456789012345678';
      vi.spyOn(mockGuildsService, 'findOne').mockResolvedValue(mockGuild);

      // ACT
      const result = await adapter.findOne(id);

      // ASSERT
      expect(result).toBe(mockGuild);
      expect(mockGuildsService.findOne).toHaveBeenCalledWith(id, undefined);
    });

    it('should_delegate_find_one_to_guilds_service_when_called_with_options', async () => {
      // ARRANGE
      const id = '123456789012345678';
      const options: GuildQueryOptions = { includeMembers: true };
      vi.spyOn(mockGuildsService, 'findOne').mockResolvedValue(mockGuild);

      // ACT
      const result = await adapter.findOne(id, options);

      // ASSERT
      expect(result).toBe(mockGuild);
      expect(mockGuildsService.findOne).toHaveBeenCalledWith(id, options);
    });
  });

  describe('update', () => {
    it('should_delegate_update_to_guilds_service_when_called', async () => {
      // ARRANGE
      const id = '123456789012345678';
      const dto: UpdateGuildDto = {
        name: 'Updated Guild Name',
      };
      const updatedGuild = { ...mockGuild, name: dto.name || mockGuild.name };
      vi.spyOn(mockGuildsService, 'update').mockResolvedValue(updatedGuild);

      // ACT
      const result = await adapter.update(id, dto);

      // ASSERT
      expect(result).toBe(updatedGuild);
      expect(mockGuildsService.update).toHaveBeenCalledWith(id, dto);
    });
  });

  describe('remove', () => {
    it('should_delegate_remove_to_guilds_service_when_called', async () => {
      // ARRANGE
      const id = '123456789012345678';
      const removedGuild = { ...mockGuild, isActive: false };
      vi.spyOn(mockGuildsService, 'remove').mockResolvedValue(removedGuild);

      // ACT
      const result = await adapter.remove(id);

      // ASSERT
      expect(result).toBe(removedGuild);
      expect(mockGuildsService.remove).toHaveBeenCalledWith(id);
    });
  });

  describe('findActiveGuildIds', () => {
    it('should_delegate_find_active_guild_ids_to_guilds_service_when_called', async () => {
      // ARRANGE
      const expectedIds = ['123456789012345678', '987654321098765432'];
      vi.spyOn(mockGuildsService, 'findActiveGuildIds').mockResolvedValue(
        expectedIds,
      );

      // ACT
      const result = await adapter.findActiveGuildIds();

      // ASSERT
      expect(result).toBe(expectedIds);
      expect(mockGuildsService.findActiveGuildIds).toHaveBeenCalledWith();
    });
  });

  describe('exists', () => {
    it('should_delegate_exists_to_guilds_service_when_called', async () => {
      // ARRANGE
      const guildId = '123456789012345678';
      vi.spyOn(mockGuildsService, 'exists').mockResolvedValue(true);

      // ACT
      const result = await adapter.exists(guildId);

      // ASSERT
      expect(result).toBe(true);
      expect(mockGuildsService.exists).toHaveBeenCalledWith(guildId);
    });
  });

  describe('upsert', () => {
    it('should_delegate_upsert_to_guilds_service_when_called', async () => {
      // ARRANGE
      const dto: CreateGuildDto = {
        id: '123456789012345678',
        name: 'Test Guild',
        ownerId: '987654321098765432',
        memberCount: 100,
      };
      vi.spyOn(mockGuildsService, 'upsert').mockResolvedValue(mockGuild);

      // ACT
      const result = await adapter.upsert(dto);

      // ASSERT
      expect(result).toBe(mockGuild);
      expect(mockGuildsService.upsert).toHaveBeenCalledWith(dto);
    });
  });
});
