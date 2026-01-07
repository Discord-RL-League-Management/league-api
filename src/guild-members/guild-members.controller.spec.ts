/**
 * GuildMembersController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { GuildMembersController } from './guild-members.controller';
import { GuildMembersService } from './guild-members.service';

describe('GuildMembersController', () => {
  let controller: GuildMembersController;
  let mockGuildMembersService: GuildMembersService;

  beforeEach(async () => {
    mockGuildMembersService = {
      findAll: vi.fn(),
      searchMembers: vi.fn(),
      getMemberStats: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      syncGuildMembers: vi.fn(),
    } as unknown as GuildMembersService;

    const module = await Test.createTestingModule({
      controllers: [GuildMembersController],
      providers: [
        { provide: GuildMembersService, useValue: mockGuildMembersService },
      ],
    }).compile();

    controller = module.get<GuildMembersController>(GuildMembersController);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getMembers', () => {
    it('should_return_members_when_guild_id_provided', async () => {
      const mockMembers = { members: [], pagination: {} };
      vi.mocked(mockGuildMembersService.findAll).mockResolvedValue(
        mockMembers as never,
      );

      const result = await controller.getMembers('guild-1', '1', '50');

      expect(result).toEqual(mockMembers);
      expect(mockGuildMembersService.findAll).toHaveBeenCalled();
    });

    it('should_use_default_pagination_when_params_invalid', async () => {
      vi.mocked(mockGuildMembersService.findAll).mockResolvedValue({
        members: [],
        pagination: {},
      } as never);

      await controller.getMembers('guild-1', 'invalid', 'invalid');

      expect(mockGuildMembersService.findAll).toHaveBeenCalledWith(
        'guild-1',
        1,
        50,
      );
    });
  });

  describe('searchMembers', () => {
    it('should_return_search_results_when_query_provided', async () => {
      const mockResults = { members: [], pagination: {} };
      vi.mocked(mockGuildMembersService.searchMembers).mockResolvedValue(
        mockResults as never,
      );

      const result = await controller.searchMembers(
        'guild-1',
        'test',
        '1',
        '20',
      );

      expect(result).toEqual(mockResults);
      expect(mockGuildMembersService.searchMembers).toHaveBeenCalled();
    });
  });

  describe('getMemberStats', () => {
    it('should_return_stats_when_guild_id_provided', async () => {
      const mockStats = { total: 100 };
      vi.mocked(mockGuildMembersService.getMemberStats).mockResolvedValue(
        mockStats as never,
      );

      const result = await controller.getMemberStats('guild-1');

      expect(result).toEqual(mockStats);
      expect(mockGuildMembersService.getMemberStats).toHaveBeenCalledWith(
        'guild-1',
      );
    });
  });

  describe('getMember', () => {
    it('should_return_member_when_user_id_provided', async () => {
      const mockMember = { userId: 'user-1', guildId: 'guild-1' };
      vi.mocked(mockGuildMembersService.findOne).mockResolvedValue(
        mockMember as never,
      );

      const result = await controller.getMember('guild-1', 'user-1');

      expect(result).toEqual(mockMember);
      expect(mockGuildMembersService.findOne).toHaveBeenCalledWith(
        'user-1',
        'guild-1',
      );
    });
  });

  describe('createMember', () => {
    it('should_create_member_when_dto_valid', async () => {
      const createDto = { userId: 'user-1', nickname: 'Test' };
      const mockMember = { ...createDto, guildId: 'guild-1' };
      vi.mocked(mockGuildMembersService.create).mockResolvedValue(
        mockMember as never,
      );

      const result = await controller.createMember('guild-1', createDto);

      expect(result).toEqual(mockMember);
      expect(mockGuildMembersService.create).toHaveBeenCalled();
    });
  });

  describe('updateMember', () => {
    it('should_update_member_when_dto_valid', async () => {
      const updateDto = { nickname: 'Updated' };
      const mockMember = { userId: 'user-1', ...updateDto };
      vi.mocked(mockGuildMembersService.update).mockResolvedValue(
        mockMember as never,
      );

      const result = await controller.updateMember(
        'guild-1',
        'user-1',
        updateDto,
      );

      expect(result).toEqual(mockMember);
      expect(mockGuildMembersService.update).toHaveBeenCalled();
    });
  });

  describe('removeMember', () => {
    it('should_remove_member_when_user_id_provided', async () => {
      vi.mocked(mockGuildMembersService.remove).mockResolvedValue(undefined);

      const result = await controller.removeMember('guild-1', 'user-1');

      expect(result).toEqual({ message: 'Member removed successfully' });
      expect(mockGuildMembersService.remove).toHaveBeenCalledWith(
        'user-1',
        'guild-1',
      );
    });
  });

  describe('syncMembers', () => {
    it('should_sync_members_when_data_provided', async () => {
      const syncData = { members: [{ userId: 'user-1', username: 'test' }] };
      const mockResult = { synced: 1 };
      vi.mocked(mockGuildMembersService.syncGuildMembers).mockResolvedValue(
        mockResult as never,
      );

      const result = await controller.syncMembers('guild-1', syncData);

      expect(result).toEqual(mockResult);
      expect(mockGuildMembersService.syncGuildMembers).toHaveBeenCalled();
    });
  });
});
