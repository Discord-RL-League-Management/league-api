/**
 * GuildMemberRepository Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { GuildMemberRepository } from './guild-member.repository';
import { PrismaService } from '../../prisma/prisma.service';

describe('GuildMemberRepository', () => {
  let repository: GuildMemberRepository;
  let mockPrisma: PrismaService;

  beforeEach(async () => {
    mockPrisma = {
      guildMember: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        upsert: vi.fn(),
      },
    } as unknown as PrismaService;

    const module = await Test.createTestingModule({
      providers: [
        GuildMemberRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<GuildMemberRepository>(GuildMemberRepository);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findByCompositeKey', () => {
    it('should_return_member_when_composite_key_matches', async () => {
      const mockMember = {
        id: 'member-1',
        userId: 'user-1',
        guildId: 'guild-1',
      };
      vi.mocked(mockPrisma.guildMember.findUnique).mockResolvedValue(
        mockMember as never,
      );

      const result = await repository.findByCompositeKey('user-1', 'guild-1');

      expect(result).toEqual(mockMember);
      expect(mockPrisma.guildMember.findUnique).toHaveBeenCalled();
    });

    it('should_return_null_when_member_not_found', async () => {
      vi.mocked(mockPrisma.guildMember.findUnique).mockResolvedValue(null);

      const result = await repository.findByCompositeKey('user-1', 'guild-1');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should_return_member_when_id_matches', async () => {
      const mockMember = { id: 'member-1' };
      vi.mocked(mockPrisma.guildMember.findUnique).mockResolvedValue(
        mockMember as never,
      );

      const result = await repository.findById('member-1');

      expect(result).toEqual(mockMember);
      expect(mockPrisma.guildMember.findUnique).toHaveBeenCalledWith({
        where: { id: 'member-1' },
      });
    });
  });

  describe('findByGuildId', () => {
    it('should_return_members_with_pagination_when_guild_id_provided', async () => {
      const mockMembers = [{ id: 'member-1' }];
      vi.mocked(mockPrisma.guildMember.findMany).mockResolvedValue(
        mockMembers as never,
      );
      vi.mocked(mockPrisma.guildMember.count).mockResolvedValue(1);

      const result = await repository.findByGuildId('guild-1', {
        page: 1,
        limit: 50,
      });

      expect(result.members).toEqual(mockMembers);
      expect(result.pagination.total).toBe(1);
      expect(mockPrisma.guildMember.findMany).toHaveBeenCalled();
    });

    it('should_limit_results_to_max_100', async () => {
      vi.mocked(mockPrisma.guildMember.findMany).mockResolvedValue([]);
      vi.mocked(mockPrisma.guildMember.count).mockResolvedValue(0);

      await repository.findByGuildId('guild-1', { page: 1, limit: 200 });

      expect(mockPrisma.guildMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });
  });
});
