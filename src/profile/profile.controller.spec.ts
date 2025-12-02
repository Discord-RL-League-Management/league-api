import { Test, TestingModule } from '@nestjs/testing';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import type { AuthenticatedUser } from '../common/interfaces/user.interface';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';

// Mock ProfileService
const mockProfileService = {
  getProfile: jest.fn(),
  getStats: jest.fn(),
  updateSettings: jest.fn(),
};

describe('ProfileController', () => {
  let controller: ProfileController;
  let profileService: ProfileService;

  beforeEach(async () => {
    // ARRANGE: Setup the testing module
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [
        {
          provide: ProfileService,
          useValue: mockProfileService,
        },
      ],
    }).compile();

    controller = module.get<ProfileController>(ProfileController);
    profileService = module.get<ProfileService>(ProfileService);
  });

  afterEach(() => {
    // Cleanup: Clear all mock usage data
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    // ASSERT
    expect(controller).toBeDefined();
  });

  describe('getMyProfile', () => {
    it('should return user profile data when valid user is provided', async () => {
      // ARRANGE
      const mockUser: AuthenticatedUser = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      } as AuthenticatedUser;
      const expectedProfile = {
        id: 'user123',
        username: 'testuser',
        globalName: 'Test User',
        avatar: 'avatar_hash',
        email: 'test@example.com',
        createdAt: new Date('2024-01-01'),
        lastLoginAt: new Date('2024-01-02'),
      };

      mockProfileService.getProfile.mockResolvedValue(expectedProfile);

      // ACT
      const result = await controller.getMyProfile(mockUser);

      // ASSERT
      expect(result).toEqual(expectedProfile);
      expect(profileService.getProfile).toHaveBeenCalledWith('user123');
      expect(profileService.getProfile).toHaveBeenCalledTimes(1);
    });

    it('should call profileService.getProfile with user id from authenticated user', async () => {
      // ARRANGE
      const mockUser: AuthenticatedUser = {
        id: 'different-user-id',
        username: 'anotheruser',
        email: 'another@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };
      const expectedProfile = {
        id: 'different-user-id',
        username: 'anotheruser',
        globalName: null,
        avatar: null,
        email: 'another@example.com',
        createdAt: new Date(),
        lastLoginAt: new Date(),
      };

      mockProfileService.getProfile.mockResolvedValue(expectedProfile);

      // ACT
      await controller.getMyProfile(mockUser);

      // ASSERT
      expect(profileService.getProfile).toHaveBeenCalledWith(
        'different-user-id',
      );
      expect(profileService.getProfile).toHaveBeenCalledTimes(1);
    });
  });

  describe('getMyStats', () => {
    it('should return user statistics when valid user is provided', async () => {
      // ARRANGE
      const mockUser: AuthenticatedUser = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      } as AuthenticatedUser;
      const expectedStats = {
        totalMatches: 10,
        wins: 7,
        losses: 3,
        winRate: 0.7,
      };

      mockProfileService.getStats.mockResolvedValue(expectedStats);

      // ACT
      const result = await controller.getMyStats(mockUser);

      // ASSERT
      expect(result).toEqual(expectedStats);
      expect(profileService.getStats).toHaveBeenCalledWith('user123');
      expect(profileService.getStats).toHaveBeenCalledTimes(1);
    });

    it('should call profileService.getStats with user id from authenticated user', async () => {
      // ARRANGE
      const mockUser: AuthenticatedUser = {
        id: 'stats-user-id',
        username: 'statsuser',
        email: 'stats@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };
      const expectedStats = {
        totalMatches: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
      };

      mockProfileService.getStats.mockResolvedValue(expectedStats);

      // ACT
      await controller.getMyStats(mockUser);

      // ASSERT
      expect(profileService.getStats).toHaveBeenCalledWith('stats-user-id');
      expect(profileService.getStats).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateSettings', () => {
    it('should successfully update user settings and return updated settings', async () => {
      // ARRANGE
      const mockUser: AuthenticatedUser = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      } as AuthenticatedUser;
      const inputSettings: UpdateUserSettingsDto = {
        theme: 'dark',
        notifications: {
          email: true,
          discord: false,
          gameReminders: true,
        },
      };
      const expectedUpdatedSettings = {
        notifications: {
          email: true,
          discord: false,
          gameReminders: true,
        },
        theme: 'dark',
        privacy: {
          showStats: true,
          showGuilds: true,
          showGames: true,
        },
        preferences: {
          language: 'en',
          timezone: 'UTC',
        },
      };

      mockProfileService.updateSettings.mockResolvedValue(
        expectedUpdatedSettings,
      );

      // ACT
      const result = await controller.updateSettings(mockUser, inputSettings);

      // ASSERT
      expect(result).toEqual(expectedUpdatedSettings);
      expect(profileService.updateSettings).toHaveBeenCalledWith(
        'user123',
        expect.any(Object),
      );
      expect(profileService.updateSettings).toHaveBeenCalledTimes(1);
    });

    it('should call profileService.updateSettings with user id and settings from request body', async () => {
      // ARRANGE
      const mockUser: AuthenticatedUser = {
        id: 'settings-user-id',
        username: 'settingsuser',
        email: 'settings@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };
      const inputSettings: UpdateUserSettingsDto = {
        theme: 'light',
        privacy: {
          showStats: false,
          showGuilds: true,
          showGames: false,
        },
      };
      const expectedUpdatedSettings = {
        notifications: {
          email: true,
          discord: true,
          gameReminders: true,
        },
        theme: 'light',
        privacy: {
          showStats: false,
          showGuilds: true,
          showGames: false,
        },
        preferences: {
          language: 'en',
          timezone: 'UTC',
        },
      };

      mockProfileService.updateSettings.mockResolvedValue(
        expectedUpdatedSettings,
      );

      // ACT
      await controller.updateSettings(mockUser, inputSettings);

      // ASSERT
      expect(profileService.updateSettings).toHaveBeenCalledWith(
        'settings-user-id',
        expect.any(Object),
      );
      expect(profileService.updateSettings).toHaveBeenCalledTimes(1);
    });

    it('should handle partial settings update with only theme specified', async () => {
      // ARRANGE
      const mockUser: AuthenticatedUser = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      } as AuthenticatedUser;
      const inputSettings: UpdateUserSettingsDto = {
        theme: 'auto',
      };
      const expectedUpdatedSettings = {
        notifications: {
          email: true,
          discord: true,
          gameReminders: true,
        },
        theme: 'auto',
        privacy: {
          showStats: true,
          showGuilds: true,
          showGames: true,
        },
        preferences: {
          language: 'en',
          timezone: 'UTC',
        },
      };

      mockProfileService.updateSettings.mockResolvedValue(
        expectedUpdatedSettings,
      );

      // ACT
      const result = await controller.updateSettings(mockUser, inputSettings);

      // ASSERT
      expect(result).toEqual(expectedUpdatedSettings);
      expect(profileService.updateSettings).toHaveBeenCalledWith(
        'user123',
        expect.any(Object),
      );
      expect(profileService.updateSettings).toHaveBeenCalledTimes(1);
    });

    it('should handle nested settings update with notifications and preferences', async () => {
      // ARRANGE
      const mockUser: AuthenticatedUser = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      } as AuthenticatedUser;
      const inputSettings: UpdateUserSettingsDto = {
        notifications: {
          email: false,
          discord: true,
          gameReminders: false,
        },
        preferences: {
          language: 'es',
          timezone: 'America/New_York',
        },
      };
      const expectedUpdatedSettings = {
        notifications: {
          email: false,
          discord: true,
          gameReminders: false,
        },
        theme: 'auto',
        privacy: {
          showStats: true,
          showGuilds: true,
          showGames: true,
        },
        preferences: {
          language: 'es',
          timezone: 'America/New_York',
        },
      };

      mockProfileService.updateSettings.mockResolvedValue(
        expectedUpdatedSettings,
      );

      // ACT
      const result = await controller.updateSettings(mockUser, inputSettings);

      // ASSERT
      expect(result).toEqual(expectedUpdatedSettings);
      expect(profileService.updateSettings).toHaveBeenCalledWith(
        'user123',
        expect.any(Object),
      );
      expect(profileService.updateSettings).toHaveBeenCalledTimes(1);
    });
  });
});
