/**
 * UserGuildsService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { UserGuildsService } from './user-guilds.service';
import { GuildMembersService } from '../guild-members/guild-members.service';
import { GuildsService } from '../guilds/guilds.service';
import { DiscordApiService } from '../discord/discord-api.service';
import { TokenManagementService } from '../auth/services/token-management.service';
import { PermissionCheckService } from '../permissions/modules/permission-check/permission-check.service';

describe('UserGuildsService', () => {
  let service: UserGuildsService;
  let mockGuildMembersService: GuildMembersService;
  let mockGuildsService: GuildsService;
  let mockDiscordApiService: DiscordApiService;
  let mockTokenManagementService: TokenManagementService;
  let mockPermissionCheckService: PermissionCheckService;
  let mockCacheManager: Cache;

  const userId = 'user-123';
  const mockGuild = {
    id: 'guild-123',
    name: 'Test Guild',
    icon: 'icon_hash',
    owner: false,
    permissions: '0',
  };

  beforeEach(async () => {
    mockGuildMembersService = {
      findMembersByUser: vi.fn(),
      create: vi.fn(),
    } as unknown as GuildMembersService;

    mockGuildsService = {
      findActiveGuildIds: vi.fn(),
    } as unknown as GuildsService;

    mockDiscordApiService = {
      getUserGuilds: vi.fn(),
    } as unknown as DiscordApiService;

    mockTokenManagementService = {
      getValidAccessToken: vi.fn(),
    } as unknown as TokenManagementService;

    mockPermissionCheckService = {
      checkAdminRoles: vi.fn(),
    } as unknown as PermissionCheckService;

    mockCacheManager = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    } as unknown as Cache;

    const moduleRef = await Test.createTestingModule({
      providers: [
        UserGuildsService,
        { provide: GuildMembersService, useValue: mockGuildMembersService },
        { provide: GuildsService, useValue: mockGuildsService },
        { provide: DiscordApiService, useValue: mockDiscordApiService },
        {
          provide: TokenManagementService,
          useValue: mockTokenManagementService,
        },
        {
          provide: PermissionCheckService,
          useValue: mockPermissionCheckService,
        },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = moduleRef.get<UserGuildsService>(UserGuildsService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getUserAvailableGuildsWithPermissions', () => {
    it('should_return_guilds_with_permissions_when_user_has_memberships', async () => {
      vi.mocked(
        mockTokenManagementService.getValidAccessToken,
      ).mockResolvedValue('access-token');
      vi.mocked(mockDiscordApiService.getUserGuilds).mockResolvedValue([
        mockGuild,
      ]);
      vi.mocked(mockGuildsService.findActiveGuildIds).mockResolvedValue([
        'guild-123',
      ]);
      vi.mocked(mockGuildMembersService.findMembersByUser).mockResolvedValue([
        { guildId: 'guild-123', roles: ['role-1'] },
      ]);
      vi.mocked(mockPermissionCheckService.checkAdminRoles).mockResolvedValue(
        true,
      );
      vi.mocked(mockCacheManager.get).mockResolvedValue(null);

      const result =
        await service.getUserAvailableGuildsWithPermissions(userId);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'guild-123',
        isMember: true,
        isAdmin: true,
      });
    });

    it('should_return_empty_array_when_error_occurs', async () => {
      vi.mocked(
        mockTokenManagementService.getValidAccessToken,
      ).mockRejectedValue(new Error('Token error'));

      const result =
        await service.getUserAvailableGuildsWithPermissions(userId);

      expect(result).toEqual([]);
    });
  });

  describe('syncUserGuildMembershipsWithRoles', () => {
    it('should_create_new_memberships_for_new_guilds', async () => {
      const userGuilds = [
        { id: 'guild-new', name: 'New Guild', roles: ['role-1'] },
      ];
      vi.mocked(mockGuildMembersService.findMembersByUser).mockResolvedValue(
        [],
      );
      vi.mocked(mockGuildMembersService.create).mockResolvedValue({});

      await service.syncUserGuildMembershipsWithRoles(
        userId,
        userGuilds as Parameters<
          typeof service.syncUserGuildMembershipsWithRoles
        >[1],
      );

      expect(mockGuildMembersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          guildId: 'guild-new',
          roles: ['role-1'],
        }),
      );
    });

    it('should_skip_existing_memberships_when_syncing', async () => {
      const userGuilds = [
        { id: 'guild-123', name: 'Existing Guild', roles: [] },
      ];
      vi.mocked(mockGuildMembersService.findMembersByUser).mockResolvedValue([
        { guildId: 'guild-123' },
      ]);

      await service.syncUserGuildMembershipsWithRoles(
        userId,
        userGuilds as Parameters<
          typeof service.syncUserGuildMembershipsWithRoles
        >[1],
      );

      expect(mockGuildMembersService.create).not.toHaveBeenCalled();
    });

    it('should_invalidate_cache_after_sync', async () => {
      vi.mocked(mockGuildMembersService.findMembersByUser).mockResolvedValue(
        [],
      );

      await service.syncUserGuildMembershipsWithRoles(userId, []);

      expect(mockCacheManager.del).toHaveBeenCalledWith(
        `user:${userId}:guilds`,
      );
    });
  });

  describe('completeOAuthFlow', () => {
    it('should_sync_memberships_and_return_available_guilds', async () => {
      const userGuilds = [{ id: 'guild-123', name: 'Guild', roles: [] }];
      vi.mocked(mockGuildMembersService.findMembersByUser).mockResolvedValue(
        [],
      );
      vi.mocked(
        mockTokenManagementService.getValidAccessToken,
      ).mockResolvedValue('token');
      vi.mocked(mockDiscordApiService.getUserGuilds).mockResolvedValue([
        mockGuild,
      ]);
      vi.mocked(mockGuildsService.findActiveGuildIds).mockResolvedValue([
        'guild-123',
      ]);
      vi.mocked(mockCacheManager.get).mockResolvedValue(null);

      const result = await service.completeOAuthFlow(
        userId,
        userGuilds as Parameters<typeof service.completeOAuthFlow>[1],
      );

      expect(result).toBeDefined();
    });

    it('should_throw_error_when_sync_fails', async () => {
      vi.mocked(mockGuildMembersService.findMembersByUser).mockRejectedValue(
        new Error('Sync failed'),
      );

      await expect(service.completeOAuthFlow(userId, [])).rejects.toThrow(
        'Sync failed',
      );
    });
  });
});
