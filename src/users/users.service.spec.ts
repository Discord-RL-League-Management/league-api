import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('should return user when found', async () => {
      const userId = '123456789';
      const mockUser = {
        id: userId,
        username: 'testuser',
        globalName: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne(userId);

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: userId } });
    });

    it('should throw NotFoundException when user not found', async () => {
      const userId = 'nonexistent';
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne(userId)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(userId)).rejects.toThrow(`User ${userId} not found`);
    });
  });

  describe('findAll', () => {
    it('should return all users ordered by creation date', async () => {
      const mockUsers = [
        {
          id: 'user1',
          username: 'user1',
          globalName: 'User One',
          createdAt: new Date('2023-01-01'),
        },
        {
          id: 'user2',
          username: 'user2',
          globalName: 'User Two',
          createdAt: new Date('2023-01-02'),
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.findAll();

      expect(result).toEqual(mockUsers);
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('create', () => {
    it('should create user with provided data', async () => {
      const userData = {
        id: '123456789',
        username: 'testuser',
        globalName: 'Test User',
        avatar: 'avatar123',
        email: 'test@example.com',
      };

      const mockCreatedUser = {
        ...userData,
        discriminator: null,
        accessToken: null,
        refreshToken: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };

      mockPrismaService.user.create.mockResolvedValue(mockCreatedUser);

      const result = await service.create(userData);

      expect(result).toEqual(mockCreatedUser);
      expect(prisma.user.create).toHaveBeenCalledWith({ data: userData });
    });
  });

  describe('update', () => {
    it('should update user with provided data', async () => {
      const userId = '123456789';
      const updateData = {
        username: 'updateduser',
        globalName: 'Updated User',
      };

      const mockUpdatedUser = {
        id: userId,
        ...updateData,
        discriminator: null,
        avatar: null,
        email: null,
        accessToken: null,
        refreshToken: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };

      mockPrismaService.user.update.mockResolvedValue(mockUpdatedUser);

      const result = await service.update(userId, updateData);

      expect(result).toEqual(mockUpdatedUser);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateData,
      });
    });
  });

  describe('delete', () => {
    it('should delete user by id', async () => {
      const userId = '123456789';
      const mockDeletedUser = {
        id: userId,
        username: 'testuser',
        globalName: 'Test User',
      };

      mockPrismaService.user.delete.mockResolvedValue(mockDeletedUser);

      const result = await service.delete(userId);

      expect(result).toEqual(mockDeletedUser);
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: userId } });
    });
  });
});
