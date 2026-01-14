/**
 * UsersService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UsersService } from './users.service';
import { UserRepository } from './repositories/user.repository';
import { UserNotFoundException } from './exceptions/user.exceptions';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UsersService', () => {
  let service: UsersService;
  let mockRepository: UserRepository;

  const mockUser = {
    id: '123456789012345678',
    username: 'testuser',
    discriminator: null,
    globalName: 'Test User',
    avatar: 'a_abc123',
    email: 'test@example.com',
    accessToken: 'access_token_123',
    refreshToken: 'refresh_token_123',
    isBanned: false,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  };

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      exists: vi.fn(),
      getUserTokens: vi.fn(),
      updateUserTokens: vi.fn(),
      getProfile: vi.fn(),
      upsert: vi.fn(),
    } as unknown as UserRepository;

    service = new UsersService(mockRepository);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findOne', () => {
    it('should_return_user_when_user_exists', async () => {
      const userId = '123456789012345678';
      vi.mocked(mockRepository.findById).mockResolvedValue(mockUser);

      const result = await service.findOne(userId);

      expect(result).toEqual(mockUser);
      expect(result.id).toBe(userId);
    });

    it('should_throw_UserNotFoundException_when_user_does_not_exist', async () => {
      const userId = 'nonexistent';
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      await expect(service.findOne(userId)).rejects.toThrow(
        UserNotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should_return_users_when_pagination_options_provided', async () => {
      const options = { page: 1, limit: 10 };
      const mockResult = {
        data: [mockUser],
        total: 1,
        page: 1,
        limit: 10,
      };
      vi.mocked(mockRepository.findAll).mockResolvedValue(mockResult);

      const result = await service.findAll(options);

      expect(result).toEqual([mockUser]);
      expect(result).toHaveLength(1);
    });

    it('should_return_users_when_no_pagination_options_provided', async () => {
      const mockResult = {
        data: [mockUser],
        total: 1,
        page: 1,
        limit: 50,
      };
      vi.mocked(mockRepository.findAll).mockResolvedValue(mockResult);

      const result = await service.findAll();

      expect(result).toEqual([mockUser]);
      expect(result).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('should_create_user_when_valid_data_provided', async () => {
      const createDto: CreateUserDto = {
        id: '123456789012345678',
        username: 'newuser',
        globalName: 'New User',
        avatar: 'a_abc123',
      };
      const createdUser = {
        ...mockUser,
        ...createDto,
      };
      vi.mocked(mockRepository.create).mockResolvedValue(createdUser);

      const result = await service.create(createDto);

      expect(result).toEqual(createdUser);
      expect(result.username).toBe(createDto.username);
    });
  });

  describe('update', () => {
    it('should_update_user_when_user_exists', async () => {
      const userId = '123456789012345678';
      const updateDto: UpdateUserDto = {
        globalName: 'Updated Name',
      };
      const updatedUser = {
        ...mockUser,
        ...updateDto,
      };
      vi.mocked(mockRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(mockRepository.update).mockResolvedValue(updatedUser);

      const result = await service.update(userId, updateDto);

      expect(result).toEqual(updatedUser);
      expect(result.globalName).toBe(updateDto.globalName);
    });

    it('should_throw_UserNotFoundException_when_user_does_not_exist', async () => {
      const userId = 'nonexistent';
      const updateDto: UpdateUserDto = {
        globalName: 'Updated Name',
      };
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      await expect(service.update(userId, updateDto)).rejects.toThrow(
        UserNotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should_delete_user_when_user_exists', async () => {
      const userId = '123456789012345678';
      vi.mocked(mockRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(mockRepository.delete).mockResolvedValue(mockUser);

      const result = await service.delete(userId);

      expect(result).toEqual(mockUser);
    });

    it('should_throw_UserNotFoundException_when_user_does_not_exist', async () => {
      const userId = 'nonexistent';
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      await expect(service.delete(userId)).rejects.toThrow(
        UserNotFoundException,
      );
    });
  });

  describe('getUserTokens', () => {
    it('should_return_tokens_when_tokens_exist', async () => {
      const userId = '123456789012345678';
      const tokens = {
        accessToken: 'access_token_123',
        refreshToken: 'refresh_token_123',
      };
      vi.mocked(mockRepository.getUserTokens).mockResolvedValue(tokens);

      const result = await service.getUserTokens(userId);

      expect(result).toEqual(tokens);
      expect(result.accessToken).toBe(tokens.accessToken);
      expect(result.refreshToken).toBe(tokens.refreshToken);
    });

    it('should_return_tokens_when_tokens_are_null_but_user_exists', async () => {
      const userId = '123456789012345678';
      const tokens = {
        accessToken: null,
        refreshToken: null,
      };
      vi.mocked(mockRepository.getUserTokens).mockResolvedValue(tokens);
      vi.mocked(mockRepository.exists).mockResolvedValue(true);

      const result = await service.getUserTokens(userId);

      expect(result).toEqual(tokens);
    });

    it('should_throw_UserNotFoundException_when_user_does_not_exist', async () => {
      const userId = 'nonexistent';
      const tokens = {
        accessToken: null,
        refreshToken: null,
      };
      vi.mocked(mockRepository.getUserTokens).mockResolvedValue(tokens);
      vi.mocked(mockRepository.exists).mockResolvedValue(false);

      await expect(service.getUserTokens(userId)).rejects.toThrow(
        UserNotFoundException,
      );
    });
  });

  describe('updateUserTokens', () => {
    it('should_update_tokens_when_user_exists', async () => {
      const userId = '123456789012345678';
      const tokens = {
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
      };
      const updatedUser = {
        ...mockUser,
        ...tokens,
      };
      vi.mocked(mockRepository.exists).mockResolvedValue(true);
      vi.mocked(mockRepository.updateUserTokens).mockResolvedValue(updatedUser);

      const result = await service.updateUserTokens(userId, tokens);

      expect(result).toEqual(updatedUser);
    });

    it('should_throw_UserNotFoundException_when_user_does_not_exist', async () => {
      const userId = 'nonexistent';
      const tokens = {
        accessToken: 'new_access_token',
      };
      vi.mocked(mockRepository.exists).mockResolvedValue(false);

      await expect(service.updateUserTokens(userId, tokens)).rejects.toThrow(
        UserNotFoundException,
      );
    });
  });

  describe('getProfile', () => {
    it('should_return_profile_when_user_exists', async () => {
      const userId = '123456789012345678';
      const profile = {
        id: mockUser.id,
        username: mockUser.username,
        globalName: mockUser.globalName,
        avatar: mockUser.avatar,
        email: mockUser.email,
        createdAt: mockUser.createdAt,
        lastLoginAt: mockUser.lastLoginAt,
      };
      vi.mocked(mockRepository.getProfile).mockResolvedValue(profile);

      const result = await service.getProfile(userId);

      expect(result).toEqual(profile);
      expect(result.id).toBe(userId);
    });

    it('should_throw_UserNotFoundException_when_profile_not_found', async () => {
      const userId = 'nonexistent';
      vi.mocked(mockRepository.getProfile).mockResolvedValue(null);

      await expect(service.getProfile(userId)).rejects.toThrow(
        UserNotFoundException,
      );
    });
  });

  describe('exists', () => {
    it('should_return_true_when_user_exists', async () => {
      const userId = '123456789012345678';
      vi.mocked(mockRepository.exists).mockResolvedValue(true);

      const result = await service.exists(userId);

      expect(result).toBe(true);
    });

    it('should_return_false_when_user_does_not_exist', async () => {
      const userId = 'nonexistent';
      vi.mocked(mockRepository.exists).mockResolvedValue(false);

      const result = await service.exists(userId);

      expect(result).toBe(false);
    });
  });

  describe('upsert', () => {
    it('should_upsert_user_when_valid_data_provided', async () => {
      const upsertData = {
        id: '123456789012345678',
        username: 'upsertuser',
        globalName: 'Upsert User',
        avatar: 'a_abc123',
      };
      const upsertedUser = {
        ...mockUser,
        ...upsertData,
      };
      vi.mocked(mockRepository.upsert).mockResolvedValue(upsertedUser);

      const result = await service.upsert(upsertData);

      expect(result).toEqual(upsertedUser);
      expect(result.username).toBe(upsertData.username);
    });
  });
});
