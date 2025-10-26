import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GuildMembersService } from './guild-members.service';
import { PrismaService } from '../prisma/prisma.service';

describe('GuildMembersService', () => {
  let service: GuildMembersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    guild: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuildMembersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<GuildMembersService>(GuildMembersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create guild member when guild and user exist', async () => {
      // Arrange
      const memberData = {
        userId: '123',
        guildId: '456',
        username: 'testuser',
        roles: ['role1'],
      };
      const mockGuild = { id: '456', name: 'Test Guild' };
      const mockUser = { id: '123', username: 'testuser' };
      const mockMember = { ...memberData, id: 'member123' };

      mockPrismaService.guild.findUnique.mockResolvedValue(mockGuild);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.guildMember.upsert.mockResolvedValue(mockMember);

      // Act
      const result = await service.create(memberData);

      // Assert
      expect(result).toEqual(mockMember);
      expect(prisma.guild.findUnique).toHaveBeenCalledWith({
        where: { id: memberData.guildId },
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: memberData.userId },
      });
      expect(prisma.guildMember.upsert).toHaveBeenCalledWith({
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

    it('should throw NotFoundException when guild does not exist', async () => {
      // Arrange
      const memberData = {
        userId: '123',
        guildId: 'nonexistent',
        username: 'testuser',
      };
      mockPrismaService.guild.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(memberData)).rejects.toThrow(NotFoundException);
      await expect(service.create(memberData)).rejects.toThrow('Guild nonexistent not found');
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
      await expect(service.create(memberData)).rejects.toThrow(NotFoundException);
      await expect(service.create(memberData)).rejects.toThrow('User nonexistent not found');
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
      await expect(service.findOne(userId, guildId)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(userId, guildId)).rejects.toThrow(`Member ${userId} not found in guild ${guildId}`);
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
      await expect(service.remove(userId, guildId)).rejects.toThrow(NotFoundException);
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
      const mockGuild = { id: guildId, name: 'Test Guild' };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          guild: {
            findUnique: jest.fn().mockResolvedValue(mockGuild),
          },
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

    it('should throw NotFoundException when guild does not exist', async () => {
      // Arrange
      const guildId = 'nonexistent';
      const members = [{ userId: '123', username: 'user1', roles: [] }];

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          guild: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        });
      });

      // Act & Assert
      await expect(service.syncGuildMembers(guildId, members)).rejects.toThrow(NotFoundException);
    });
  });
});
