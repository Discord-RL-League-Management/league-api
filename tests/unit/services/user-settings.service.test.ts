/**
 * UserSettingsService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { UserSettingsService } from '@/profile/services/user-settings.service';
import { PrismaService } from '@/prisma/prisma.service';

describe('UserSettingsService', () => {
  let service: UserSettingsService;
  let mockPrisma: PrismaService;

  beforeEach(() => {
    // ARRANGE: Setup test dependencies
    mockPrisma = {} as PrismaService;
    service = new UserSettingsService(mockPrisma);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getSettings', () => {
    it('should_return_default_settings', async () => {
      // ARRANGE
      const userId = 'user123';

      // ACT
      const result = await service.getSettings(userId);

      // ASSERT
      expect(result).toBeDefined();
      expect(result.notifications).toEqual({
        email: true,
        discord: true,
        gameReminders: true,
      });
      expect(result.theme).toBe('auto');
      expect(result.privacy).toBeDefined();
      expect(result.preferences).toBeDefined();
    });

    it('should_return_default_settings_on_error', async () => {
      // ARRANGE
      const userId = 'user123';
      // Service should handle errors gracefully and return defaults

      // ACT
      const result = await service.getSettings(userId);

      // ASSERT
      expect(result).toBeDefined();
      expect(result.theme).toBe('auto');
    });
  });

  describe('updateSettings', () => {
    it('should_update_settings_successfully', async () => {
      // ARRANGE
      const userId = 'user123';
      const updates = {
        theme: 'dark' as const,
        notifications: {
          email: false,
          discord: true,
          gameReminders: true,
        },
      };

      // ACT
      const result = await service.updateSettings(userId, updates);

      // ASSERT
      expect(result.theme).toBe('dark');
      expect(result.notifications.email).toBe(false);
      expect(result.notifications.discord).toBe(true); // Preserved from defaults
    });

    it('should_merge_settings_with_existing', async () => {
      // ARRANGE
      const userId = 'user123';
      const updates = {
        privacy: {
          showStats: false,
          showGuilds: true,
          showGames: true,
        },
      };

      // ACT
      const result = await service.updateSettings(userId, updates);

      // ASSERT
      expect(result.privacy.showStats).toBe(false);
      expect(result.privacy.showGuilds).toBe(true); // Preserved from defaults
      expect(result.privacy.showGames).toBe(true); // Preserved from defaults
    });

    it('should_throw_error_when_theme_is_invalid', async () => {
      // ARRANGE
      const userId = 'user123';
      const updates = {
        theme: 'invalid' as any,
      };

      // ACT & ASSERT
      await expect(service.updateSettings(userId, updates)).rejects.toThrow(
        'Invalid theme value',
      );
    });

    it('should_throw_error_when_notification_settings_are_invalid', async () => {
      // ARRANGE
      const userId = 'user123';
      const updates = {
        notifications: {
          email: 'not a boolean' as any,
          discord: true,
          gameReminders: true,
        },
      };

      // ACT & ASSERT
      await expect(service.updateSettings(userId, updates)).rejects.toThrow(
        'Invalid notification settings',
      );
    });

    it('should_throw_error_when_privacy_settings_are_invalid', async () => {
      // ARRANGE
      const userId = 'user123';
      const updates = {
        privacy: {
          showStats: 'not a boolean' as any,
          showGuilds: true,
          showGames: true,
        },
      };

      // ACT & ASSERT
      await expect(service.updateSettings(userId, updates)).rejects.toThrow(
        'Invalid privacy settings',
      );
    });

    it('should_update_preferences', async () => {
      // ARRANGE
      const userId = 'user123';
      const updates = {
        preferences: {
          language: 'es',
          timezone: 'America/New_York',
        },
      };

      // ACT
      const result = await service.updateSettings(userId, updates);

      // ASSERT
      expect(result.preferences.language).toBe('es');
      expect(result.preferences.timezone).toBe('America/New_York');
    });
  });
});
