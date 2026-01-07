/**
 * UsersController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getMyProfile', () => {
    it('should_return_user_profile_when_authenticated', async () => {
      vi.mocked(mockUsersService.findOne).mockResolvedValue(mockUser as never);

      const result = await controller.getMyProfile(mockUser);

      expect(result).toEqual(mockUser);
      expect(mockUsersService.findOne).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('updateMyProfile', () => {
    it('should_update_profile_when_dto_valid', async () => {
      const updateDto = { username: 'newusername' };
      const mockUpdated = { ...mockUser, ...updateDto };
      vi.mocked(mockUsersService.update).mockResolvedValue(
        mockUpdated as never,
      );

      const result = await controller.updateMyProfile(mockUser, updateDto);

      expect(result).toEqual(mockUpdated);
      expect(mockUsersService.update).toHaveBeenCalledWith(mockUser.id, {
        username: updateDto.username,
      });
    });
  });

  describe('getUser', () => {
    it('should_return_user_when_id_matches_current_user', async () => {
      vi.mocked(mockUsersService.findOne).mockResolvedValue(mockUser as never);

      const result = await controller.getUser(mockUser.id, mockUser);

      expect(result).toEqual(mockUser);
      expect(mockUsersService.findOne).toHaveBeenCalledWith(mockUser.id);
    });

    it('should_throw_forbidden_when_id_does_not_match', async () => {
      await expect(
        controller.getUser('other-user-id', mockUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
