/**
 * UserRepository Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestTokenPair } from '../../factories/token.factory';
import { UserRepository } from '@/users/repositories/user.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { UserTransformer } from '@/users/transformers/user.transformer';
import { User } from '@prisma/client';

describe('UserRepository', () => {
  let repository: UserRepository;
  let mockPrisma: PrismaService;
  let mockTransformer: UserTransformer;

  beforeEach(() => {
    // ARRANGE: Setup test dependencies
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
        upsert: vi.fn(),
      },
    } as unknown as PrismaService;

    mockTransformer = {
      transformForRetrieval: vi.fn((user) => user),
      transformForStorage: vi.fn((data) => data),
      transformArrayForRetrieval: vi.fn((users) => users),
    } as unknown as UserTransformer;

    repository = new UserRepository(mockPrisma, mockTransformer);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findById', () => {
    it('should_return_user_when_found', async () => {
      // ARRANGE
      const userId = 'user123';
      const user: User = {
        id: userId,
        username: 'testuser',
        discriminator: null,
        globalName: 'Test User',
        avatar: null,
        email: null,
        accessToken: null,
        refreshToken: null,
        isBanned: false,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };

      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(user);
      vi.mocked(mockTransformer.transformForRetrieval).mockReturnValue(user);

      // ACT
      const result = await repository.findById(userId);

      // ASSERT
      expect(result).toEqual(user);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });

    it('should_return_null_when_user_not_found', async () => {
      // ARRANGE
      const userId = 'user123';
      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(null);

      // ACT
      const result = await repository.findById(userId);

      // ASSERT
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should_return_paginated_users', async () => {
      // ARRANGE
      const users: User[] = [
        {
          id: 'user1',
          username: 'user1',
          discriminator: null,
          globalName: null,
          avatar: null,
          email: null,
          accessToken: null,
          refreshToken: null,
          isBanned: false,
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date(),
        },
      ];
      const total = 1;

      vi.mocked(mockPrisma.user.findMany).mockResolvedValue(users);
      vi.mocked(mockPrisma.user.count).mockResolvedValue(total);
      vi.mocked(mockTransformer.transformArrayForRetrieval).mockReturnValue(
        users,
      );

      // ACT
      const result = await repository.findAll({ page: 1, limit: 50 });

      // ASSERT
      expect(result.data).toEqual(users);
      expect(result.total).toBe(total);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });

    it('should_use_default_pagination_when_options_not_provided', async () => {
      // ARRANGE
      const users: User[] = [];
      const total = 0;

      vi.mocked(mockPrisma.user.findMany).mockResolvedValue(users);
      vi.mocked(mockPrisma.user.count).mockResolvedValue(total);
      vi.mocked(mockTransformer.transformArrayForRetrieval).mockReturnValue(
        users,
      );

      // ACT
      const result = await repository.findAll();

      // ASSERT
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });

    it('should_enforce_max_limit_of_100', async () => {
      // ARRANGE
      const users: User[] = [];
      const total = 0;

      vi.mocked(mockPrisma.user.findMany).mockResolvedValue(users);
      vi.mocked(mockPrisma.user.count).mockResolvedValue(total);
      vi.mocked(mockTransformer.transformArrayForRetrieval).mockReturnValue(
        users,
      );

      // ACT
      const result = await repository.findAll({ page: 1, limit: 200 });

      // ASSERT
      expect(result.limit).toBe(100);
    });
  });

  describe('create', () => {
    it('should_create_user_successfully', async () => {
      // ARRANGE
      const createDto = {
        id: 'user123',
        username: 'testuser',
        globalName: 'Test User',
        avatar: undefined,
      };
      const createdUser: User = {
        id: 'user123',
        username: 'testuser',
        discriminator: null,
        globalName: 'Test User',
        avatar: null,
        email: null,
        accessToken: null,
        refreshToken: null,
        isBanned: false,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };

      vi.mocked(mockTransformer.transformForStorage).mockReturnValue(
        createDto as any,
      );
      vi.mocked(mockPrisma.user.create).mockResolvedValue(createdUser);
      vi.mocked(mockTransformer.transformForRetrieval).mockReturnValue(
        createdUser,
      );

      // ACT
      const result = await repository.create(createDto);

      // ASSERT
      expect(result).toEqual(createdUser);
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should_update_user_successfully', async () => {
      // ARRANGE
      const userId = 'user123';
      const updateDto = {
        globalName: 'Updated Name',
      };
      const updatedUser: User = {
        id: userId,
        username: 'testuser',
        discriminator: null,
        globalName: 'Updated Name',
        avatar: null,
        email: null,
        accessToken: null,
        refreshToken: null,
        isBanned: false,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };

      vi.mocked(mockTransformer.transformForStorage).mockReturnValue(
        updateDto as any,
      );
      vi.mocked(mockPrisma.user.update).mockResolvedValue(updatedUser);
      vi.mocked(mockTransformer.transformForRetrieval).mockReturnValue(
        updatedUser,
      );

      // ACT
      const result = await repository.update(userId, updateDto);

      // ASSERT
      expect(result).toEqual(updatedUser);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateDto,
      });
    });
  });

  describe('delete', () => {
    it('should_delete_user_successfully', async () => {
      // ARRANGE
      const userId = 'user123';
      const deletedUser: User = {
        id: userId,
        username: 'testuser',
        discriminator: null,
        globalName: null,
        avatar: null,
        email: null,
        accessToken: null,
        refreshToken: null,
        isBanned: false,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };

      vi.mocked(mockPrisma.user.delete).mockResolvedValue(deletedUser);
      vi.mocked(mockTransformer.transformForRetrieval).mockReturnValue(
        deletedUser,
      );

      // ACT
      const result = await repository.delete(userId);

      // ASSERT
      expect(result).toEqual(deletedUser);
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });
  });

  describe('exists', () => {
    it('should_return_true_when_user_exists', async () => {
      // ARRANGE
      const userId = 'user123';
      const user = { id: userId };

      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(user as User);

      // ACT
      const result = await repository.exists(userId);

      // ASSERT
      expect(result).toBe(true);
    });

    it('should_return_false_when_user_not_exists', async () => {
      // ARRANGE
      const userId = 'user123';
      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(null);

      // ACT
      const result = await repository.exists(userId);

      // ASSERT
      expect(result).toBe(false);
    });
  });

  describe('upsert', () => {
    it('should_create_user_when_not_exists', async () => {
      // ARRANGE
      const data = {
        id: 'user123',
        username: 'testuser',
        globalName: 'Test User',
        avatar: null,
      };
      const createdUser: User = {
        id: 'user123',
        username: 'testuser',
        discriminator: null,
        globalName: 'Test User',
        avatar: null,
        email: null,
        accessToken: null,
        refreshToken: null,
        isBanned: false,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };

      vi.mocked(mockTransformer.transformForStorage).mockReturnValue(
        data as any,
      );
      vi.mocked(mockPrisma.user.upsert).mockResolvedValue(createdUser);
      vi.mocked(mockTransformer.transformForRetrieval).mockReturnValue(
        createdUser,
      );

      // ACT
      const result = await repository.upsert(data);

      // ASSERT
      expect(result).toEqual(createdUser);
    });
  });

  describe('getUserTokens', () => {
    it('should_return_tokens_when_user_exists', async () => {
      // ARRANGE
      const userId = 'user123';
      const testTokens = createTestTokenPair('user');
      const user = {
        accessToken: testTokens.accessToken,
        refreshToken: testTokens.refreshToken,
      };

      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(user as any);
      vi.mocked(mockTransformer.transformForRetrieval).mockReturnValue(
        user as any,
      );

      // ACT
      const result = await repository.getUserTokens(userId);

      // ASSERT
      expect(result.accessToken).toBe(testTokens.accessToken);
      expect(result.refreshToken).toBe(testTokens.refreshToken);
    });

    it('should_return_null_tokens_when_user_not_exists', async () => {
      // ARRANGE
      const userId = 'user123';
      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(null);

      // ACT
      const result = await repository.getUserTokens(userId);

      // ASSERT
      expect(result.accessToken).toBeNull();
      expect(result.refreshToken).toBeNull();
    });
  });

  describe('updateUserTokens', () => {
    it('should_update_tokens_successfully', async () => {
      // ARRANGE
      const userId = 'user123';
      const testTokens = createTestTokenPair('updated');
      const tokens = {
        accessToken: testTokens.accessToken,
        refreshToken: testTokens.refreshToken,
      };
      const updatedUser: User = {
        id: userId,
        username: 'testuser',
        discriminator: null,
        globalName: null,
        avatar: null,
        email: null,
        accessToken: testTokens.accessToken,
        refreshToken: testTokens.refreshToken,
        isBanned: false,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };

      vi.mocked(mockTransformer.transformForStorage).mockReturnValue(
        tokens as any,
      );
      vi.mocked(mockPrisma.user.update).mockResolvedValue(updatedUser);
      vi.mocked(mockTransformer.transformForRetrieval).mockReturnValue(
        updatedUser,
      );

      // ACT
      const result = await repository.updateUserTokens(userId, tokens);

      // ASSERT
      expect(result.accessToken).toBe(testTokens.accessToken);
      expect(result.refreshToken).toBe(testTokens.refreshToken);
    });
  });

  describe('getProfile', () => {
    it('should_return_user_profile', async () => {
      // ARRANGE
      const userId = 'user123';
      const profile = {
        id: userId,
        username: 'testuser',
        globalName: 'Test User',
        avatar: 'avatar_hash',
        email: 'test@example.com',
        createdAt: new Date(),
        lastLoginAt: new Date(),
      };

      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(profile as any);

      // ACT
      const result = await repository.getProfile(userId);

      // ASSERT
      expect(result).toEqual(profile);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          globalName: true,
          avatar: true,
          email: true,
          createdAt: true,
          lastLoginAt: true,
        },
      });
    });
  });
});
