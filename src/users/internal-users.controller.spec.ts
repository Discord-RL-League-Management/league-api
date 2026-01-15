/**
 * InternalUsersController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { InternalUsersController } from './internal-users.controller';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from '@prisma/client';

describe('InternalUsersController', () => {
  let controller: InternalUsersController;
  let mockUsersService: UsersService;

  const mockUser: User = {
    id: 'user-123',
    username: 'testuser',
    discriminator: '1234',
    globalName: 'Test User',
    avatar: 'avatar_hash',
    email: 'test@example.com',
    accessToken: 'encrypted_access_token',
    refreshToken: 'encrypted_refresh_token',
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    isBanned: false,
    isDeleted: false,
  };

  beforeEach(async () => {
    mockUsersService = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as unknown as UsersService;

    const module = await Test.createTestingModule({
      controllers: [InternalUsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<InternalUsersController>(InternalUsersController);
  });

  describe('findAll', () => {
    it('should_return_all_users_when_called', async () => {
      const mockUsers = [mockUser];
      vi.spyOn(mockUsersService, 'findAll').mockResolvedValue(mockUsers);

      const result = await controller.findAll();

      expect(result).toEqual(mockUsers);
      expect(mockUsersService.findAll).toHaveBeenCalledWith();
    });

    it('should_return_empty_array_when_no_users_exist', async () => {
      vi.spyOn(mockUsersService, 'findAll').mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
      expect(mockUsersService.findAll).toHaveBeenCalledWith();
    });
  });

  describe('findOne', () => {
    it('should_return_user_when_id_provided', async () => {
      vi.spyOn(mockUsersService, 'findOne').mockResolvedValue(mockUser);

      const result = await controller.findOne('user-123');

      expect(result).toEqual(mockUser);
      expect(mockUsersService.findOne).toHaveBeenCalledWith('user-123');
    });
  });

  describe('create', () => {
    it('should_create_user_when_valid_dto_provided', async () => {
      const createUserDto: CreateUserDto = {
        id: 'user-456',
        username: 'newuser',
        email: 'newuser@example.com',
      };

      const createdUser: User = {
        ...mockUser,
        id: 'user-456',
        username: 'newuser',
        email: 'newuser@example.com',
      };

      vi.spyOn(mockUsersService, 'create').mockResolvedValue(createdUser);

      const result = await controller.create(createUserDto);

      expect(result).toEqual(createdUser);
      expect(mockUsersService.create).toHaveBeenCalledWith(createUserDto);
    });

    it('should_create_user_with_minimal_fields_when_only_required_fields_provided', async () => {
      const createUserDto: CreateUserDto = {
        id: 'user-789',
        username: 'minimaluser',
      };

      const createdUser: User = {
        ...mockUser,
        id: 'user-789',
        username: 'minimaluser',
      };

      vi.spyOn(mockUsersService, 'create').mockResolvedValue(createdUser);

      const result = await controller.create(createUserDto);

      expect(result).toEqual(createdUser);
      expect(mockUsersService.create).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('update', () => {
    it('should_update_user_when_valid_id_and_dto_provided', async () => {
      const updateUserDto: UpdateUserDto = {
        username: 'updateduser',
        email: 'updated@example.com',
      };

      const updatedUser: User = {
        ...mockUser,
        username: 'updateduser',
        email: 'updated@example.com',
      };

      vi.spyOn(mockUsersService, 'update').mockResolvedValue(updatedUser);

      const result = await controller.update('user-123', updateUserDto);

      expect(result).toEqual(updatedUser);
      expect(mockUsersService.update).toHaveBeenCalledWith(
        'user-123',
        updateUserDto,
      );
    });

    it('should_update_partial_fields_when_partial_dto_provided', async () => {
      const updateUserDto: UpdateUserDto = {
        username: 'partialupdate',
      };

      const updatedUser: User = {
        ...mockUser,
        username: 'partialupdate',
      };

      vi.spyOn(mockUsersService, 'update').mockResolvedValue(updatedUser);

      const result = await controller.update('user-123', updateUserDto);

      expect(result).toEqual(updatedUser);
      expect(mockUsersService.update).toHaveBeenCalledWith(
        'user-123',
        updateUserDto,
      );
    });
  });

  describe('delete', () => {
    it('should_delete_user_when_valid_id_provided', async () => {
      vi.spyOn(mockUsersService, 'delete').mockResolvedValue(mockUser);

      const result = await controller.delete('user-123');

      expect(result).toEqual(mockUser);
      expect(mockUsersService.delete).toHaveBeenCalledWith('user-123');
    });
  });
});
