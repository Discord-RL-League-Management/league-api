/**
 * NotificationBuilderService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NotificationBuilderService } from './notification-builder.service';
import { Game, GamePlatform, TrackerScrapingStatus } from '@prisma/client';
import type { Tracker, TrackerSeason, User } from '@prisma/client';

describe('NotificationBuilderService', () => {
  let service: NotificationBuilderService;

  const mockUser: User = {
    id: 'user_123',
    username: 'testuser',
    globalName: 'Test User',
    avatar: 'avatar_hash',
    email: 'test@example.com',
    discordId: '123456789012345678',
    isBanned: false,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTracker: Tracker = {
    id: 'tracker_123',
    url: 'https://rocketleague.tracker.network/rocket-league/profile/steam/testuser/overview',
    game: Game.ROCKET_LEAGUE,
    platform: GamePlatform.STEAM,
    username: 'testuser',
    userId: 'user_123',
    guildId: null,
    displayName: null,
    isActive: true,
    isDeleted: false,
    lastScrapedAt: new Date('2024-01-01T00:00:00Z'),
    scrapingStatus: TrackerScrapingStatus.COMPLETED,
    scrapingError: null,
    scrapingAttempts: 0,
    registrationChannelId: null,
    registrationInteractionToken: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSeason: TrackerSeason = {
    id: 'season_123',
    trackerId: 'tracker_123',
    seasonNumber: 15,
    seasonName: 'Season 15',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-03-31'),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    service = new NotificationBuilderService();
  });

  describe('buildScrapingCompleteEmbed', () => {
    it('should_build_complete_embed_with_basic_fields_when_no_seasons_provided', () => {
      const embed = service.buildScrapingCompleteEmbed(mockTracker, mockUser);

      expect(embed.title).toBe('Tracker Data Scraped Successfully');
      expect(embed.description).toBe(
        'Your tracker data has been successfully collected and updated.',
      );
      expect(embed.color).toBe(0x00ff00);
      expect(embed.timestamp).toBeDefined();
      expect(embed.footer?.text).toBe('Tracker Management System');
      expect(embed.fields).toBeDefined();
      expect(embed.fields?.length).toBeGreaterThan(0);
    });

    it('should_include_tracker_url_in_fields_when_building_embed', () => {
      const embed = service.buildScrapingCompleteEmbed(mockTracker, mockUser);

      const trackerField = embed.fields?.find((f) => f.name === 'Tracker');
      expect(trackerField).toBeDefined();
      expect(trackerField?.value).toBe(mockTracker.url);
      expect(trackerField?.inline).toBe(false);
    });

    it('should_include_platform_in_fields_when_building_embed', () => {
      const embed = service.buildScrapingCompleteEmbed(mockTracker, mockUser);

      const platformField = embed.fields?.find((f) => f.name === 'Platform');
      expect(platformField).toBeDefined();
      expect(platformField?.value).toBe(mockTracker.platform);
      expect(platformField?.inline).toBe(true);
    });

    it('should_include_username_in_fields_when_building_embed', () => {
      const embed = service.buildScrapingCompleteEmbed(mockTracker, mockUser);

      const usernameField = embed.fields?.find((f) => f.name === 'Username');
      expect(usernameField).toBeDefined();
      expect(usernameField?.value).toBe(mockTracker.username);
      expect(usernameField?.inline).toBe(true);
    });

    it('should_include_seasons_scraped_when_provided', () => {
      const embed = service.buildScrapingCompleteEmbed(
        mockTracker,
        mockUser,
        undefined,
        5,
      );

      const seasonsField = embed.fields?.find(
        (f) => f.name === 'Seasons Scraped',
      );
      expect(seasonsField).toBeDefined();
      expect(seasonsField?.value).toBe('5');
      expect(seasonsField?.inline).toBe(true);
    });

    it('should_not_include_seasons_failed_when_zero', () => {
      const embed = service.buildScrapingCompleteEmbed(
        mockTracker,
        mockUser,
        undefined,
        5,
        0,
      );

      const failedField = embed.fields?.find(
        (f) => f.name === 'Seasons Failed',
      );
      expect(failedField).toBeUndefined();
    });

    it('should_include_seasons_failed_when_greater_than_zero', () => {
      const embed = service.buildScrapingCompleteEmbed(
        mockTracker,
        mockUser,
        undefined,
        5,
        2,
      );

      const failedField = embed.fields?.find(
        (f) => f.name === 'Seasons Failed',
      );
      expect(failedField).toBeDefined();
      expect(failedField?.value).toBe('2');
      expect(failedField?.inline).toBe(true);
    });

    it('should_include_latest_season_when_seasons_provided', () => {
      const trackerWithSeasons = {
        ...mockTracker,
        seasons: [mockSeason],
      };

      const embed = service.buildScrapingCompleteEmbed(
        trackerWithSeasons,
        mockUser,
      );

      const seasonField = embed.fields?.find((f) => f.name === 'Latest Season');
      expect(seasonField).toBeDefined();
      expect(seasonField?.value).toBe('Season 15 (Season 15)');
      expect(seasonField?.inline).toBe(true);
    });

    it('should_include_latest_season_without_name_when_season_name_missing', () => {
      const seasonWithoutName = {
        ...mockSeason,
        seasonName: null,
      };
      const trackerWithSeasons = {
        ...mockTracker,
        seasons: [seasonWithoutName],
      };

      const embed = service.buildScrapingCompleteEmbed(
        trackerWithSeasons,
        mockUser,
      );

      const seasonField = embed.fields?.find((f) => f.name === 'Latest Season');
      expect(seasonField).toBeDefined();
      expect(seasonField?.value).toBe('Season 15');
    });

    it('should_include_last_updated_when_tracker_has_last_scraped_at', () => {
      const embed = service.buildScrapingCompleteEmbed(mockTracker, mockUser);

      const lastUpdatedField = embed.fields?.find(
        (f) => f.name === 'Last Updated',
      );
      expect(lastUpdatedField).toBeDefined();
      expect(lastUpdatedField?.inline).toBe(true);
    });

    it('should_include_frontend_url_when_provided', () => {
      const frontendUrl = 'https://example.com';
      const embed = service.buildScrapingCompleteEmbed(
        mockTracker,
        mockUser,
        frontendUrl,
      );

      const viewField = embed.fields?.find((f) => f.name === 'View Tracker');
      expect(viewField).toBeDefined();
      expect(viewField?.value).toContain(frontendUrl);
      expect(viewField?.value).toContain(mockTracker.id);
      expect(viewField?.inline).toBe(false);
    });

    it('should_not_include_frontend_url_when_not_provided', () => {
      const embed = service.buildScrapingCompleteEmbed(mockTracker, mockUser);

      const viewField = embed.fields?.find((f) => f.name === 'View Tracker');
      expect(viewField).toBeUndefined();
    });
  });

  describe('buildScrapingFailedEmbed', () => {
    it('should_build_failed_embed_with_basic_fields', () => {
      const error = 'Test error message';
      const embed = service.buildScrapingFailedEmbed(
        mockTracker,
        mockUser,
        error,
      );

      expect(embed.title).toBe('Unable to Update Tracker Data');
      expect(embed.description).toContain('unable to collect updated data');
      expect(embed.color).toBe(0xff0000);
      expect(embed.timestamp).toBeDefined();
      expect(embed.footer?.text).toBe('Tracker Management System');
      expect(embed.fields).toBeDefined();
    });

    it('should_include_tracker_url_in_failed_embed', () => {
      const error = 'Test error';
      const embed = service.buildScrapingFailedEmbed(
        mockTracker,
        mockUser,
        error,
      );

      const trackerField = embed.fields?.find((f) => f.name === 'Tracker');
      expect(trackerField).toBeDefined();
      expect(trackerField?.value).toBe(mockTracker.url);
      expect(trackerField?.inline).toBe(false);
    });

    it('should_include_what_to_do_field_in_failed_embed', () => {
      const error = 'Test error';
      const embed = service.buildScrapingFailedEmbed(
        mockTracker,
        mockUser,
        error,
      );

      const whatToDoField = embed.fields?.find((f) => f.name === 'What to do');
      expect(whatToDoField).toBeDefined();
      expect(whatToDoField?.value).toContain('try again later');
      expect(whatToDoField?.inline).toBe(false);
    });

    it('should_include_frontend_url_when_provided_in_failed_embed', () => {
      const error = 'Test error';
      const frontendUrl = 'https://example.com';
      const embed = service.buildScrapingFailedEmbed(
        mockTracker,
        mockUser,
        error,
        frontendUrl,
      );

      const tryAgainField = embed.fields?.find((f) => f.name === 'Try Again');
      expect(tryAgainField).toBeDefined();
      expect(tryAgainField?.value).toContain(frontendUrl);
      expect(tryAgainField?.value).toContain(mockTracker.id);
      expect(tryAgainField?.inline).toBe(false);
    });

    it('should_not_include_frontend_url_when_not_provided_in_failed_embed', () => {
      const error = 'Test error';
      const embed = service.buildScrapingFailedEmbed(
        mockTracker,
        mockUser,
        error,
      );

      const tryAgainField = embed.fields?.find((f) => f.name === 'Try Again');
      expect(tryAgainField).toBeUndefined();
    });
  });
});
