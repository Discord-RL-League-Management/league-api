/**
 * ProfileService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProfileService } from './profile.service';
import { UsersService } from '../users/users.service';
import { UserStatisticsService } from './services/user-statistics.service';
import {
  UserSettingsService,
  UserSettings,
} from './services/user-settings.service';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';

describe('ProfileService', () => {
  let service: ProfileService;
  let mockUsersService: UsersService;
  let mockUserStatisticsService: UserStatisticsService;
  let mockUserSettingsService: UserSettingsService;

  const mockUser = {
    id: 'user_123',
    username: 'testuser',
    globalName: 'Test User',
    avatar: 'avatar_url',
    email: 'test@example.com',
    createdAt: new Date(),
    lastLoginAt: new Date(),
  };

  const mockStats = {
    userId: 'user_123',
    gamesPlayed: 10,
    wins: 6,
    losses: 4,
    winRate: 0.6,
    guildsCount: 2,
    activeGuildsCount: 2,
  };

  const mockSettings: UserSettings = {
    notifications: {
      email: true,
      discord: false,
    },
    privacy: {
      showEmail: false,
      showStats: true,
    },
  };

  beforeEach(() => {
    mockUsersService = {
      getProfile: vi.fn(),
    } as unknown as UsersService;

    mockUserStatisticsService = {
      getStats: vi.fn(),
    } as unknown as UserStatisticsService;

    mockUserSettingsService = {
      getSettings: vi.fn(),
      updateSettings: vi.fn(),
    } as unknown as UserSettingsService;

    service = new ProfileService(
      mockUsersService,
      mockUserStatisticsService,
      mockUserSettingsService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getProfile', () => {
    it('should_return_user_profile_when_user_exists', async () => {
      const userId = 'user_123';
      vi.mocked(mockUsersService.getProfile).mockResolvedValue(mockUser);

      const result = await service.getProfile(userId);

      expect(result).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        globalName: mockUser.globalName,
        avatar: mockUser.avatar,
        email: mockUser.email,
        createdAt: mockUser.createdAt,
        lastLoginAt: mockUser.lastLoginAt,
      });
      expect(mockUsersService.getProfile).toHaveBeenCalledWith(userId);
    });

    it('should_return_profile_with_null_fields_when_user_has_null_values', async () => {
      const userId = 'user_123';
      const userWithNulls = {
        ...mockUser,
        globalName: null,
        avatar: null,
        email: null,
        lastLoginAt: null,
      };
      vi.mocked(mockUsersService.getProfile).mockResolvedValue(userWithNulls);

      const result = await service.getProfile(userId);

      expect(result.globalName).toBeNull();
      expect(result.avatar).toBeNull();
      expect(result.email).toBeNull();
      expect(result.lastLoginAt).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should_return_user_statistics_when_stats_exist', async () => {
      const userId = 'user_123';
      vi.mocked(mockUserStatisticsService.getStats).mockResolvedValue(
        mockStats,
      );

      const result = await service.getStats(userId);

      expect(result).toEqual(mockStats);
      expect(mockUserStatisticsService.getStats).toHaveBeenCalledWith(userId);
    });

    it('should_delegate_to_user_statistics_service', async () => {
      const userId = 'user_123';
      const emptyStats = {
        userId,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        guildsCount: 0,
        activeGuildsCount: 0,
      };
      vi.mocked(mockUserStatisticsService.getStats).mockResolvedValue(
        emptyStats,
      );

      const result = await service.getStats(userId);

      expect(result).toEqual(emptyStats);
    });
  });

  describe('getSettings', () => {
    it('should_return_user_settings_when_settings_exist', async () => {
      const userId = 'user_123';
      vi.mocked(mockUserSettingsService.getSettings).mockResolvedValue(
        mockSettings,
      );

      const result = await service.getSettings(userId);

      expect(result).toEqual(mockSettings);
      expect(mockUserSettingsService.getSettings).toHaveBeenCalledWith(userId);
    });

    it('should_delegate_to_user_settings_service', async () => {
      const userId = 'user_123';
      const defaultSettings: UserSettings = {
        notifications: {
          email: false,
          discord: false,
        },
        privacy: {
          showEmail: false,
          showStats: false,
        },
      };
      vi.mocked(mockUserSettingsService.getSettings).mockResolvedValue(
        defaultSettings,
      );

      const result = await service.getSettings(userId);

      expect(result).toEqual(defaultSettings);
    });
  });

  describe('updateSettings', () => {
    it('should_update_user_settings_when_valid_dto_provided', async () => {
      const userId = 'user_123';
      const updateDto: UpdateUserSettingsDto = {
        notifications: {
          email: false,
        },
      };
      const updatedSettings = {
        ...mockSettings,
        notifications: {
          ...mockSettings.notifications,
          email: false,
        },
      };
      vi.mocked(mockUserSettingsService.updateSettings).mockResolvedValue(
        updatedSettings,
      );

      const result = await service.updateSettings(userId, updateDto);

      expect(result).toEqual(updatedSettings);
      expect(mockUserSettingsService.updateSettings).toHaveBeenCalledWith(
        userId,
        updateDto,
      );
    });

    it('should_delegate_to_user_settings_service', async () => {
      const userId = 'user_123';
      const updateDto: UpdateUserSettingsDto = {
        privacy: {
          showEmail: true,
        },
      };
      const updatedSettings = {
        ...mockSettings,
        privacy: {
          ...mockSettings.privacy,
          showEmail: true,
        },
      };
      vi.mocked(mockUserSettingsService.updateSettings).mockResolvedValue(
        updatedSettings,
      );

      const result = await service.updateSettings(userId, updateDto);

      expect(result).toEqual(updatedSettings);
    });
  });
});
