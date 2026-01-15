/**
 * GuildMemberQueryService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { GuildMemberQueryService } from './guild-member-query.service';
import { GuildMemberRepository } from '../repositories/guild-member.repository';

describe('GuildMemberQueryService', () => {
  let service: GuildMemberQueryService;
  let mockRepository: GuildMemberRepository;

  beforeEach(async () => {
    mockRepository = {
      findByGuildId: vi.fn(),
      searchByUsername: vi.fn(),
      findByUserId: vi.fn(),
      findWithGuildSettings: vi.fn(),
    } as unknown as GuildMemberRepository;

    const module = await Test.createTestingModule({
      providers: [
        GuildMemberQueryService,
        { provide: GuildMemberRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<GuildMemberQueryService>(GuildMemberQueryService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findAll', () => {
    it('should_return_members_with_pagination_when_guild_exists', async () => {
      const mockResult = {
        members: [{ id: 'member_1' }],
        pagination: { page: 1, limit: 50, total: 1, pages: 1 },
      };
      vi.spyOn(mockRepository, 'findByGuildId').mockResolvedValue(
        mockResult as never,
      );

      const result = await service.findAll('guild_123');

      expect(result).toEqual(mockResult);
      expect(mockRepository.findByGuildId).toHaveBeenCalledWith('guild_123', {
        page: 1,
        limit: 50,
        includeUser: true,
      });
    });

    it('should_use_custom_pagination_when_provided', async () => {
      const mockResult = {
        members: [],
        pagination: { page: 2, limit: 20, total: 0, pages: 0 },
      };
      vi.spyOn(mockRepository, 'findByGuildId').mockResolvedValue(
        mockResult as never,
      );

      await service.findAll('guild_123', 2, 20);

      expect(mockRepository.findByGuildId).toHaveBeenCalledWith('guild_123', {
        page: 2,
        limit: 20,
        includeUser: true,
      });
    });

    it('should_throw_exception_when_repository_fails', async () => {
      vi.spyOn(mockRepository, 'findByGuildId').mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findAll('guild_123')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('searchMembers', () => {
    it('should_return_matching_members_when_query_provided', async () => {
      const mockResult = {
        members: [{ id: 'member_1', username: 'testuser' }],
        pagination: { page: 1, limit: 20, total: 1, pages: 1 },
      };
      vi.spyOn(mockRepository, 'searchByUsername').mockResolvedValue(
        mockResult as never,
      );

      const result = await service.searchMembers('guild_123', 'test');

      expect(result).toEqual(mockResult);
      expect(mockRepository.searchByUsername).toHaveBeenCalledWith(
        'guild_123',
        'test',
        {
          page: 1,
          limit: 20,
          includeUser: true,
        },
      );
    });

    it('should_use_custom_pagination_when_provided', async () => {
      const mockResult = {
        members: [],
        pagination: { page: 3, limit: 10, total: 0, pages: 0 },
      };
      vi.spyOn(mockRepository, 'searchByUsername').mockResolvedValue(
        mockResult as never,
      );

      await service.searchMembers('guild_123', 'test', 3, 10);

      expect(mockRepository.searchByUsername).toHaveBeenCalledWith(
        'guild_123',
        'test',
        {
          page: 3,
          limit: 10,
          includeUser: true,
        },
      );
    });

    it('should_throw_exception_when_repository_fails', async () => {
      vi.spyOn(mockRepository, 'searchByUsername').mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.searchMembers('guild_123', 'test')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getUserGuilds', () => {
    it('should_return_user_guilds_when_user_exists', async () => {
      const mockGuilds = [{ id: 'guild_1' }, { id: 'guild_2' }];
      vi.spyOn(mockRepository, 'findByUserId').mockResolvedValue(
        mockGuilds as never,
      );

      const result = await service.getUserGuilds('user_123');

      expect(result).toEqual(mockGuilds);
      expect(mockRepository.findByUserId).toHaveBeenCalledWith('user_123', {
        guild: true,
      });
    });

    it('should_throw_exception_when_repository_fails', async () => {
      vi.spyOn(mockRepository, 'findByUserId').mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.getUserGuilds('user_123')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findMembersByUser', () => {
    it('should_return_memberships_when_user_exists', async () => {
      const mockMemberships = [{ id: 'member_1' }];
      vi.spyOn(mockRepository, 'findByUserId').mockResolvedValue(
        mockMemberships as never,
      );

      const result = await service.findMembersByUser('user_123');

      expect(result).toEqual(mockMemberships);
      expect(mockRepository.findByUserId).toHaveBeenCalledWith('user_123', {
        guild: true,
      });
    });

    it('should_throw_exception_when_repository_fails', async () => {
      vi.spyOn(mockRepository, 'findByUserId').mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findMembersByUser('user_123')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findMemberWithGuildSettings', () => {
    it('should_return_member_with_guild_when_exists', async () => {
      const mockMember = { id: 'member_1', guild: { id: 'guild_1' } };
      vi.spyOn(mockRepository, 'findWithGuildSettings').mockResolvedValue(
        mockMember as never,
      );

      const result = await service.findMemberWithGuildSettings(
        'user_123',
        'guild_123',
      );

      expect(result).toEqual(mockMember);
      expect(mockRepository.findWithGuildSettings).toHaveBeenCalledWith(
        'user_123',
        'guild_123',
      );
    });

    it('should_return_null_when_member_not_found', async () => {
      vi.spyOn(mockRepository, 'findWithGuildSettings').mockResolvedValue(null);

      const result = await service.findMemberWithGuildSettings(
        'user_123',
        'guild_123',
      );

      expect(result).toBeNull();
    });

    it('should_return_null_when_repository_fails', async () => {
      vi.spyOn(mockRepository, 'findWithGuildSettings').mockRejectedValue(
        new Error('Database error'),
      );

      const result = await service.findMemberWithGuildSettings(
        'user_123',
        'guild_123',
      );

      expect(result).toBeNull();
    });
  });
});
