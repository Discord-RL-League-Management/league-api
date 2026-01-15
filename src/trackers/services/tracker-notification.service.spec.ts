/**
 * TrackerNotificationService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TrackerNotificationService } from './tracker-notification.service';
import { TrackerRepository } from '../repositories/tracker.repository';
import { UserRepository } from '../../users/repositories/user.repository';
import { DiscordMessageService } from './discord-message.service';
import { NotificationBuilderService } from './notification-builder.service';
import { Game, GamePlatform, TrackerScrapingStatus } from '@prisma/client';
import type { Tracker, User } from '@prisma/client';

describe('TrackerNotificationService', () => {
  let service: TrackerNotificationService;
  let mockConfigService: ConfigService;
  let mockTrackerRepository: TrackerRepository;
  let mockUserRepository: UserRepository;
  let mockDiscordMessageService: DiscordMessageService;
  let mockNotificationBuilderService: NotificationBuilderService;

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

  const mockEmbed = {
    title: 'Test Embed',
    description: 'Test Description',
    color: 0x00ff00,
    fields: [],
  };

  beforeEach(async () => {
    mockConfigService = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'frontend.url') return 'https://example.com';
        return undefined;
      }),
    } as unknown as ConfigService;

    mockTrackerRepository = {
      findById: vi.fn(),
    } as unknown as TrackerRepository;

    mockUserRepository = {
      findById: vi.fn(),
    } as unknown as UserRepository;

    mockDiscordMessageService = {
      sendDirectMessage: vi.fn().mockResolvedValue(undefined),
      sendEphemeralFollowUp: vi.fn().mockResolvedValue(undefined),
    } as unknown as DiscordMessageService;

    mockNotificationBuilderService = {
      buildScrapingCompleteEmbed: vi.fn().mockReturnValue(mockEmbed),
      buildScrapingFailedEmbed: vi.fn().mockReturnValue(mockEmbed),
    } as unknown as NotificationBuilderService;

    const module = await Test.createTestingModule({
      providers: [
        TrackerNotificationService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: TrackerRepository, useValue: mockTrackerRepository },
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: DiscordMessageService, useValue: mockDiscordMessageService },
        {
          provide: NotificationBuilderService,
          useValue: mockNotificationBuilderService,
        },
      ],
    }).compile();

    service = module.get<TrackerNotificationService>(
      TrackerNotificationService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sendScrapingCompleteNotification', () => {
    it('should_send_notification_when_user_and_tracker_exist', async () => {
      vi.spyOn(mockUserRepository, 'findById').mockResolvedValue(mockUser);
      vi.spyOn(mockTrackerRepository, 'findById').mockResolvedValue(
        mockTracker,
      );

      await service.sendScrapingCompleteNotification(
        'tracker_123',
        'user_123',
        5,
        0,
      );

      expect(mockUserRepository.findById).toHaveBeenCalledWith('user_123');
      expect(mockTrackerRepository.findById).toHaveBeenCalledWith(
        'tracker_123',
      );
      expect(
        mockNotificationBuilderService.buildScrapingCompleteEmbed,
      ).toHaveBeenCalledWith(
        mockTracker,
        mockUser,
        'https://example.com',
        5,
        0,
      );
      expect(mockDiscordMessageService.sendDirectMessage).toHaveBeenCalledWith(
        'user_123',
        { embeds: [mockEmbed] },
      );
    });

    it('should_not_send_notification_when_user_not_found', async () => {
      vi.spyOn(mockUserRepository, 'findById').mockResolvedValue(null);
      vi.spyOn(mockTrackerRepository, 'findById').mockResolvedValue(
        mockTracker,
      );

      await service.sendScrapingCompleteNotification(
        'tracker_123',
        'user_123',
        5,
        0,
      );

      expect(mockUserRepository.findById).toHaveBeenCalledWith('user_123');
      expect(
        mockDiscordMessageService.sendDirectMessage,
      ).not.toHaveBeenCalled();
    });

    it('should_not_send_notification_when_tracker_not_found', async () => {
      vi.spyOn(mockUserRepository, 'findById').mockResolvedValue(mockUser);
      vi.spyOn(mockTrackerRepository, 'findById').mockResolvedValue(null);

      await service.sendScrapingCompleteNotification(
        'tracker_123',
        'user_123',
        5,
        0,
      );

      expect(mockTrackerRepository.findById).toHaveBeenCalledWith(
        'tracker_123',
      );
      expect(
        mockDiscordMessageService.sendDirectMessage,
      ).not.toHaveBeenCalled();
    });

    it('should_use_default_values_when_seasons_not_provided', async () => {
      vi.spyOn(mockUserRepository, 'findById').mockResolvedValue(mockUser);
      vi.spyOn(mockTrackerRepository, 'findById').mockResolvedValue(
        mockTracker,
      );

      await service.sendScrapingCompleteNotification('tracker_123', 'user_123');

      expect(
        mockNotificationBuilderService.buildScrapingCompleteEmbed,
      ).toHaveBeenCalledWith(
        mockTracker,
        mockUser,
        'https://example.com',
        0,
        0,
      );
    });

    it('should_handle_discord_message_service_errors_gracefully', async () => {
      vi.spyOn(mockUserRepository, 'findById').mockResolvedValue(mockUser);
      vi.spyOn(mockTrackerRepository, 'findById').mockResolvedValue(
        mockTracker,
      );
      vi.spyOn(
        mockDiscordMessageService,
        'sendDirectMessage',
      ).mockRejectedValue(new Error('Discord API error'));

      await expect(
        service.sendScrapingCompleteNotification('tracker_123', 'user_123'),
      ).resolves.not.toThrow();
    });
  });

  describe('sendScrapingFailedNotification', () => {
    it('should_send_ephemeral_followup_when_interaction_token_exists', async () => {
      const trackerWithToken = {
        ...mockTracker,
        registrationInteractionToken: 'token_123',
      };
      vi.spyOn(mockTrackerRepository, 'findById').mockResolvedValue(
        trackerWithToken,
      );
      vi.spyOn(mockUserRepository, 'findById').mockResolvedValue(mockUser);

      await service.sendScrapingFailedNotification(
        'tracker_123',
        'user_123',
        'Test error',
      );

      expect(
        mockNotificationBuilderService.buildScrapingFailedEmbed,
      ).toHaveBeenCalledWith(
        trackerWithToken,
        mockUser,
        'Test error',
        'https://example.com',
      );
      expect(
        mockDiscordMessageService.sendEphemeralFollowUp,
      ).toHaveBeenCalledWith('token_123', { embeds: [mockEmbed] });
      expect(
        mockDiscordMessageService.sendDirectMessage,
      ).not.toHaveBeenCalled();
    });

    it('should_fallback_to_dm_when_ephemeral_fails', async () => {
      const trackerWithToken = {
        ...mockTracker,
        registrationInteractionToken: 'token_123',
      };
      vi.spyOn(mockTrackerRepository, 'findById').mockResolvedValue(
        trackerWithToken,
      );
      vi.spyOn(mockUserRepository, 'findById').mockResolvedValue(mockUser);
      vi.spyOn(
        mockDiscordMessageService,
        'sendEphemeralFollowUp',
      ).mockRejectedValue(new Error('Token expired'));

      await service.sendScrapingFailedNotification(
        'tracker_123',
        'user_123',
        'Test error',
      );

      expect(
        mockDiscordMessageService.sendEphemeralFollowUp,
      ).toHaveBeenCalled();
      expect(mockDiscordMessageService.sendDirectMessage).toHaveBeenCalledWith(
        'user_123',
        { embeds: [mockEmbed] },
      );
    });

    it('should_send_dm_when_no_interaction_token', async () => {
      vi.spyOn(mockTrackerRepository, 'findById').mockResolvedValue(
        mockTracker,
      );
      vi.spyOn(mockUserRepository, 'findById').mockResolvedValue(mockUser);

      await service.sendScrapingFailedNotification(
        'tracker_123',
        'user_123',
        'Test error',
      );

      expect(mockDiscordMessageService.sendDirectMessage).toHaveBeenCalledWith(
        'user_123',
        { embeds: [mockEmbed] },
      );
      expect(
        mockDiscordMessageService.sendEphemeralFollowUp,
      ).not.toHaveBeenCalled();
    });

    it('should_not_send_notification_when_tracker_not_found', async () => {
      vi.spyOn(mockTrackerRepository, 'findById').mockResolvedValue(null);

      await service.sendScrapingFailedNotification(
        'tracker_123',
        'user_123',
        'Test error',
      );

      expect(
        mockDiscordMessageService.sendDirectMessage,
      ).not.toHaveBeenCalled();
      expect(
        mockDiscordMessageService.sendEphemeralFollowUp,
      ).not.toHaveBeenCalled();
    });

    it('should_not_send_notification_when_user_not_found', async () => {
      vi.spyOn(mockTrackerRepository, 'findById').mockResolvedValue(
        mockTracker,
      );
      vi.spyOn(mockUserRepository, 'findById').mockResolvedValue(null);

      await service.sendScrapingFailedNotification(
        'tracker_123',
        'user_123',
        'Test error',
      );

      expect(
        mockDiscordMessageService.sendDirectMessage,
      ).not.toHaveBeenCalled();
      expect(
        mockDiscordMessageService.sendEphemeralFollowUp,
      ).not.toHaveBeenCalled();
    });

    it('should_handle_discord_message_service_errors_gracefully', async () => {
      vi.spyOn(mockTrackerRepository, 'findById').mockResolvedValue(
        mockTracker,
      );
      vi.spyOn(mockUserRepository, 'findById').mockResolvedValue(mockUser);
      vi.spyOn(
        mockDiscordMessageService,
        'sendDirectMessage',
      ).mockRejectedValue(new Error('Discord API error'));

      await expect(
        service.sendScrapingFailedNotification(
          'tracker_123',
          'user_123',
          'Test error',
        ),
      ).resolves.not.toThrow();
    });
  });

  describe('sendScrapingProgressNotification', () => {
    it('should_log_progress_without_throwing', () => {
      expect(() => {
        service.sendScrapingProgressNotification('tracker_123', 'user_123', {
          current: 5,
          total: 10,
        });
      }).not.toThrow();
    });
  });
});
