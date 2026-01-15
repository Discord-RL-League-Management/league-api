/**
 * GuildMemberSyncService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { GuildMemberSyncService } from './guild-member-sync.service';
import { GuildMemberRepository } from '../repositories/guild-member.repository';

describe('GuildMemberSyncService', () => {
  let service: GuildMemberSyncService;
  let mockRepository: GuildMemberRepository;

  beforeEach(async () => {
    mockRepository = {
      syncMembers: vi.fn(),
      updateRoles: vi.fn(),
    } as unknown as GuildMemberRepository;

    const module = await Test.createTestingModule({
      providers: [
        GuildMemberSyncService,
        { provide: GuildMemberRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<GuildMemberSyncService>(GuildMemberSyncService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('syncGuildMembers', () => {
    it('should_sync_members_when_valid_data_provided', async () => {
      const members = [
        { userId: 'user_1', username: 'user1', roles: ['role_1'] },
        { userId: 'user_2', username: 'user2', roles: ['role_2'] },
      ];
      vi.spyOn(mockRepository, 'syncMembers').mockResolvedValue({
        synced: 2,
      } as never);

      const result = await service.syncGuildMembers('guild_123', members);

      expect(result).toEqual({ synced: 2 });
      expect(mockRepository.syncMembers).toHaveBeenCalledWith(
        'guild_123',
        members,
      );
    });

    it('should_throw_NotFoundException_when_user_not_found', async () => {
      const members = [{ userId: 'user_1', username: 'user1', roles: [] }];
      const error = new Prisma.PrismaClientKnownRequestError('', {
        code: 'P2003',
        clientVersion: '5.0.0',
        meta: { field_name: 'userId' },
      });
      vi.spyOn(mockRepository, 'syncMembers').mockRejectedValue(error);

      await expect(
        service.syncGuildMembers('guild_123', members),
      ).rejects.toThrow(NotFoundException);
    });

    it('should_throw_NotFoundException_when_guild_not_found', async () => {
      const members = [{ userId: 'user_1', username: 'user1', roles: [] }];
      const error = new Prisma.PrismaClientKnownRequestError('', {
        code: 'P2003',
        clientVersion: '5.0.0',
        meta: { field_name: 'guildId' },
      });
      vi.spyOn(mockRepository, 'syncMembers').mockRejectedValue(error);

      await expect(
        service.syncGuildMembers('guild_123', members),
      ).rejects.toThrow(NotFoundException);
    });

    it('should_throw_InternalServerErrorException_on_other_errors', async () => {
      const members = [{ userId: 'user_1', username: 'user1', roles: [] }];
      vi.spyOn(mockRepository, 'syncMembers').mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.syncGuildMembers('guild_123', members),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('updateMemberRoles', () => {
    it('should_update_roles_when_valid_data_provided', async () => {
      vi.spyOn(mockRepository, 'updateRoles').mockResolvedValue({
        count: 1,
      } as never);

      const result = await service.updateMemberRoles('user_123', 'guild_123', [
        'role_1',
        'role_2',
      ]);

      expect(result).toEqual({ count: 1 });
      expect(mockRepository.updateRoles).toHaveBeenCalledWith(
        'user_123',
        'guild_123',
        ['role_1', 'role_2'],
      );
    });

    it('should_throw_exception_when_repository_fails', async () => {
      vi.spyOn(mockRepository, 'updateRoles').mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.updateMemberRoles('user_123', 'guild_123', ['role_1']),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('batchUpdateRoles', () => {
    it('should_update_multiple_members_roles', async () => {
      const updates = [
        { userId: 'user_1', guildId: 'guild_123', roles: ['role_1'] },
        { userId: 'user_2', guildId: 'guild_123', roles: ['role_2'] },
      ];
      vi.spyOn(mockRepository, 'updateRoles')
        .mockResolvedValueOnce({ count: 1 } as never)
        .mockResolvedValueOnce({ count: 1 } as never);

      const result = await service.batchUpdateRoles(updates);

      expect(result).toEqual({ updated: 2 });
      expect(mockRepository.updateRoles).toHaveBeenCalledTimes(2);
    });

    it('should_sum_all_updated_counts', async () => {
      const updates = [
        { userId: 'user_1', guildId: 'guild_123', roles: ['role_1'] },
        { userId: 'user_2', guildId: 'guild_123', roles: ['role_2'] },
        { userId: 'user_3', guildId: 'guild_123', roles: ['role_3'] },
      ];
      vi.spyOn(mockRepository, 'updateRoles')
        .mockResolvedValueOnce({ count: 1 } as never)
        .mockResolvedValueOnce({ count: 2 } as never)
        .mockResolvedValueOnce({ count: 1 } as never);

      const result = await service.batchUpdateRoles(updates);

      expect(result).toEqual({ updated: 4 });
    });

    it('should_throw_exception_when_repository_fails', async () => {
      const updates = [
        { userId: 'user_1', guildId: 'guild_123', roles: ['role_1'] },
      ];
      vi.spyOn(mockRepository, 'updateRoles').mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.batchUpdateRoles(updates)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
