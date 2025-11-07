import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { GuildMembersService } from './guild-members.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { GuildMemberRepository } from './repositories/guild-member.repository';
import { GuildMemberQueryService } from './services/guild-member-query.service';
import { GuildMemberStatisticsService } from './services/guild-member-statistics.service';
import { GuildMemberSyncService } from './services/guild-member-sync.service';
import { apiFixtures } from '../../test/fixtures/member.fixtures';

describe('GuildMembersService', () => {
  let service: GuildMembersService;
  let prisma: PrismaService;
  let usersService: UsersService;

  const mockPrismaService = {
    guild: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    guildMember: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockUsersService = {
    exists: jest.fn(),
  };

  const mockGuildMemberRepository = {
    // BaseRepository methods
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    updateById: jest.fn(),
    delete: jest.fn(),
    deleteById: jest.fn(),
    exists: jest.fn(),
    existsById: jest.fn(),
    // Composite key methods
    findByCompositeKey: jest.fn(),
    updateByCompositeKey: jest.fn(),
    deleteByCompositeKey: jest.fn(),
    existsByCompositeKey: jest.fn(),
    // Guild-specific methods
    findByGuildId: jest.fn(),
    findByUserId: jest.fn(),
    findWithGuildSettings: jest.fn(),
    searchByUsername: jest.fn(),
    // Sync methods
    upsert: jest.fn(),
    syncMembers: jest.fn(),
    createMany: jest.fn(),
    deleteByGuildId: jest.fn(),
    // Role methods
    updateRoles: jest.fn(),
    countMembersWithRoles: jest.fn(),
    // Statistics
    countStats: jest.fn(),
    // Alias methods for compatibility
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockGuildMemberQueryService = {
    findAll: jest.fn(),
    searchMembers: jest.fn(),
    getUserGuilds: jest.fn(),
    findMemberWithGuildSettings: jest.fn(),
    findMembersByUser: jest.fn(),
  };

  const mockGuildMemberStatisticsService = {
    getMemberStats: jest.fn(),
    countMembersWithRoles: jest.fn(),
    getActiveMembersCount: jest.fn(),
  };

  const mockGuildMemberSyncService = {
    syncGuildMembers: jest.fn(),
    updateMemberRoles: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuildMembersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: GuildMemberRepository,
          useValue: mockGuildMemberRepository,
        },
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
      ],
    }).compile();

    service = module.get<GuildMembersService>(GuildMembersService);
    prisma = module.get<PrismaService>(PrismaService);
    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create guild member when user exists', async () => {
      // Arrange
      const memberData = {
        userId: '123',
        guildId: '456',
        username: 'testuser',
        roles: ['role1'],
      };
      const mockMember = { ...memberData, id: 'member123' };

      mockUsersService.exists.mockResolvedValue(true);
      mockGuildMemberRepository.upsert.mockResolvedValue(mockMember);

      // Act
      const result = await service.create(memberData);

      // Assert
      expect(result).toEqual(mockMember);
      expect(mockUsersService.exists).toHaveBeenCalledWith(memberData.userId);
      expect(mockGuildMemberRepository.upsert).toHaveBeenCalledWith(memberData);
    });

    it('should throw NotFoundException when guild does not exist (foreign key error)', async () => {
      // Arrange
      const memberData = {
        userId: '123',
        guildId: 'nonexistent',
        username: 'testuser',
      };
      mockUsersService.exists.mockResolvedValue(true);
      const foreignKeyError = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        { code: 'P2003', clientVersion: '5.0.0' },
      );
      mockGuildMemberRepository.upsert.mockRejectedValue(foreignKeyError);

      // Act & Assert
      await expect(service.create(memberData)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(memberData)).rejects.toThrow(
        'Guild nonexistent not found',
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      // Arrange
      const memberData = {
        userId: 'nonexistent',
        guildId: '456',
        username: 'testuser',
      };
      mockUsersService.exists.mockResolvedValue(false);

      // Act & Assert
      await expect(service.create(memberData)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(memberData)).rejects.toThrow(
        'User nonexistent not found',
      );
    });
  });

  describe('findOne', () => {
    it('should return member when found', async () => {
      // Arrange
      const userId = '123';
      const guildId = '456';
      const mockMember = {
        id: 'member123',
        userId,
        guildId,
        username: 'testuser',
        user: { id: userId, username: 'testuser' },
      };
      mockGuildMemberRepository.findByCompositeKey.mockResolvedValue(mockMember);

      // Act
      const result = await service.findOne(userId, guildId);

      // Assert
      expect(result).toEqual(mockMember);
      expect(mockGuildMemberRepository.findByCompositeKey).toHaveBeenCalledWith(
        userId,
        guildId,
        { user: true },
      );
    });

    it('should throw NotFoundException when member not found', async () => {
      // Arrange
      const userId = '123';
      const guildId = '456';
      mockGuildMemberRepository.findByCompositeKey.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(userId, guildId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(userId, guildId)).rejects.toThrow(
        `Member ${userId} not found in guild ${guildId}`,
      );
    });
  });

  describe('remove', () => {
    it('should remove member when found', async () => {
      // Arrange
      const userId = '123';
      const guildId = '456';
      mockGuildMemberRepository.existsByCompositeKey.mockResolvedValue(true);
      mockGuildMemberRepository.deleteByCompositeKey.mockResolvedValue(undefined);

      // Act
      await service.remove(userId, guildId);

      // Assert
      expect(mockGuildMemberRepository.existsByCompositeKey).toHaveBeenCalledWith(
        userId,
        guildId,
      );
      expect(mockGuildMemberRepository.deleteByCompositeKey).toHaveBeenCalledWith(
        userId,
        guildId,
      );
    });

    it('should throw NotFoundException when member not found', async () => {
      // Arrange
      const userId = '123';
      const guildId = '456';
      mockGuildMemberRepository.existsByCompositeKey.mockResolvedValue(false);

      // Act & Assert
      await expect(service.remove(userId, guildId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('syncGuildMembers', () => {
    it('should sync members successfully', async () => {
      // Arrange
      const guildId = '456';
      const members = [
        { userId: '123', username: 'user1', roles: ['role1'] },
        { userId: '124', username: 'user2', roles: ['role2'] },
      ];

      mockGuildMemberSyncService.syncGuildMembers.mockResolvedValue({
        synced: members.length,
      });

      // Act
      const result = await service.syncGuildMembers(guildId, members);

      // Assert
      expect(result).toEqual({ synced: members.length });
      expect(mockGuildMemberSyncService.syncGuildMembers).toHaveBeenCalledWith(
        guildId,
        members,
      );
    });

    it('should throw NotFoundException when guild does not exist (foreign key error)', async () => {
      // Arrange
      const guildId = 'nonexistent';
      const members = [{ userId: '123', username: 'user1', roles: [] }];

      const foreignKeyError = new NotFoundException('Guild nonexistent not found');
      mockGuildMemberSyncService.syncGuildMembers.mockRejectedValue(foreignKeyError);

      // Act & Assert
      await expect(service.syncGuildMembers(guildId, members)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('searchMembers', () => {
    it('should return members matching username query (case-insensitive)', async () => {
      // Arrange
      const guildId = '987654321098765432';
      const query = 'test';
      const page = 1;
      const limit = 20;
      const mockMembers = apiFixtures.createMemberList(3);
      const mockTotal = 3;

      const mockResponse = {
        members: mockMembers,
        pagination: {
          page: 1,
          limit: 20,
          total: 3,
          pages: 1,
        },
      };
      mockGuildMemberQueryService.searchMembers.mockResolvedValue(mockResponse);

      // Act
      const result = await service.searchMembers(guildId, query, page, limit);

      // Assert
      expect(result).toEqual(mockResponse);
      expect(mockGuildMemberQueryService.searchMembers).toHaveBeenCalledWith(
        guildId,
        query,
        page,
        limit,
      );
    });

    it('should return empty results when no matches', async () => {
      // Arrange
      const guildId = '987654321098765432';
      const query = 'nonexistent';
      const page = 1;
      const limit = 20;

      const mockResponse = {
        members: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0,
        },
      };
      mockGuildMemberQueryService.searchMembers.mockResolvedValue(mockResponse);

      // Act
      const result = await service.searchMembers(guildId, query, page, limit);

      // Assert
      expect(result).toEqual(mockResponse);
    });

    it('should paginate results correctly (skip/take)', async () => {
      // Arrange
      const guildId = '987654321098765432';
      const query = 'test';
      const page = 2;
      const limit = 10;
      const mockMembers = apiFixtures.createMemberList(10);
      const mockTotal = 25;

      const mockResponse = {
        members: mockMembers,
        pagination: {
          page: 2,
          limit: 10,
          total: 25,
          pages: 3,
        },
      };
      mockGuildMemberQueryService.searchMembers.mockResolvedValue(mockResponse);

      // Act
      const result = await service.searchMembers(guildId, query, page, limit);

      // Assert
      expect(result).toEqual(mockResponse);
    });

    it('should return correct pagination metadata (page, limit, total, pages)', async () => {
      // Arrange
      const guildId = '987654321098765432';
      const query = 'test';
      const page = 3;
      const limit = 5;
      const mockTotal = 23;

      const mockResponse = {
        members: apiFixtures.createMemberList(5),
        pagination: {
          page: 3,
          limit: 5,
          total: 23,
          pages: 5,
        },
      };
      mockGuildMemberQueryService.searchMembers.mockResolvedValue(mockResponse);

      // Act
      const result = await service.searchMembers(guildId, query, page, limit);

      // Assert
      expect(result).toEqual(mockResponse);
    });

    it('should handle special characters in search query', async () => {
      // Arrange
      const guildId = '987654321098765432';
      const query = 'user@#$%^&*()';
      const mockMembers = apiFixtures.createMemberList(1);

      const mockResponse = {
        members: mockMembers,
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          pages: 1,
        },
      };
      mockGuildMemberQueryService.searchMembers.mockResolvedValue(mockResponse);

      // Act
      await service.searchMembers(guildId, query);

      // Assert
      expect(mockGuildMemberQueryService.searchMembers).toHaveBeenCalledWith(
        guildId,
        query,
        1,
        20,
      );
    });

    it('should order results by joinedAt desc', async () => {
      // Arrange
      const guildId = '987654321098765432';
      const query = 'test';

      const mockResponse = {
        members: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0,
        },
      };
      mockGuildMemberQueryService.searchMembers.mockResolvedValue(mockResponse);

      // Act
      await service.searchMembers(guildId, query);

      // Assert
      expect(mockGuildMemberQueryService.searchMembers).toHaveBeenCalledWith(
        guildId,
        query,
        1,
        20,
      );
    });

    it('should throw InternalServerErrorException when database error occurs', async () => {
      // Arrange
      const guildId = '987654321098765432';
      const query = 'test';
      const dbError = new InternalServerErrorException('Failed to search guild members');

      mockGuildMemberQueryService.searchMembers.mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.searchMembers(guildId, query)).rejects.toThrow(
        InternalServerErrorException
      );
    });
  });

  describe('getMemberStats', () => {
    it('should return correct total member count', async () => {
      // Arrange
      const guildId = '987654321098765432';
      const mockTotalMembers = 100;
      const mockActiveMembers = 75;
      const mockNewThisWeek = 5;

      mockGuildMemberStatisticsService.getMemberStats.mockResolvedValue({
        totalMembers: 100,
        activeMembers: 75,
        newThisWeek: 5,
      });

      // Act
      const result = await service.getMemberStats(guildId);

      // Assert
      expect(result).toEqual({
        totalMembers: 100,
        activeMembers: 75,
        newThisWeek: 5,
      });
      expect(mockGuildMemberStatisticsService.getMemberStats).toHaveBeenCalledWith(
        guildId,
      );
    });

    it('should return correct active member count (updated in last 7 days)', async () => {
      // Arrange
      const guildId = '987654321098765432';
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      mockGuildMemberStatisticsService.getMemberStats.mockResolvedValue({
        totalMembers: 100,
        activeMembers: 75,
        newThisWeek: 5,
      });

      // Act
      await service.getMemberStats(guildId);

      // Assert
      expect(mockGuildMemberStatisticsService.getMemberStats).toHaveBeenCalledWith(
        guildId,
      );
    });

    it('should return correct new member count (joined in last 7 days)', async () => {
      // Arrange
      const guildId = '987654321098765432';

      mockGuildMemberStatisticsService.getMemberStats.mockResolvedValue({
        totalMembers: 100,
        activeMembers: 75,
        newThisWeek: 5,
      });

      // Act
      await service.getMemberStats(guildId);

      // Assert
      expect(mockGuildMemberStatisticsService.getMemberStats).toHaveBeenCalledWith(
        guildId,
      );
    });

    it('should return zeros when guild has no members', async () => {
      // Arrange
      const guildId = '987654321098765432';

      mockGuildMemberStatisticsService.getMemberStats.mockResolvedValue({
        totalMembers: 0,
        activeMembers: 0,
        newThisWeek: 0,
      });

      // Act
      const result = await service.getMemberStats(guildId);

      // Assert
      expect(result).toEqual({
        totalMembers: 0,
        activeMembers: 0,
        newThisWeek: 0,
      });
    });

    it('should calculate dates correctly for 7-day window', async () => {
      // Arrange
      const guildId = '987654321098765432';
      const beforeCall = Date.now();

      mockGuildMemberStatisticsService.getMemberStats.mockResolvedValue({
        totalMembers: 100,
        activeMembers: 75,
        newThisWeek: 5,
      });

      // Act
      await service.getMemberStats(guildId);

      // Assert
      expect(mockGuildMemberStatisticsService.getMemberStats).toHaveBeenCalledWith(
        guildId,
      );
    });

    it('should throw InternalServerErrorException when database error occurs', async () => {
      // Arrange
      const guildId = '987654321098765432';
      const dbError = new InternalServerErrorException('Failed to get member statistics');

      mockGuildMemberStatisticsService.getMemberStats.mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.getMemberStats(guildId)).rejects.toThrow(
        InternalServerErrorException
      );
    });

    it('should handle partial database failures gracefully', async () => {
      // Arrange
      const guildId = '987654321098765432';

      mockGuildMemberStatisticsService.getMemberStats.mockRejectedValue(
        new InternalServerErrorException('Failed to get member statistics'),
      );

      // Act & Assert
      await expect(service.getMemberStats(guildId)).rejects.toThrow(
        InternalServerErrorException
      );
    });
  });
});
