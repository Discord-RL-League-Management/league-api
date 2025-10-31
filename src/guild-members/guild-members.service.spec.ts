import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { GuildMembersService } from './guild-members.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { apiFixtures } from '../../test/fixtures/member.fixtures';

describe('GuildMembersService', () => {
  let service: GuildMembersService;
  let prisma: PrismaService;
  let usersService: UsersService;

  const mockPrismaService = {
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
      mockPrismaService.guildMember.upsert.mockResolvedValue(mockMember);

      // Act
      const result = await service.create(memberData);

      // Assert
      expect(result).toEqual(mockMember);
      expect(mockUsersService.exists).toHaveBeenCalledWith(memberData.userId);
      expect(mockPrismaService.guildMember.upsert).toHaveBeenCalledWith({
        where: {
          userId_guildId: {
            userId: memberData.userId,
            guildId: memberData.guildId,
          },
        },
        update: {
          username: memberData.username,
          roles: memberData.roles,
          updatedAt: expect.any(Date),
        },
        create: {
          ...memberData,
          roles: memberData.roles,
        },
      });
    });

    it('should throw NotFoundException when guild does not exist (foreign key error)', async () => {
      // Arrange
      const memberData = {
        userId: '123',
        guildId: 'nonexistent',
        username: 'testuser',
      };
      mockUsersService.exists.mockResolvedValue(true);
      const foreignKeyError = new Error('Foreign key constraint failed');
      foreignKeyError.code = 'P2003';
      mockPrismaService.guildMember.upsert.mockRejectedValue(foreignKeyError);

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
      const mockGuild = { id: '456', name: 'Test Guild' };
      mockPrismaService.guild.findUnique.mockResolvedValue(mockGuild);
      mockPrismaService.user.findUnique.mockResolvedValue(null);

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
      mockPrismaService.guildMember.findUnique.mockResolvedValue(mockMember);

      // Act
      const result = await service.findOne(userId, guildId);

      // Assert
      expect(result).toEqual(mockMember);
      expect(prisma.guildMember.findUnique).toHaveBeenCalledWith({
        where: {
          userId_guildId: {
            userId,
            guildId,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              globalName: true,
              avatar: true,
              email: true,
              lastLoginAt: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException when member not found', async () => {
      // Arrange
      const userId = '123';
      const guildId = '456';
      mockPrismaService.guildMember.findUnique.mockResolvedValue(null);

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
      const mockMember = { id: 'member123', userId, guildId };
      mockPrismaService.guildMember.findUnique.mockResolvedValue(mockMember);
      mockPrismaService.guildMember.delete.mockResolvedValue(mockMember);

      // Act
      await service.remove(userId, guildId);

      // Assert
      expect(prisma.guildMember.findUnique).toHaveBeenCalledWith({
        where: {
          userId_guildId: {
            userId,
            guildId,
          },
        },
      });
      expect(prisma.guildMember.delete).toHaveBeenCalledWith({
        where: {
          userId_guildId: {
            userId,
            guildId,
          },
        },
      });
    });

    it('should throw NotFoundException when member not found', async () => {
      // Arrange
      const userId = '123';
      const guildId = '456';
      mockPrismaService.guildMember.findUnique.mockResolvedValue(null);

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

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          guildMember: {
            deleteMany: jest.fn().mockResolvedValue({}),
            createMany: jest.fn().mockResolvedValue({}),
          },
        });
      });

      // Act
      const result = await service.syncGuildMembers(guildId, members);

      // Assert
      expect(result).toEqual({ synced: members.length });
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException when guild does not exist (foreign key error)', async () => {
      // Arrange
      const guildId = 'nonexistent';
      const members = [{ userId: '123', username: 'user1', roles: [] }];

      const foreignKeyError = new Error('Foreign key constraint failed');
      foreignKeyError.code = 'P2003';
      mockPrismaService.$transaction.mockRejectedValue(foreignKeyError);

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

      mockPrismaService.guildMember.findMany.mockResolvedValue(mockMembers);
      mockPrismaService.guildMember.count.mockResolvedValue(mockTotal);

      // Act
      const result = await service.searchMembers(guildId, query, page, limit);

      // Assert
      expect(result).toEqual({
        members: mockMembers,
        pagination: {
          page: 1,
          limit: 20,
          total: 3,
          pages: 1,
        },
      });
      expect(prisma.guildMember.findMany).toHaveBeenCalledWith({
        where: {
          guildId,
          OR: [
            { username: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              globalName: true,
              avatar: true,
              lastLoginAt: true,
            },
          },
        },
        skip: 0,
        take: 20,
        orderBy: { joinedAt: 'desc' },
      });
    });

    it('should return empty results when no matches', async () => {
      // Arrange
      const guildId = '987654321098765432';
      const query = 'nonexistent';
      const page = 1;
      const limit = 20;

      mockPrismaService.guildMember.findMany.mockResolvedValue([]);
      mockPrismaService.guildMember.count.mockResolvedValue(0);

      // Act
      const result = await service.searchMembers(guildId, query, page, limit);

      // Assert
      expect(result).toEqual({
        members: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0,
        },
      });
    });

    it('should paginate results correctly (skip/take)', async () => {
      // Arrange
      const guildId = '987654321098765432';
      const query = 'test';
      const page = 2;
      const limit = 10;
      const mockMembers = apiFixtures.createMemberList(10);
      const mockTotal = 25;

      mockPrismaService.guildMember.findMany.mockResolvedValue(mockMembers);
      mockPrismaService.guildMember.count.mockResolvedValue(mockTotal);

      // Act
      const result = await service.searchMembers(guildId, query, page, limit);

      // Assert
      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        pages: 3,
      });
      expect(prisma.guildMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10, // (page - 1) * limit
          take: 10,
        })
      );
    });

    it('should return correct pagination metadata (page, limit, total, pages)', async () => {
      // Arrange
      const guildId = '987654321098765432';
      const query = 'test';
      const page = 3;
      const limit = 5;
      const mockTotal = 23;

      mockPrismaService.guildMember.findMany.mockResolvedValue(apiFixtures.createMemberList(5));
      mockPrismaService.guildMember.count.mockResolvedValue(mockTotal);

      // Act
      const result = await service.searchMembers(guildId, query, page, limit);

      // Assert
      expect(result.pagination).toEqual({
        page: 3,
        limit: 5,
        total: 23,
        pages: 5, // Math.ceil(23 / 5)
      });
    });

    it('should handle special characters in search query', async () => {
      // Arrange
      const guildId = '987654321098765432';
      const query = 'user@#$%^&*()';
      const mockMembers = apiFixtures.createMemberList(1);

      mockPrismaService.guildMember.findMany.mockResolvedValue(mockMembers);
      mockPrismaService.guildMember.count.mockResolvedValue(1);

      // Act
      await service.searchMembers(guildId, query);

      // Assert
      expect(prisma.guildMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            guildId,
            OR: [
              { username: { contains: query, mode: 'insensitive' } },
            ],
          },
        })
      );
    });

    it('should order results by joinedAt desc', async () => {
      // Arrange
      const guildId = '987654321098765432';
      const query = 'test';

      mockPrismaService.guildMember.findMany.mockResolvedValue([]);
      mockPrismaService.guildMember.count.mockResolvedValue(0);

      // Act
      await service.searchMembers(guildId, query);

      // Assert
      expect(prisma.guildMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { joinedAt: 'desc' },
        })
      );
    });

    it('should throw InternalServerErrorException when database error occurs', async () => {
      // Arrange
      const guildId = '987654321098765432';
      const query = 'test';
      const dbError = new Error('Database connection failed');

      mockPrismaService.guildMember.findMany.mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.searchMembers(guildId, query)).rejects.toThrow(
        InternalServerErrorException
      );
      await expect(service.searchMembers(guildId, query)).rejects.toThrow(
        'Failed to search guild members'
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

      mockPrismaService.guildMember.count
        .mockResolvedValueOnce(mockTotalMembers) // First call for total
        .mockResolvedValueOnce(mockActiveMembers) // Second call for active
        .mockResolvedValueOnce(mockNewThisWeek); // Third call for new

      // Act
      const result = await service.getMemberStats(guildId);

      // Assert
      expect(result).toEqual({
        totalMembers: 100,
        activeMembers: 75,
        newThisWeek: 5,
      });
      expect(prisma.guildMember.count).toHaveBeenCalledTimes(3);
    });

    it('should return correct active member count (updated in last 7 days)', async () => {
      // Arrange
      const guildId = '987654321098765432';
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      mockPrismaService.guildMember.count
        .mockResolvedValueOnce(100) // Total
        .mockResolvedValueOnce(75) // Active
        .mockResolvedValueOnce(5); // New

      // Act
      await service.getMemberStats(guildId);

      // Assert
      expect(prisma.guildMember.count).toHaveBeenNthCalledWith(2, {
        where: {
          guildId,
          updatedAt: { gte: expect.any(Date) },
        },
      });
    });

    it('should return correct new member count (joined in last 7 days)', async () => {
      // Arrange
      const guildId = '987654321098765432';

      mockPrismaService.guildMember.count
        .mockResolvedValueOnce(100) // Total
        .mockResolvedValueOnce(75) // Active
        .mockResolvedValueOnce(5); // New

      // Act
      await service.getMemberStats(guildId);

      // Assert
      expect(prisma.guildMember.count).toHaveBeenNthCalledWith(3, {
        where: {
          guildId,
          joinedAt: { gte: expect.any(Date) },
        },
      });
    });

    it('should return zeros when guild has no members', async () => {
      // Arrange
      const guildId = '987654321098765432';

      mockPrismaService.guildMember.count
        .mockResolvedValueOnce(0) // Total
        .mockResolvedValueOnce(0) // Active
        .mockResolvedValueOnce(0); // New

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

      mockPrismaService.guildMember.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(75)
        .mockResolvedValueOnce(5);

      // Act
      await service.getMemberStats(guildId);

      // Assert
      const afterCall = Date.now();
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

      // Check that the date is within the expected range
      const activeCall = mockPrismaService.guildMember.count.mock.calls[1][0];
      const newCall = mockPrismaService.guildMember.count.mock.calls[2][0];

      expect(activeCall.where.updatedAt.gte.getTime()).toBeGreaterThanOrEqual(
        beforeCall - sevenDaysInMs
      );
      expect(activeCall.where.updatedAt.gte.getTime()).toBeLessThanOrEqual(afterCall);

      expect(newCall.where.joinedAt.gte.getTime()).toBeGreaterThanOrEqual(
        beforeCall - sevenDaysInMs
      );
      expect(newCall.where.joinedAt.gte.getTime()).toBeLessThanOrEqual(afterCall);
    });

    it('should throw InternalServerErrorException when database error occurs', async () => {
      // Arrange
      const guildId = '987654321098765432';
      const dbError = new Error('Database connection failed');

      mockPrismaService.guildMember.count.mockRejectedValue(dbError);

      // Act & Assert
      await expect(service.getMemberStats(guildId)).rejects.toThrow(
        InternalServerErrorException
      );
      await expect(service.getMemberStats(guildId)).rejects.toThrow(
        'Failed to get member statistics'
      );
    });

    it('should handle partial database failures gracefully', async () => {
      // Arrange
      const guildId = '987654321098765432';

      mockPrismaService.guildMember.count
        .mockResolvedValueOnce(100) // Total succeeds
        .mockRejectedValueOnce(new Error('Active query failed')) // Active fails
        .mockResolvedValueOnce(5); // New succeeds

      // Act & Assert
      await expect(service.getMemberStats(guildId)).rejects.toThrow(
        InternalServerErrorException
      );
    });
  });
});
