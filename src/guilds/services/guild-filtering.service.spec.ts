import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PrismaService } from '../../prisma/prisma.service';
import { DiscordApiService } from '../../discord/discord-api.service';
import { TokenManagementService } from '../../auth/services/token-management.service';
import { PermissionCheckService } from '../../permissions/modules/permission-check/permission-check.service';
import { GuildFilteringService } from './guild-filtering.service';
import type { Cache } from 'cache-manager';
import { DiscordFactory } from '../../../test/factories/discord.factory';
import { GuildFactory } from '../../../test/factories/guild.factory';

describe('GuildFilteringService', () => {
  let service: GuildFilteringService;
  let cacheManager: Cache;
  let prismaService: PrismaService;
  let discordApiService: DiscordApiService;
  let tokenManagementService: TokenManagementService;

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockPrismaService = {
    guild: {
      findMany: jest.fn(),
    },
    guildMember: {
      findMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockDiscordApiService = {
    getUserGuilds: jest.fn(),
  };

  const mockTokenManagementService = {
    getValidAccessToken: jest.fn(),
  };

  const mockGuildPermissionService = {
    checkAdminRoles: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuildFilteringService,
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: DiscordApiService, useValue: mockDiscordApiService },
        {
          provide: TokenManagementService,
          useValue: mockTokenManagementService,
        },
        { provide: PermissionCheckService, useValue: mockGuildPermissionService },
      ],
    }).compile();

    service = module.get<GuildFilteringService>(GuildFilteringService);
    cacheManager = module.get<Cache>(CACHE_MANAGER);
    prismaService = module.get<PrismaService>(PrismaService);
    discordApiService = module.get<DiscordApiService>(DiscordApiService);
    tokenManagementService = module.get<TokenManagementService>(
      TokenManagementService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Set default mock implementation
    mockGuildPermissionService.checkAdminRoles.mockResolvedValue(false);
  });

  describe('filterUserGuilds', () => {
    it('should return cached data if available', async () => {
      // Arrange
      const userId = 'user123';
      const cachedGuilds = DiscordFactory.createMockGuilds(3).map((g) => ({
        ...g,
        icon: g.icon || undefined,
      }));
      mockCacheManager.get.mockResolvedValue(cachedGuilds as any);

      // Act
      const result = await service.filterUserGuilds(userId);

      // Assert
      expect(result).toEqual(cachedGuilds);
      expect(mockDiscordApiService.getUserGuilds).not.toHaveBeenCalled();
    });

    it('should fetch and cache data on cache miss', async () => {
      // Arrange
      const userId = 'user123';
      mockCacheManager.get.mockResolvedValue(null);

      const accessToken = 'valid_token';
      mockTokenManagementService.getValidAccessToken.mockResolvedValue(
        accessToken,
      );

      const userGuilds = DiscordFactory.createMockGuilds(10);
      mockDiscordApiService.getUserGuilds.mockResolvedValue(userGuilds);

      const botGuilds = GuildFactory.createMockGuilds(5);
      mockPrismaService.guild.findMany.mockResolvedValue(botGuilds);

      // Act
      const result = await service.filterUserGuilds(userId);

      // Assert
      expect(mockCacheManager.set).toHaveBeenCalled();
      expect(result.length).toBeLessThanOrEqual(5); // Only mutual guilds
    });

    it('should filter to mutual guilds only', async () => {
      // Arrange
      const userId = 'user123';
      mockCacheManager.get.mockResolvedValue(null);

      const accessToken = 'valid_token';
      mockTokenManagementService.getValidAccessToken.mockResolvedValue(
        accessToken,
      );

      const userGuilds = DiscordFactory.createMockGuilds(10).map((guild) => ({
        ...guild,
        icon: guild.icon || undefined,
      }));
      userGuilds[0].id = 'mutual1';
      userGuilds[1].id = 'mutual2';
      mockDiscordApiService.getUserGuilds.mockResolvedValue(userGuilds as any);

      const botGuilds = [
        { id: 'mutual1' },
        { id: 'mutual2' },
        { id: 'bot-only' },
      ];
      mockPrismaService.guild.findMany.mockResolvedValue(botGuilds);

      // Act
      const result = await service.filterUserGuilds(userId);

      // Assert
      expect(result.length).toBe(2);
      expect(result[0].id).toBe('mutual1');
      expect(result[1].id).toBe('mutual2');
    });

    it('should return empty array if no access token', async () => {
      // Arrange
      const userId = 'user123';
      mockCacheManager.get.mockResolvedValue(null);
      mockTokenManagementService.getValidAccessToken.mockResolvedValue(null);

      // Act
      const result = await service.filterUserGuilds(userId);

      // Assert
      expect(result).toEqual([]);
      expect(mockDiscordApiService.getUserGuilds).not.toHaveBeenCalled();
    });

    it('should return empty array on error', async () => {
      // Arrange
      const userId = 'user123';
      mockCacheManager.get.mockResolvedValue(null);
      mockTokenManagementService.getValidAccessToken.mockRejectedValue(
        new Error('Network error'),
      );

      // Act
      const result = await service.filterUserGuilds(userId);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('syncUserGuildMemberships', () => {
    it('should create new memberships for new guilds', async () => {
      // Arrange
      const userId = 'user123';
      const userGuilds = DiscordFactory.createMockGuilds(3).map((g) => ({
        ...g,
        icon: g.icon || undefined,
      }));

      mockPrismaService.guildMember.findMany.mockResolvedValue([]);
      mockPrismaService.guildMember.createMany.mockResolvedValue({ count: 3 });

      // Act
      await service.syncUserGuildMemberships(userId, userGuilds);

      // Assert
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockPrismaService.guildMember.createMany).toHaveBeenCalled();
      expect(mockCacheManager.del).toHaveBeenCalled();
    });

    it('should not create duplicate memberships', async () => {
      // Arrange
      const userId = 'user123';
      const existingGuild = {
        ...DiscordFactory.createMockGuild({ id: 'existing-guild' }),
        icon: undefined,
      };
      const newGuild = {
        ...DiscordFactory.createMockGuild({ id: 'new-guild' }),
        icon: undefined,
      };

      mockPrismaService.guildMember.findMany.mockResolvedValue([
        { userId, guildId: 'existing-guild' },
      ]);

      // Act
      await service.syncUserGuildMemberships(userId, [
        existingGuild,
        newGuild,
      ] as any);

      // Assert
      expect(mockPrismaService.guildMember.createMany).toHaveBeenCalled();
    });

    it('should invalidate cache after sync', async () => {
      // Arrange
      const userId = 'user123';
      mockPrismaService.guildMember.findMany.mockResolvedValue([]);
      mockPrismaService.guildMember.createMany.mockResolvedValue({ count: 0 });

      // Act
      await service.syncUserGuildMemberships(userId, []);

      // Assert
      expect(mockCacheManager.del).toHaveBeenCalled();
    });

    it('should handle transaction errors', async () => {
      // Arrange
      const userId = 'user123';
      mockPrismaService.$transaction.mockRejectedValue(
        new Error('Transaction failed'),
      );

      // Act & Assert
      await expect(
        service.syncUserGuildMemberships(userId, []),
      ).rejects.toThrow('Transaction failed');
    });
  });

  describe('getUserAvailableGuildsWithPermissions', () => {
    it('should return enriched guild data with permissions', async () => {
      // Arrange
      const userId = 'user123';
      const guilds = DiscordFactory.createMockGuilds(3).map((g) => ({
        ...g,
        icon: g.icon || undefined,
      }));
      // Create memberships matching the guild IDs
      const memberships = guilds.map((guild, index) => ({
        userId,
        guildId: guild.id,
        username: 'testuser',
        roles: ['member'],
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        guild: {
          settings: { settings: {} },
        },
      }));

      // Mock filterUserGuilds
      jest.spyOn(service, 'filterUserGuilds').mockResolvedValue(guilds as any);
      mockPrismaService.guildMember.findMany.mockResolvedValue(
        memberships as any,
      );

      // Act
      const result =
        await service.getUserAvailableGuildsWithPermissions(userId);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('isMember');
      expect(result[0]).toHaveProperty('isAdmin');
      expect(result[0]).toHaveProperty('roles');
    });

    it('should return empty array on error', async () => {
      // Arrange
      const userId = 'user123';
      jest
        .spyOn(service, 'filterUserGuilds')
        .mockRejectedValue(new Error('Network error'));

      // Act
      const result =
        await service.getUserAvailableGuildsWithPermissions(userId);

      // Assert
      expect(result).toEqual([]);
    });

    it('should enrich with admin status from roles', async () => {
      // Arrange
      const userId = 'user123';
      const guilds = [DiscordFactory.createMockGuild({ id: 'guild1' })].map(
        (guild) => ({ ...guild, icon: guild.icon || undefined }),
      );

      jest.spyOn(service, 'filterUserGuilds').mockResolvedValue(guilds);

      mockPrismaService.guildMember.findMany.mockResolvedValue([
        {
          userId,
          guildId: 'guild1',
          roles: ['admin-role'],
          guild: {
            settings: {
              settings: {
                roles: { admin: ['admin-role'] },
              },
            },
          },
        },
      ]);

      // Mock permission check to return true for this test
      mockGuildPermissionService.checkAdminRoles.mockResolvedValue(true);

      // Act
      const result =
        await service.getUserAvailableGuildsWithPermissions(userId);

      // Assert
      expect(result[0].isAdmin).toBe(true);
    });
  });
});
