/**
 * GuildRepository Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GuildRepository } from '@/guilds/repositories/guild.repository';
import { PrismaService } from '@/prisma/prisma.service';

describe('GuildRepository', () => {
  let repository: GuildRepository;
  let mockPrisma: PrismaService;

  const mockGuild = {
    id: 'guild-123',
    name: 'Test Guild',
    icon: 'guild_icon',
    ownerId: 'owner-123',
    memberCount: 100,
    isActive: true,
    joinedAt: new Date(),
    leftAt: null,
  };

  beforeEach(() => {
    // ARRANGE: Setup test dependencies
    mockPrisma = {
      guild: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    } as unknown as PrismaService;

    repository = new GuildRepository(mockPrisma);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findById', () => {
    it('should_return_guild_when_guild_exists', async () => {
      // ARRANGE
      vi.mocked(mockPrisma.guild.findUnique).mockResolvedValue(
        mockGuild as never,
      );

      // ACT
      const result = await repository.findById('guild-123');

      // ASSERT
      expect(result).toEqual(mockGuild);
      expect(mockPrisma.guild.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'guild-123' },
        }),
      );
    });

    it('should_return_null_when_guild_not_found', async () => {
      // ARRANGE
      vi.mocked(mockPrisma.guild.findUnique).mockResolvedValue(null);

      // ACT
      const result = await repository.findById('guild-999');

      // ASSERT
      expect(result).toBeNull();
    });

    it('should_include_members_when_option_provided', async () => {
      // ARRANGE
      vi.mocked(mockPrisma.guild.findUnique).mockResolvedValue(
        mockGuild as never,
      );

      // ACT
      await repository.findById('guild-123', { includeMembers: true });

      // ASSERT
      const callArgs = vi.mocked(mockPrisma.guild.findUnique).mock
        .calls[0]?.[0];
      expect(callArgs?.include).toHaveProperty('members');
    });
  });

  describe('findAll', () => {
    it('should_return_paginated_guilds_with_default_pagination', async () => {
      // ARRANGE
      const mockGuilds = [mockGuild];
      vi.mocked(mockPrisma.guild.findMany).mockResolvedValue(
        mockGuilds as never,
      );
      vi.mocked(mockPrisma.guild.count).mockResolvedValue(1);

      // ACT
      const result = await repository.findAll();

      // ASSERT
      expect(result.data).toEqual(mockGuilds);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });

    it('should_apply_custom_pagination_when_provided', async () => {
      // ARRANGE
      const mockGuilds = [mockGuild];
      vi.mocked(mockPrisma.guild.findMany).mockResolvedValue(
        mockGuilds as never,
      );
      vi.mocked(mockPrisma.guild.count).mockResolvedValue(1);

      // ACT
      const result = await repository.findAll({ page: 2, limit: 10 });

      // ASSERT
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      const callArgs = vi.mocked(mockPrisma.guild.findMany).mock.calls[0]?.[0];
      expect(callArgs?.skip).toBe(10);
      expect(callArgs?.take).toBe(10);
    });
  });

  describe('exists', () => {
    it('should_return_true_when_guild_exists', async () => {
      // ARRANGE
      vi.mocked(mockPrisma.guild.findUnique).mockResolvedValue({
        id: 'guild-123',
      } as never);

      // ACT
      const result = await repository.exists('guild-123');

      // ASSERT
      expect(result).toBe(true);
      expect(mockPrisma.guild.findUnique).toHaveBeenCalledWith({
        where: { id: 'guild-123' },
        select: { id: true },
      });
    });

    it('should_return_false_when_guild_not_found', async () => {
      // ARRANGE
      vi.mocked(mockPrisma.guild.findUnique).mockResolvedValue(null);

      // ACT
      const result = await repository.exists('guild-999');

      // ASSERT
      expect(result).toBe(false);
    });
  });
});
