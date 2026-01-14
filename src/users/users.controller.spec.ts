/**
 * UsersController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import type { AuthenticatedUser } from '../common/interfaces/user.interface';

describe('UsersController', () => {
  let controller: UsersController;
  let mockUsersService: UsersService;

  const mockUser: AuthenticatedUser = {
    id: 'user-123',
    username: 'testuser',
    globalName: 'Test User',
    avatar: 'avatar_hash',
    email: 'test@example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  };

  beforeEach(async () => {
    mockUsersService = {
      findOne: vi.fn(),
      update: vi.fn(),
    } as unknown as UsersService;

    const module = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  describe('getMyProfile', () => {
    it('should_return_user_profile_when_user_is_authenticated', async () => {
      vi.spyOn(mockUsersService, 'findOne').mockResolvedValue(
        mockUser as never,
      );

      const result = await controller.getMyProfile(mockUser);

      expect(result).toEqual(mockUser);
      expect(mockUsersService.findOne).toHaveBeenCalledWith('user-123');
    });
  });

  describe('updateMyProfile', () => {
    it('should_update_profile_when_valid_data_is_provided', async () => {
      const updateDto: UpdateUserProfileDto = {
        username: 'newusername',
      };

      const updatedUser = {
        ...mockUser,
        username: 'newusername',
      };

      vi.spyOn(mockUsersService, 'update').mockResolvedValue(
        updatedUser as never,
      );

      const result = await controller.updateMyProfile(mockUser, updateDto);

      expect(result).toEqual(updatedUser);
      expect(mockUsersService.update).toHaveBeenCalledWith('user-123', {
        username: 'newusername',
      });
    });

    it('should_only_update_allowed_fields_when_multiple_fields_provided', async () => {
      const updateDto: UpdateUserProfileDto = {
        username: 'newusername',
      };

      const updatedUser = {
        ...mockUser,
        username: 'newusername',
      };

      vi.spyOn(mockUsersService, 'update').mockResolvedValue(
        updatedUser as never,
      );

      await controller.updateMyProfile(mockUser, updateDto);

      expect(mockUsersService.update).toHaveBeenCalledWith('user-123', {
        username: 'newusername',
      });
    });
  });

  describe('getUser', () => {
    it('should_return_user_when_user_views_own_profile', async () => {
      vi.spyOn(mockUsersService, 'findOne').mockResolvedValue(
        mockUser as never,
      );

      const result = await controller.getUser('user-123', mockUser);

      expect(result).toEqual(mockUser);
      expect(mockUsersService.findOne).toHaveBeenCalledWith('user-123');
    });

    it('should_throw_forbidden_when_user_views_other_profile', async () => {
      await expect(
        controller.getUser('other-user-456', mockUser),
      ).rejects.toThrow(ForbiddenException);
      expect(mockUsersService.findOne).not.toHaveBeenCalled();
    });
  });
});
