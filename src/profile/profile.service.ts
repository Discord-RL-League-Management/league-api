import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { UserStatisticsService } from './services/user-statistics.service';
import { UserSettingsService, UserSettings } from './services/user-settings.service';

/**
 * ProfileService - Aggregates and presents user profile data
 * Single Responsibility: Profile presentation and aggregation
 * 
 * Separates profile presentation from entity management.
 * This service aggregates data from multiple sources (User, Stats, Settings)
 * and transforms it into a presentation-friendly format.
 */
@Injectable()
export class ProfileService {
  constructor(
    private usersService: UsersService,
    private userStatisticsService: UserStatisticsService,
    private userSettingsService: UserSettingsService,
  ) {}

  /**
   * Get user profile with aggregated data
   * Single Responsibility: Profile aggregation and transformation
   */
  async getProfile(userId: string) {
    // Get user entity data
    const userData = await this.usersService.getProfile(userId);

    // Transform to presentation-friendly format
    return {
      id: userData.id,
      username: userData.username,
      globalName: userData.globalName,
      avatar: userData.avatar,
      email: userData.email,
      createdAt: userData.createdAt,
      lastLoginAt: userData.lastLoginAt,
    };
  }

  /**
   * Get user statistics
   * Single Responsibility: Statistics aggregation
   */
  async getStats(userId: string) {
    return this.userStatisticsService.getStats(userId);
  }

  /**
   * Get user settings
   * Single Responsibility: Settings retrieval
   */
  async getSettings(userId: string): Promise<UserSettings> {
    return this.userSettingsService.getSettings(userId);
  }

  /**
   * Update user settings
   * Single Responsibility: Settings updates
   */
  async updateSettings(
    userId: string,
    settings: Partial<UserSettings>,
  ): Promise<UserSettings> {
    return this.userSettingsService.updateSettings(userId, settings);
  }
}
