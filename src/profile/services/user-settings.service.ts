import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * UserSettings - Interface for user preferences
 */
export interface UserSettings {
  notifications: {
    email: boolean;
    discord: boolean;
    gameReminders: boolean;
  };
  theme: 'light' | 'dark' | 'auto';
  privacy: {
    showStats: boolean;
    showGuilds: boolean;
    showGames: boolean;
  };
  preferences: {
    language: string;
    timezone: string;
  };
}

/**
 * UserSettingsService - Manages user preferences and settings
 * Single Responsibility: User preferences management
 *
 * Separates settings management from entity management.
 */
@Injectable()
export class UserSettingsService {
  private readonly logger = new Logger(UserSettingsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get user settings with defaults
   * Single Responsibility: Settings retrieval with defaults
   */
  async getSettings(userId: string): Promise<UserSettings> {
    try {
      return this.getDefaultSettings();
    } catch (error) {
      this.logger.error(`Failed to get settings for user ${userId}:`, error);
      return this.getDefaultSettings();
    }
  }

  /**
   * Update user settings
   * Single Responsibility: Settings updates with validation
   */
  async updateSettings(
    userId: string,
    settings: Partial<UserSettings>,
  ): Promise<UserSettings> {
    try {
      const currentSettings = await this.getSettings(userId);
      const mergedSettings = this.mergeSettings(currentSettings, settings);

      // Validate settings
      this.validateSettings(mergedSettings);

      this.logger.log(`Updated settings for user ${userId}`);
      return mergedSettings;
    } catch (error) {
      this.logger.error(`Failed to update settings for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get default settings
   */
  private getDefaultSettings(): UserSettings {
    return {
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
  }

  /**
   * Merge settings with defaults
   */
  private mergeSettings(
    current: UserSettings,
    updates: Partial<UserSettings>,
  ): UserSettings {
    return {
      notifications: {
        ...current.notifications,
        ...(updates.notifications || {}),
      },
      theme: updates.theme || current.theme,
      privacy: {
        ...current.privacy,
        ...(updates.privacy || {}),
      },
      preferences: {
        ...current.preferences,
        ...(updates.preferences || {}),
      },
    };
  }

  /**
   * Validate settings
   */
  private validateSettings(settings: UserSettings): void {
    if (!['light', 'dark', 'auto'].includes(settings.theme)) {
      throw new Error('Invalid theme value');
    }

    if (
      typeof settings.notifications.email !== 'boolean' ||
      typeof settings.notifications.discord !== 'boolean' ||
      typeof settings.notifications.gameReminders !== 'boolean'
    ) {
      throw new Error('Invalid notification settings');
    }

    if (
      typeof settings.privacy.showStats !== 'boolean' ||
      typeof settings.privacy.showGuilds !== 'boolean' ||
      typeof settings.privacy.showGames !== 'boolean'
    ) {
      throw new Error('Invalid privacy settings');
    }
  }
}
