/**
 * ProfileController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import type { AuthenticatedUser } from '../common/interfaces/user.interface';

describe('ProfileController', () => {
  let controller: ProfileController;
  let mockProfileService: ProfileService;

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
    mockProfileService = {
      getProfile: vi.fn(),
      getStats: vi.fn(),
      updateSettings: vi.fn(),
    } as unknown as ProfileService;

    const module = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [{ provide: ProfileService, useValue: mockProfileService }],
    }).compile();

    controller = module.get<ProfileController>(ProfileController);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getMyProfile', () => {
    it('should_return_profile_when_user_authenticated', async () => {
      const mockProfile = { user: mockUser, stats: {} };
      vi.mocked(mockProfileService.getProfile).mockResolvedValue(
        mockProfile as never,
      );

      const result = await controller.getMyProfile(mockUser);

      expect(result).toEqual(mockProfile);
      expect(mockProfileService.getProfile).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('getMyStats', () => {
    it('should_return_stats_when_user_authenticated', async () => {
      const mockStats = { totalLeagues: 5, totalPlayers: 3 };
      vi.mocked(mockProfileService.getStats).mockResolvedValue(
        mockStats as never,
      );

      const result = await controller.getMyStats(mockUser);

      expect(result).toEqual(mockStats);
      expect(mockProfileService.getStats).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('updateSettings', () => {
    it('should_update_settings_when_dto_valid', async () => {
      const settingsDto = { theme: 'dark' };
      const mockUpdated = { ...settingsDto };
      vi.mocked(mockProfileService.updateSettings).mockResolvedValue(
        mockUpdated as never,
      );

      const result = await controller.updateSettings(mockUser, settingsDto);

      expect(result).toEqual(mockUpdated);
      expect(mockProfileService.updateSettings).toHaveBeenCalledWith(
        mockUser.id,
        settingsDto,
      );
    });
  });
});
