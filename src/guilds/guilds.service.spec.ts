import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { GuildsService } from './guilds.service';
import { PrismaService } from '../prisma/prisma.service';

describe('GuildsService', () => {
  let service: GuildsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    guild: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    guildSettings: {
      create: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    guildMember: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuildsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<GuildsService>(GuildsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create guild with default settings', async () => {
      // Arrange
      const guildData = { id: '123', name: 'Test Guild', ownerId: '456' };
      const createdGuild = { ...guildData, createdAt: new Date() };
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          guild: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(createdGuild),
          },
          guildSettings: {
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });

      // Act
      const result = await service.create(guildData);

      // Assert
      expect(result).toEqual(createdGuild);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw ConflictException when guild already exists', async () => {
      // Arrange
      const guildData = { id: '123', name: 'Test Guild', ownerId: '456' };
      const existingGuild = { id: '123', name: 'Existing Guild' };
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          guild: {
            findUnique: jest.fn().mockResolvedValue(existingGuild),
          },
        });
      });

      // Act & Assert
      await expect(service.create(guildData)).rejects.toThrow(ConflictException);
      await expect(service.create(guildData)).rejects.toThrow('Guild 123 already exists');
    });
  });

  describe('findOne', () => {
    it('should return guild when found', async () => {
      // Arrange
      const guildId = '123';
      const mockGuild = {
        id: guildId,
        name: 'Test Guild',
        settings: { settings: {} },
        members: [],
        _count: { members: 0 },
      };
      mockPrismaService.guild.findUnique.mockResolvedValue(mockGuild);

      // Act
      const result = await service.findOne(guildId);

      // Assert
      expect(result).toEqual(mockGuild);
      expect(prisma.guild.findUnique).toHaveBeenCalledWith({
        where: { id: guildId },
        include: {
          settings: true,
          members: {
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
            take: 10,
            orderBy: { joinedAt: 'desc' },
          },
          _count: {
            select: { members: true },
          },
        },
      });
    });

    it('should throw NotFoundException when guild not found', async () => {
      // Arrange
      const guildId = 'nonexistent';
      mockPrismaService.guild.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(guildId)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(guildId)).rejects.toThrow(`Guild ${guildId} not found`);
    });
  });

  describe('remove', () => {
    it('should soft delete guild', async () => {
      // Arrange
      const guildId = '123';
      const existingGuild = { id: guildId, name: 'Test Guild' };
      const updatedGuild = { id: guildId, isActive: false, leftAt: expect.any(Date) };
      
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          guild: {
            findUnique: jest.fn().mockResolvedValue(existingGuild),
            update: jest.fn().mockResolvedValue(updatedGuild),
          },
          guildMember: {
            updateMany: jest.fn().mockResolvedValue({}),
          },
        });
      });

      // Act
      const result = await service.remove(guildId);

      // Assert
      expect(result).toEqual(updatedGuild);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException when guild not found', async () => {
      // Arrange
      const guildId = 'nonexistent';
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          guild: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        });
      });

      // Act & Assert
      await expect(service.remove(guildId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSettings', () => {
    it('should return guild settings when they exist', async () => {
      // Arrange
      const guildId = '123';
      const mockSettings = { settings: { features: { league_management: true } } };
      mockPrismaService.guildSettings.findUnique.mockResolvedValue(mockSettings);

      // Act
      const result = await service.getSettings(guildId);

      // Assert
      expect(result).toEqual(mockSettings);
      expect(prisma.guildSettings.findUnique).toHaveBeenCalledWith({
        where: { guildId },
      });
    });

    it('should return default settings when none exist', async () => {
      // Arrange
      const guildId = '123';
      mockPrismaService.guildSettings.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.getSettings(guildId);

      // Assert
      expect(result).toEqual({ settings: expect.objectContaining({
        features: expect.any(Object),
        permissions: expect.any(Object),
      })});
    });
  });
});
