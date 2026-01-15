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
        updateMany: vi.fn(),
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
      $transaction: vi.fn(),
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

    it('should_include_user_when_includeUser_is_true', async () => {
      const mockMembers = [{ id: 'member-1', user: { id: 'user-1' } }];
      vi.mocked(mockPrisma.guildMember.findMany).mockResolvedValue(
        mockMembers as never,
      );
      vi.mocked(mockPrisma.guildMember.count).mockResolvedValue(1);

      await repository.findByGuildId('guild-1', {
        page: 1,
        limit: 50,
        includeUser: true,
      });

      expect(mockPrisma.guildMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({ user: expect.anything() }),
        }),
      );
    });

    it('should_calculate_pages_correctly', async () => {
      vi.mocked(mockPrisma.guildMember.findMany).mockResolvedValue([]);
      vi.mocked(mockPrisma.guildMember.count).mockResolvedValue(75);

      const result = await repository.findByGuildId('guild-1', {
        page: 1,
        limit: 50,
      });

      expect(result.pagination.pages).toBe(2);
      expect(result.pagination.total).toBe(75);
    });
  });

  describe('findAll', () => {
    it('should_return_paginated_members_when_options_provided', async () => {
      const mockMembers = [{ id: 'member-1' }, { id: 'member-2' }];
      vi.mocked(mockPrisma.guildMember.findMany).mockResolvedValue(
        mockMembers as never,
      );
      vi.mocked(mockPrisma.guildMember.count).mockResolvedValue(2);

      const result = await repository.findAll({ page: 1, limit: 50 });

      expect(result.data).toEqual(mockMembers);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });

    it('should_use_default_pagination_when_options_not_provided', async () => {
      vi.mocked(mockPrisma.guildMember.findMany).mockResolvedValue([]);
      vi.mocked(mockPrisma.guildMember.count).mockResolvedValue(0);

      const result = await repository.findAll();

      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
      expect(mockPrisma.guildMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 50,
        }),
      );
    });

    it('should_limit_results_to_max_100', async () => {
      vi.mocked(mockPrisma.guildMember.findMany).mockResolvedValue([]);
      vi.mocked(mockPrisma.guildMember.count).mockResolvedValue(0);

      await repository.findAll({ page: 1, limit: 200 });

      expect(mockPrisma.guildMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });

    it('should_calculate_skip_correctly_for_page_2', async () => {
      vi.mocked(mockPrisma.guildMember.findMany).mockResolvedValue([]);
      vi.mocked(mockPrisma.guildMember.count).mockResolvedValue(0);

      await repository.findAll({ page: 2, limit: 50 });

      expect(mockPrisma.guildMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 50, take: 50 }),
      );
    });
  });

  describe('findByUserId', () => {
    it('should_return_members_when_user_id_provided', async () => {
      const mockMembers = [{ id: 'member-1', userId: 'user-1' }];
      vi.mocked(mockPrisma.guildMember.findMany).mockResolvedValue(
        mockMembers as never,
      );

      const result = await repository.findByUserId('user-1');

      expect(result).toEqual(mockMembers);
      expect(mockPrisma.guildMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
    });

    it('should_include_guild_when_include_guild_is_true', async () => {
      const mockMembers = [{ id: 'member-1', guild: { id: 'guild-1' } }];
      vi.mocked(mockPrisma.guildMember.findMany).mockResolvedValue(
        mockMembers as never,
      );

      await repository.findByUserId('user-1', { guild: true });

      expect(mockPrisma.guildMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({ guild: true }),
        }),
      );
    });

    it('should_order_by_joinedAt_desc', async () => {
      vi.mocked(mockPrisma.guildMember.findMany).mockResolvedValue([]);

      await repository.findByUserId('user-1');

      expect(mockPrisma.guildMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { joinedAt: 'desc' },
        }),
      );
    });
  });

  describe('create', () => {
    it('should_create_member_when_valid_data_provided', async () => {
      const createDto = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        username: 'testuser',
        roles: ['role1'],
      };
      const mockMember = { id: 'member-1', ...createDto };
      vi.mocked(mockPrisma.guildMember.create).mockResolvedValue(
        mockMember as never,
      );

      const result = await repository.create(createDto);

      expect(result).toEqual(mockMember);
      expect(mockPrisma.guildMember.create).toHaveBeenCalledWith({
        data: {
          ...createDto,
          roles: createDto.roles,
        },
      });
    });

    it('should_use_empty_array_for_roles_when_not_provided', async () => {
      const createDto = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        username: 'testuser',
      };
      const mockMember = { id: 'member-1', ...createDto, roles: [] };
      vi.mocked(mockPrisma.guildMember.create).mockResolvedValue(
        mockMember as never,
      );

      await repository.create(createDto);

      expect(mockPrisma.guildMember.create).toHaveBeenCalledWith({
        data: {
          ...createDto,
          roles: [],
        },
      });
    });
  });

  describe('update', () => {
    it('should_update_member_when_valid_data_provided', async () => {
      const updateDto = { username: 'updateduser' };
      const mockMember = { id: 'member-1', ...updateDto };
      vi.mocked(mockPrisma.guildMember.update).mockResolvedValue(
        mockMember as never,
      );

      const result = await repository.update('member-1', updateDto);

      expect(result).toEqual(mockMember);
      expect(mockPrisma.guildMember.update).toHaveBeenCalledWith({
        where: { id: 'member-1' },
        data: {
          ...updateDto,
          updatedAt: expect.any(Date),
        },
      });
    });
  });

  describe('delete', () => {
    it('should_delete_member_when_id_provided', async () => {
      const mockMember = { id: 'member-1' };
      vi.mocked(mockPrisma.guildMember.delete).mockResolvedValue(
        mockMember as never,
      );

      const result = await repository.delete('member-1');

      expect(result).toEqual(mockMember);
      expect(mockPrisma.guildMember.delete).toHaveBeenCalledWith({
        where: { id: 'member-1' },
      });
    });
  });

  describe('exists', () => {
    it('should_return_true_when_member_exists', async () => {
      const mockMember = { id: 'member-1' };
      vi.mocked(mockPrisma.guildMember.findUnique).mockResolvedValue(
        mockMember as never,
      );

      const result = await repository.exists('member-1');

      expect(result).toBe(true);
      expect(mockPrisma.guildMember.findUnique).toHaveBeenCalledWith({
        where: { id: 'member-1' },
        select: { id: true },
      });
    });

    it('should_return_false_when_member_not_exists', async () => {
      vi.mocked(mockPrisma.guildMember.findUnique).mockResolvedValue(null);

      const result = await repository.exists('member-999');

      expect(result).toBe(false);
    });
  });

  describe('updateByCompositeKey', () => {
    it('should_update_member_when_composite_key_matches', async () => {
      const updateDto = { username: 'updateduser' };
      const mockMember = {
        id: 'member-1',
        ...updateDto,
        user: { id: 'user-1' },
      };
      vi.mocked(mockPrisma.guildMember.update).mockResolvedValue(
        mockMember as never,
      );

      const result = await repository.updateByCompositeKey(
        'user-1',
        'guild-1',
        updateDto,
      );

      expect(result).toEqual(mockMember);
      expect(mockPrisma.guildMember.update).toHaveBeenCalledWith({
        where: {
          userId_guildId: {
            userId: 'user-1',
            guildId: 'guild-1',
          },
        },
        data: {
          ...updateDto,
          updatedAt: expect.any(Date),
        },
        include: { user: true },
      });
    });
  });

  describe('deleteByCompositeKey', () => {
    it('should_delete_member_when_composite_key_matches', async () => {
      vi.mocked(mockPrisma.guildMember.delete).mockResolvedValue({} as never);

      await repository.deleteByCompositeKey('user-1', 'guild-1');

      expect(mockPrisma.guildMember.delete).toHaveBeenCalledWith({
        where: {
          userId_guildId: {
            userId: 'user-1',
            guildId: 'guild-1',
          },
        },
      });
    });
  });

  describe('existsByCompositeKey', () => {
    it('should_return_true_when_member_exists', async () => {
      const mockMember = { id: 'member-1' };
      vi.mocked(mockPrisma.guildMember.findUnique).mockResolvedValue(
        mockMember as never,
      );

      const result = await repository.existsByCompositeKey('user-1', 'guild-1');

      expect(result).toBe(true);
      expect(mockPrisma.guildMember.findUnique).toHaveBeenCalledWith({
        where: {
          userId_guildId: {
            userId: 'user-1',
            guildId: 'guild-1',
          },
        },
        select: { id: true },
      });
    });

    it('should_return_false_when_member_not_exists', async () => {
      vi.mocked(mockPrisma.guildMember.findUnique).mockResolvedValue(null);

      const result = await repository.existsByCompositeKey(
        'user-999',
        'guild-999',
      );

      expect(result).toBe(false);
    });
  });

  describe('updateById', () => {
    it('should_update_member_when_id_provided', async () => {
      const updateDto = { username: 'updateduser' };
      const mockMember = { id: 'member-1', ...updateDto };
      vi.mocked(mockPrisma.guildMember.update).mockResolvedValue(
        mockMember as never,
      );

      const result = await repository.updateById('member-1', updateDto);

      expect(result).toEqual(mockMember);
      expect(mockPrisma.guildMember.update).toHaveBeenCalledWith({
        where: { id: 'member-1' },
        data: {
          ...updateDto,
          updatedAt: expect.any(Date),
        },
      });
    });
  });

  describe('deleteById', () => {
    it('should_delete_member_when_id_provided', async () => {
      const mockMember = { id: 'member-1' };
      vi.mocked(mockPrisma.guildMember.delete).mockResolvedValue(
        mockMember as never,
      );

      const result = await repository.deleteById('member-1');

      expect(result).toEqual(mockMember);
      expect(mockPrisma.guildMember.delete).toHaveBeenCalledWith({
        where: { id: 'member-1' },
      });
    });
  });

  describe('existsById', () => {
    it('should_return_true_when_member_exists', async () => {
      const mockMember = { id: 'member-1' };
      vi.mocked(mockPrisma.guildMember.findUnique).mockResolvedValue(
        mockMember as never,
      );

      const result = await repository.existsById('member-1');

      expect(result).toBe(true);
      expect(mockPrisma.guildMember.findUnique).toHaveBeenCalledWith({
        where: { id: 'member-1' },
        select: { id: true },
      });
    });

    it('should_return_false_when_member_not_exists', async () => {
      vi.mocked(mockPrisma.guildMember.findUnique).mockResolvedValue(null);

      const result = await repository.existsById('member-999');

      expect(result).toBe(false);
    });
  });

  describe('findWithGuildSettings', () => {
    it('should_return_member_with_guild_when_found', async () => {
      const mockMember = {
        id: 'member-1',
        guild: { id: 'guild-1', name: 'Test Guild' },
      };
      vi.mocked(mockPrisma.guildMember.findUnique).mockResolvedValue(
        mockMember as never,
      );

      const result = await repository.findWithGuildSettings(
        'user-1',
        'guild-1',
      );

      expect(result).toEqual(mockMember);
      expect(mockPrisma.guildMember.findUnique).toHaveBeenCalledWith({
        where: {
          userId_guildId: {
            userId: 'user-1',
            guildId: 'guild-1',
          },
        },
        include: {
          guild: true,
        },
      });
    });

    it('should_return_null_when_member_not_found', async () => {
      vi.mocked(mockPrisma.guildMember.findUnique).mockResolvedValue(null);

      const result = await repository.findWithGuildSettings(
        'user-999',
        'guild-999',
      );

      expect(result).toBeNull();
    });
  });

  describe('upsert', () => {
    it('should_create_member_when_not_exists', async () => {
      const createDto = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        username: 'testuser',
        roles: ['role1'],
      };
      const mockMember = { id: 'member-1', ...createDto };
      vi.mocked(mockPrisma.guildMember.upsert).mockResolvedValue(
        mockMember as never,
      );

      const result = await repository.upsert(createDto);

      expect(result).toEqual(mockMember);
      expect(mockPrisma.guildMember.upsert).toHaveBeenCalledWith({
        where: {
          userId_guildId: {
            userId: createDto.userId,
            guildId: createDto.guildId,
          },
        },
        update: {
          username: createDto.username,
          nickname: createDto.nickname ?? null,
          roles: createDto.roles || [],
          updatedAt: expect.any(Date),
        },
        create: {
          ...createDto,
          roles: createDto.roles || [],
        },
      });
    });

    it('should_update_member_when_exists_with_updateData', async () => {
      const createDto = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        username: 'testuser',
      };
      const updateData = { username: 'updateduser' };
      const mockMember = { id: 'member-1', ...createDto, ...updateData };
      vi.mocked(mockPrisma.guildMember.upsert).mockResolvedValue(
        mockMember as never,
      );

      const result = await repository.upsert(createDto, updateData);

      expect(result).toEqual(mockMember);
      expect(mockPrisma.guildMember.upsert).toHaveBeenCalledWith({
        where: {
          userId_guildId: {
            userId: createDto.userId,
            guildId: createDto.guildId,
          },
        },
        update: {
          username: createDto.username,
          nickname: createDto.nickname ?? null,
          roles: createDto.roles || [],
          updatedAt: expect.any(Date),
          ...updateData,
        },
        create: {
          ...createDto,
          roles: createDto.roles || [],
        },
      });
    });

    it('should_use_empty_array_for_roles_when_not_provided', async () => {
      const createDto = {
        userId: '123456789012345678',
        guildId: '987654321098765432',
        username: 'testuser',
      };
      vi.mocked(mockPrisma.guildMember.upsert).mockResolvedValue({} as never);

      await repository.upsert(createDto);

      expect(mockPrisma.guildMember.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ roles: [] }),
          create: expect.objectContaining({ roles: [] }),
        }),
      );
    });
  });

  describe('updateRoles', () => {
    it('should_update_roles_when_valid_data_provided', async () => {
      const roles = ['role1', 'role2'];
      vi.mocked(mockPrisma.guildMember.updateMany).mockResolvedValue({
        count: 1,
      });

      const result = await repository.updateRoles('user-1', 'guild-1', roles);

      expect(result).toEqual({ count: 1 });
      expect(mockPrisma.guildMember.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', guildId: 'guild-1' },
        data: {
          roles,
          updatedAt: expect.any(Date),
        },
      });
    });
  });

  describe('countMembersWithRoles', () => {
    it('should_return_count_when_members_with_roles_exist', async () => {
      vi.mocked(mockPrisma.guildMember.count).mockResolvedValue(5);

      const result = await repository.countMembersWithRoles('guild-1', [
        'role1',
        'role2',
      ]);

      expect(result).toBe(5);
      expect(mockPrisma.guildMember.count).toHaveBeenCalledWith({
        where: {
          guildId: 'guild-1',
          roles: {
            hasSome: ['role1', 'role2'],
          },
        },
      });
    });

    it('should_return_zero_when_no_members_with_roles', async () => {
      vi.mocked(mockPrisma.guildMember.count).mockResolvedValue(0);

      const result = await repository.countMembersWithRoles('guild-1', [
        'role1',
      ]);

      expect(result).toBe(0);
    });
  });

  describe('searchByUsername', () => {
    it('should_return_matching_members_when_query_provided', async () => {
      const mockMembers = [{ id: 'member-1', username: 'testuser' }];
      vi.mocked(mockPrisma.guildMember.findMany).mockResolvedValue(
        mockMembers as never,
      );
      vi.mocked(mockPrisma.guildMember.count).mockResolvedValue(1);

      const result = await repository.searchByUsername('guild-1', 'test');

      expect(result.members).toEqual(mockMembers);
      expect(result.pagination.total).toBe(1);
      expect(mockPrisma.guildMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            guildId: 'guild-1',
            OR: [{ username: { contains: 'test', mode: 'insensitive' } }],
          },
        }),
      );
    });

    it('should_use_default_pagination_when_not_provided', async () => {
      vi.mocked(mockPrisma.guildMember.findMany).mockResolvedValue([]);
      vi.mocked(mockPrisma.guildMember.count).mockResolvedValue(0);

      const result = await repository.searchByUsername('guild-1', 'test');

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });

    it('should_include_user_when_includeUser_is_true', async () => {
      vi.mocked(mockPrisma.guildMember.findMany).mockResolvedValue([]);
      vi.mocked(mockPrisma.guildMember.count).mockResolvedValue(0);

      await repository.searchByUsername('guild-1', 'test', {
        includeUser: true,
      });

      expect(mockPrisma.guildMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({ user: expect.anything() }),
        }),
      );
    });

    it('should_calculate_pages_correctly', async () => {
      vi.mocked(mockPrisma.guildMember.findMany).mockResolvedValue([]);
      vi.mocked(mockPrisma.guildMember.count).mockResolvedValue(45);

      const result = await repository.searchByUsername('guild-1', 'test', {
        page: 1,
        limit: 20,
      });

      expect(result.pagination.pages).toBe(3);
      expect(result.pagination.total).toBe(45);
    });
  });

  describe('deleteByGuildId', () => {
    it('should_delete_all_members_for_guild', async () => {
      vi.mocked(mockPrisma.guildMember.deleteMany).mockResolvedValue({
        count: 5,
      });

      const result = await repository.deleteByGuildId('guild-1');

      expect(result).toEqual({ count: 5 });
      expect(mockPrisma.guildMember.deleteMany).toHaveBeenCalledWith({
        where: { guildId: 'guild-1' },
      });
    });

    it('should_return_zero_count_when_no_members_exist', async () => {
      vi.mocked(mockPrisma.guildMember.deleteMany).mockResolvedValue({
        count: 0,
      });

      const result = await repository.deleteByGuildId('guild-999');

      expect(result).toEqual({ count: 0 });
    });
  });

  describe('createMany', () => {
    it('should_create_multiple_members_when_valid_data_provided', async () => {
      const members = [
        {
          userId: '123456789012345678',
          guildId: '987654321098765432',
          username: 'user1',
          roles: ['role1'],
        },
        {
          userId: '123456789012345679',
          guildId: '987654321098765432',
          username: 'user2',
          roles: ['role2'],
        },
      ];
      vi.mocked(mockPrisma.guildMember.createMany).mockResolvedValue({
        count: 2,
      });

      const result = await repository.createMany(members);

      expect(result).toEqual({ count: 2 });
      expect(mockPrisma.guildMember.createMany).toHaveBeenCalledWith({
        data: members,
      });
    });

    it('should_return_zero_count_when_empty_array_provided', async () => {
      vi.mocked(mockPrisma.guildMember.createMany).mockResolvedValue({
        count: 0,
      });

      const result = await repository.createMany([]);

      expect(result).toEqual({ count: 0 });
    });
  });

  describe('syncMembers', () => {
    it('should_sync_members_in_transaction_when_valid_data_provided', async () => {
      const members = [
        {
          userId: '123456789012345678',
          username: 'user1',
          roles: ['role1'],
        },
        {
          userId: '123456789012345679',
          username: 'user2',
          nickname: 'nickname2',
          roles: ['role2'],
        },
      ];

      const mockTransactionClient = {
        guildMember: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          createMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
      };

      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback: any) => {
          return callback(mockTransactionClient);
        },
      );

      const result = await repository.syncMembers('guild-1', members);

      expect(result).toEqual({ synced: 2 });
      expect(mockTransactionClient.guildMember.deleteMany).toHaveBeenCalledWith(
        {
          where: { guildId: 'guild-1' },
        },
      );
      expect(mockTransactionClient.guildMember.createMany).toHaveBeenCalledWith(
        {
          data: [
            {
              userId: '123456789012345678',
              guildId: 'guild-1',
              username: 'user1',
              nickname: null,
              roles: ['role1'],
            },
            {
              userId: '123456789012345679',
              guildId: 'guild-1',
              username: 'user2',
              nickname: 'nickname2',
              roles: ['role2'],
            },
          ],
        },
      );
    });

    it('should_handle_empty_members_array', async () => {
      const mockTransactionClient = {
        guildMember: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          createMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      };

      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback: any) => {
          return callback(mockTransactionClient);
        },
      );

      const result = await repository.syncMembers('guild-1', []);

      expect(result).toEqual({ synced: 0 });
      expect(mockTransactionClient.guildMember.deleteMany).toHaveBeenCalled();
      expect(mockTransactionClient.guildMember.createMany).toHaveBeenCalledWith(
        {
          data: [],
        },
      );
    });

    it('should_set_nickname_to_null_when_not_provided', async () => {
      const members = [
        {
          userId: '123456789012345678',
          username: 'user1',
          roles: [],
        },
      ];

      const mockTransactionClient = {
        guildMember: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      };

      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback: any) => {
          return callback(mockTransactionClient);
        },
      );

      await repository.syncMembers('guild-1', members);

      expect(mockTransactionClient.guildMember.createMany).toHaveBeenCalledWith(
        {
          data: [
            {
              userId: '123456789012345678',
              guildId: 'guild-1',
              username: 'user1',
              nickname: null,
              roles: [],
            },
          ],
        },
      );
    });
  });

  describe('countStats', () => {
    it('should_return_statistics_when_guild_id_provided', async () => {
      vi.mocked(mockPrisma.guildMember.count)
        .mockResolvedValueOnce(10) // totalMembers
        .mockResolvedValueOnce(5) // activeMembers
        .mockResolvedValueOnce(2); // newThisWeek

      const result = await repository.countStats('guild-1');

      expect(result).toEqual({
        totalMembers: 10,
        activeMembers: 5,
        newThisWeek: 2,
      });
      expect(mockPrisma.guildMember.count).toHaveBeenCalledTimes(3);
      expect(mockPrisma.guildMember.count).toHaveBeenNthCalledWith(1, {
        where: { guildId: 'guild-1' },
      });
      expect(mockPrisma.guildMember.count).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: expect.objectContaining({
            guildId: 'guild-1',
            updatedAt: expect.objectContaining({ gte: expect.any(Date) }),
          }),
        }),
      );
      expect(mockPrisma.guildMember.count).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          where: expect.objectContaining({
            guildId: 'guild-1',
            joinedAt: expect.objectContaining({ gte: expect.any(Date) }),
          }),
        }),
      );
    });

    it('should_use_seven_days_ago_for_active_members_filter', async () => {
      const now = Date.now();
      vi.useFakeTimers();
      vi.setSystemTime(now);

      vi.mocked(mockPrisma.guildMember.count)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      await repository.countStats('guild-1');

      const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
      expect(mockPrisma.guildMember.count).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: expect.objectContaining({
            updatedAt: expect.objectContaining({ gte: sevenDaysAgo }),
          }),
        }),
      );

      vi.useRealTimers();
    });

    it('should_use_seven_days_ago_for_new_members_filter', async () => {
      const now = Date.now();
      vi.useFakeTimers();
      vi.setSystemTime(now);

      vi.mocked(mockPrisma.guildMember.count)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      await repository.countStats('guild-1');

      const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
      expect(mockPrisma.guildMember.count).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          where: expect.objectContaining({
            joinedAt: expect.objectContaining({ gte: sevenDaysAgo }),
          }),
        }),
      );

      vi.useRealTimers();
    });
  });
});
