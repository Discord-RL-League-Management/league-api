/**
 * GuildMembersService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { GuildMembersService } from './guild-members.service';
import { GuildMemberRepository } from './repositories/guild-member.repository';
import { UsersService } from '../users/users.service';
import { GuildMemberQueryService } from './services/guild-member-query.service';
import { GuildMemberStatisticsService } from './services/guild-member-statistics.service';
import { GuildMemberSyncService } from './services/guild-member-sync.service';
import { TrackerService } from '../trackers/tracker.service';
import { PlayerService } from '../players/player.service';
import { CreateGuildMemberDto } from './dto/create-guild-member.dto';
import { UpdateGuildMemberDto } from './dto/update-guild-member.dto';

describe('GuildMembersService', () => {
  let service: GuildMembersService;
  let mockGuildMemberRepository: GuildMemberRepository;
  let mockUsersService: UsersService;
  let mockGuildMemberQueryService: GuildMemberQueryService;
  let mockGuildMemberStatisticsService: GuildMemberStatisticsService;
  let mockGuildMemberSyncService: GuildMemberSyncService;
  let mockTrackerService: TrackerService;
  let mockPlayerService: PlayerService;

  const mockGuildMember = {
    id: 'member-123',
    userId: 'user-123',
    guildId: 'guild-123',
    username: 'testuser',
    nickname: 'Test Nickname',
    roles: ['role-1'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockGuildMemberRepository = {
      upsert: vi.fn(),
      findByCompositeKey: vi.fn(),
      existsByCompositeKey: vi.fn(),
      updateByCompositeKey: vi.fn(),
      deleteByCompositeKey: vi.fn(),
    } as unknown as GuildMemberRepository;

    mockUsersService = {
      exists: vi.fn(),
    } as unknown as UsersService;

    mockGuildMemberQueryService = {
      findAll: vi.fn(),
      getUserGuilds: vi.fn(),
      findMemberWithGuildSettings: vi.fn(),
      findMembersByUser: vi.fn(),
      searchMembers: vi.fn(),
    } as unknown as GuildMemberQueryService;

    mockGuildMemberStatisticsService = {
      countMembersWithRoles: vi.fn(),
      getMemberStats: vi.fn(),
    } as unknown as GuildMemberStatisticsService;

    mockGuildMemberSyncService = {
      syncGuildMembers: vi.fn(),
      updateMemberRoles: vi.fn(),
    } as unknown as GuildMemberSyncService;

    mockTrackerService = {
      getTrackersByUserId: vi.fn().mockResolvedValue({ data: [] }),
    } as unknown as TrackerService;

    mockPlayerService = {
      ensurePlayerExists: vi.fn().mockResolvedValue({ id: 'player_123' }),
    } as unknown as PlayerService;

    const module = await Test.createTestingModule({
      providers: [
        GuildMembersService,
        { provide: GuildMemberRepository, useValue: mockGuildMemberRepository },
        { provide: UsersService, useValue: mockUsersService },
        {
          provide: GuildMemberQueryService,
          useValue: mockGuildMemberQueryService,
        },
        {
          provide: GuildMemberStatisticsService,
          useValue: mockGuildMemberStatisticsService,
        },
        {
          provide: GuildMemberSyncService,
          useValue: mockGuildMemberSyncService,
        },
        { provide: TrackerService, useValue: mockTrackerService },
        { provide: PlayerService, useValue: mockPlayerService },
      ],
    }).compile();

    service = module.get<GuildMembersService>(GuildMembersService);
  });

  describe('create', () => {
    it('should_create_member_when_user_exists', async () => {
      const createDto: CreateGuildMemberDto = {
        userId: 'user-123',
        guildId: 'guild-123',
        username: 'testuser',
        roles: ['role-1'],
      };

      vi.spyOn(mockUsersService, 'exists').mockResolvedValue(true);
      vi.spyOn(mockGuildMemberRepository, 'upsert').mockResolvedValue(
        mockGuildMember as never,
      );
      vi.spyOn(mockTrackerService, 'getTrackersByUserId').mockResolvedValue({
        data: [],
      });

      const result = await service.create(createDto);

      expect(result).toEqual(mockGuildMember);
      expect(mockUsersService.exists).toHaveBeenCalledWith('user-123');
      expect(mockGuildMemberRepository.upsert).toHaveBeenCalledWith(createDto);
    });

    it('should_throw_not_found_when_user_does_not_exist', async () => {
      const createDto: CreateGuildMemberDto = {
        userId: 'user-123',
        guildId: 'guild-123',
        username: 'testuser',
        roles: ['role-1'],
      };

      vi.spyOn(mockUsersService, 'exists').mockResolvedValue(false);
      vi.spyOn(mockTrackerService, 'getTrackersByUserId').mockResolvedValue({
        data: [],
      });

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockGuildMemberRepository.upsert).not.toHaveBeenCalled();
    });

    it('should_handle_prisma_foreign_key_error_for_user', async () => {
      const createDto: CreateGuildMemberDto = {
        userId: 'user-123',
        guildId: 'guild-123',
        username: 'testuser',
        roles: ['role-1'],
      };

      const prismaError = new Prisma.PrismaClientKnownRequestError('', {
        code: 'P2003',
        clientVersion: '1.0.0',
        meta: { field_name: 'userId' },
      });

      vi.spyOn(mockUsersService, 'exists').mockResolvedValue(true);
      vi.spyOn(mockGuildMemberRepository, 'upsert').mockRejectedValue(
        prismaError,
      );
      vi.spyOn(mockTrackerService, 'getTrackersByUserId').mockResolvedValue({
        data: [],
      });

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should_handle_prisma_foreign_key_error_for_guild', async () => {
      const createDto: CreateGuildMemberDto = {
        userId: 'user-123',
        guildId: 'guild-123',
        username: 'testuser',
        roles: ['role-1'],
      };

      const prismaError = new Prisma.PrismaClientKnownRequestError('', {
        code: 'P2003',
        clientVersion: '1.0.0',
        meta: { field_name: 'guildId' },
      });

      vi.spyOn(mockUsersService, 'exists').mockResolvedValue(true);
      vi.spyOn(mockGuildMemberRepository, 'upsert').mockRejectedValue(
        prismaError,
      );
      vi.spyOn(mockTrackerService, 'getTrackersByUserId').mockResolvedValue({
        data: [],
      });

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should_throw_internal_server_error_on_unexpected_error', async () => {
      const createDto: CreateGuildMemberDto = {
        userId: 'user-123',
        guildId: 'guild-123',
        username: 'testuser',
        roles: ['role-1'],
      };

      vi.spyOn(mockUsersService, 'exists').mockResolvedValue(true);
      vi.spyOn(mockGuildMemberRepository, 'upsert').mockRejectedValue(
        new Error('Unexpected error'),
      );
      vi.spyOn(mockTrackerService, 'getTrackersByUserId').mockResolvedValue({
        data: [],
      });

      await expect(service.create(createDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should_create_player_when_user_has_active_trackers', async () => {
      const createDto: CreateGuildMemberDto = {
        userId: 'user-123',
        guildId: 'guild-123',
        username: 'testuser',
        roles: ['role-1'],
      };

      const activeTracker = {
        id: 'tracker_123',
        userId: 'user-123',
        isActive: true,
        isDeleted: false,
      };

      vi.spyOn(mockUsersService, 'exists').mockResolvedValue(true);
      vi.spyOn(mockGuildMemberRepository, 'upsert').mockResolvedValue(
        mockGuildMember as never,
      );
      vi.spyOn(mockTrackerService, 'getTrackersByUserId').mockResolvedValue({
        data: [activeTracker],
      });
      vi.spyOn(mockPlayerService, 'ensurePlayerExists').mockResolvedValue({
        id: 'player_123',
      });

      const result = await service.create(createDto);

      expect(result).toEqual(mockGuildMember);
      expect(mockPlayerService.ensurePlayerExists).toHaveBeenCalledWith(
        'user-123',
        'guild-123',
      );
    });

    it('should_not_create_player_when_user_has_no_trackers', async () => {
      const createDto: CreateGuildMemberDto = {
        userId: 'user-123',
        guildId: 'guild-123',
        username: 'testuser',
        roles: ['role-1'],
      };

      vi.spyOn(mockUsersService, 'exists').mockResolvedValue(true);
      vi.spyOn(mockGuildMemberRepository, 'upsert').mockResolvedValue(
        mockGuildMember as never,
      );
      vi.spyOn(mockTrackerService, 'getTrackersByUserId').mockResolvedValue({
        data: [],
      });

      const result = await service.create(createDto);

      expect(result).toEqual(mockGuildMember);
      expect(mockPlayerService.ensurePlayerExists).not.toHaveBeenCalled();
    });

    it('should_not_create_player_when_user_has_only_inactive_trackers', async () => {
      const createDto: CreateGuildMemberDto = {
        userId: 'user-123',
        guildId: 'guild-123',
        username: 'testuser',
        roles: ['role-1'],
      };

      const inactiveTracker = {
        id: 'tracker_123',
        userId: 'user-123',
        isActive: false,
        isDeleted: false,
      };
      const deletedTracker = {
        id: 'tracker_456',
        userId: 'user-123',
        isActive: true,
        isDeleted: true,
      };

      vi.spyOn(mockUsersService, 'exists').mockResolvedValue(true);
      vi.spyOn(mockGuildMemberRepository, 'upsert').mockResolvedValue(
        mockGuildMember as never,
      );
      vi.spyOn(mockTrackerService, 'getTrackersByUserId').mockResolvedValue({
        data: [inactiveTracker, deletedTracker],
      });

      const result = await service.create(createDto);

      expect(result).toEqual(mockGuildMember);
      expect(mockPlayerService.ensurePlayerExists).not.toHaveBeenCalled();
    });

    it('should_not_affect_member_creation_when_player_creation_fails', async () => {
      const createDto: CreateGuildMemberDto = {
        userId: 'user-123',
        guildId: 'guild-123',
        username: 'testuser',
        roles: ['role-1'],
      };

      const activeTracker = {
        id: 'tracker_123',
        userId: 'user-123',
        isActive: true,
        isDeleted: false,
      };

      vi.spyOn(mockUsersService, 'exists').mockResolvedValue(true);
      vi.spyOn(mockGuildMemberRepository, 'upsert').mockResolvedValue(
        mockGuildMember as never,
      );
      vi.spyOn(mockTrackerService, 'getTrackersByUserId').mockResolvedValue({
        data: [activeTracker],
      });
      vi.spyOn(mockPlayerService, 'ensurePlayerExists').mockRejectedValue(
        new Error('Player creation failed'),
      );

      const result = await service.create(createDto);

      expect(result).toEqual(mockGuildMember);
      expect(mockPlayerService.ensurePlayerExists).toHaveBeenCalledWith(
        'user-123',
        'guild-123',
      );
    });

    it('should_not_affect_member_creation_when_tracker_service_fails', async () => {
      const createDto: CreateGuildMemberDto = {
        userId: 'user-123',
        guildId: 'guild-123',
        username: 'testuser',
        roles: ['role-1'],
      };

      vi.spyOn(mockUsersService, 'exists').mockResolvedValue(true);
      vi.spyOn(mockGuildMemberRepository, 'upsert').mockResolvedValue(
        mockGuildMember as never,
      );
      vi.spyOn(mockTrackerService, 'getTrackersByUserId').mockRejectedValue(
        new Error('Tracker service failed'),
      );

      const result = await service.create(createDto);

      expect(result).toEqual(mockGuildMember);
      expect(mockPlayerService.ensurePlayerExists).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should_return_members_when_guild_id_provided', async () => {
      const mockResult = {
        data: [mockGuildMember],
        page: 1,
        limit: 50,
        total: 1,
      };

      vi.spyOn(mockGuildMemberQueryService, 'findAll').mockResolvedValue(
        mockResult as never,
      );

      const result = await service.findAll('guild-123');

      expect(result).toEqual(mockResult);
      expect(mockGuildMemberQueryService.findAll).toHaveBeenCalledWith(
        'guild-123',
        1,
        50,
      );
    });

    it('should_pass_custom_pagination_when_provided', async () => {
      const mockResult = {
        data: [mockGuildMember],
        page: 2,
        limit: 20,
        total: 1,
      };

      vi.spyOn(mockGuildMemberQueryService, 'findAll').mockResolvedValue(
        mockResult as never,
      );

      await service.findAll('guild-123', 2, 20);

      expect(mockGuildMemberQueryService.findAll).toHaveBeenCalledWith(
        'guild-123',
        2,
        20,
      );
    });
  });

  describe('findOne', () => {
    it('should_return_member_when_exists', async () => {
      vi.spyOn(
        mockGuildMemberRepository,
        'findByCompositeKey',
      ).mockResolvedValue(mockGuildMember as never);

      const result = await service.findOne('user-123', 'guild-123');

      expect(result).toEqual(mockGuildMember);
      expect(mockGuildMemberRepository.findByCompositeKey).toHaveBeenCalledWith(
        'user-123',
        'guild-123',
        { user: true },
      );
    });

    it('should_throw_not_found_when_member_does_not_exist', async () => {
      vi.spyOn(
        mockGuildMemberRepository,
        'findByCompositeKey',
      ).mockResolvedValue(null as never);

      await expect(service.findOne('user-123', 'guild-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should_throw_internal_server_error_on_unexpected_error', async () => {
      vi.spyOn(
        mockGuildMemberRepository,
        'findByCompositeKey',
      ).mockRejectedValue(new Error('Unexpected error'));

      await expect(service.findOne('user-123', 'guild-123')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('update', () => {
    it('should_update_member_when_exists', async () => {
      const updateDto: UpdateGuildMemberDto = {
        nickname: 'Updated Nickname',
        roles: ['role-1', 'role-2'],
      };

      const updatedMember = {
        ...mockGuildMember,
        ...updateDto,
      };

      vi.spyOn(
        mockGuildMemberRepository,
        'existsByCompositeKey',
      ).mockResolvedValue(true);
      vi.spyOn(
        mockGuildMemberRepository,
        'updateByCompositeKey',
      ).mockResolvedValue(updatedMember as never);

      const result = await service.update('user-123', 'guild-123', updateDto);

      expect(result).toEqual(updatedMember);
      expect(
        mockGuildMemberRepository.existsByCompositeKey,
      ).toHaveBeenCalledWith('user-123', 'guild-123');
      expect(
        mockGuildMemberRepository.updateByCompositeKey,
      ).toHaveBeenCalledWith('user-123', 'guild-123', updateDto);
    });

    it('should_throw_not_found_when_member_does_not_exist', async () => {
      const updateDto: UpdateGuildMemberDto = {
        nickname: 'Updated Nickname',
      };

      vi.spyOn(
        mockGuildMemberRepository,
        'existsByCompositeKey',
      ).mockResolvedValue(false);

      await expect(
        service.update('user-123', 'guild-123', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should_throw_internal_server_error_on_unexpected_error', async () => {
      const updateDto: UpdateGuildMemberDto = {
        nickname: 'Updated Nickname',
      };

      vi.spyOn(
        mockGuildMemberRepository,
        'existsByCompositeKey',
      ).mockResolvedValue(true);
      vi.spyOn(
        mockGuildMemberRepository,
        'updateByCompositeKey',
      ).mockRejectedValue(new Error('Unexpected error'));

      await expect(
        service.update('user-123', 'guild-123', updateDto),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('remove', () => {
    it('should_remove_member_when_exists', async () => {
      vi.spyOn(
        mockGuildMemberRepository,
        'existsByCompositeKey',
      ).mockResolvedValue(true);
      vi.spyOn(
        mockGuildMemberRepository,
        'deleteByCompositeKey',
      ).mockResolvedValue(undefined as never);

      await service.remove('user-123', 'guild-123');

      expect(
        mockGuildMemberRepository.existsByCompositeKey,
      ).toHaveBeenCalledWith('user-123', 'guild-123');
      expect(
        mockGuildMemberRepository.deleteByCompositeKey,
      ).toHaveBeenCalledWith('user-123', 'guild-123');
    });

    it('should_throw_not_found_when_member_does_not_exist', async () => {
      vi.spyOn(
        mockGuildMemberRepository,
        'existsByCompositeKey',
      ).mockResolvedValue(false);

      await expect(service.remove('user-123', 'guild-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should_throw_internal_server_error_on_unexpected_error', async () => {
      vi.spyOn(
        mockGuildMemberRepository,
        'existsByCompositeKey',
      ).mockResolvedValue(true);
      vi.spyOn(
        mockGuildMemberRepository,
        'deleteByCompositeKey',
      ).mockRejectedValue(new Error('Unexpected error'));

      await expect(service.remove('user-123', 'guild-123')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getUserGuilds', () => {
    it('should_return_user_guilds_when_user_id_provided', async () => {
      const mockGuilds = [{ id: 'guild-123', name: 'Test Guild' }];
      vi.spyOn(mockGuildMemberQueryService, 'getUserGuilds').mockResolvedValue(
        mockGuilds as never,
      );

      const result = await service.getUserGuilds('user-123');

      expect(result).toEqual(mockGuilds);
      expect(mockGuildMemberQueryService.getUserGuilds).toHaveBeenCalledWith(
        'user-123',
      );
    });
  });

  describe('syncGuildMembers', () => {
    it('should_sync_members_when_valid_data_provided', async () => {
      const members = [
        { userId: 'user-1', username: 'user1', roles: ['role-1'] },
        { userId: 'user-2', username: 'user2', roles: ['role-2'] },
      ];

      const mockResult = { synced: 2 };
      vi.spyOn(
        mockGuildMemberSyncService,
        'syncGuildMembers',
      ).mockResolvedValue(mockResult as never);

      const result = await service.syncGuildMembers('guild-123', members);

      expect(result).toEqual(mockResult);
      expect(mockGuildMemberSyncService.syncGuildMembers).toHaveBeenCalledWith(
        'guild-123',
        members,
      );
    });
  });

  describe('updateMemberRoles', () => {
    it('should_update_roles_when_valid_data_provided', async () => {
      const roles = ['role-1', 'role-2'];
      vi.spyOn(
        mockGuildMemberSyncService,
        'updateMemberRoles',
      ).mockResolvedValue(undefined as never);

      await service.updateMemberRoles('user-123', 'guild-123', roles);

      expect(mockGuildMemberSyncService.updateMemberRoles).toHaveBeenCalledWith(
        'user-123',
        'guild-123',
        roles,
      );
    });
  });

  describe('countMembersWithRoles', () => {
    it('should_return_count_when_role_ids_provided', async () => {
      vi.spyOn(
        mockGuildMemberStatisticsService,
        'countMembersWithRoles',
      ).mockResolvedValue(5);

      const result = await service.countMembersWithRoles('guild-123', [
        'role-1',
        'role-2',
      ]);

      expect(result).toBe(5);
      expect(
        mockGuildMemberStatisticsService.countMembersWithRoles,
      ).toHaveBeenCalledWith('guild-123', ['role-1', 'role-2']);
    });
  });

  describe('searchMembers', () => {
    it('should_return_search_results_when_query_provided', async () => {
      const mockResults = {
        data: [mockGuildMember],
        page: 1,
        limit: 20,
        total: 1,
      };

      vi.spyOn(mockGuildMemberQueryService, 'searchMembers').mockResolvedValue(
        mockResults as never,
      );

      const result = await service.searchMembers('guild-123', 'test', 1, 20);

      expect(result).toEqual(mockResults);
      expect(mockGuildMemberQueryService.searchMembers).toHaveBeenCalledWith(
        'guild-123',
        'test',
        1,
        20,
      );
    });
  });

  describe('getMemberStats', () => {
    it('should_return_stats_when_guild_id_provided', async () => {
      const mockStats = { totalMembers: 10, activeMembers: 8 };
      vi.spyOn(
        mockGuildMemberStatisticsService,
        'getMemberStats',
      ).mockResolvedValue(mockStats as never);

      const result = await service.getMemberStats('guild-123');

      expect(result).toEqual(mockStats);
      expect(
        mockGuildMemberStatisticsService.getMemberStats,
      ).toHaveBeenCalledWith('guild-123');
    });
  });
});
