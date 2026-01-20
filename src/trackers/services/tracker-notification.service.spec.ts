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
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { TrackerNotificationService } from './tracker-notification.service';
import { TrackerRepository } from '../repositories/tracker.repository';
import { UserRepository } from '../../users/repositories/user.repository';
import { Game, GamePlatform, TrackerScrapingStatus } from '@prisma/client';
import type { Tracker, User } from '@prisma/client';

describe('TrackerNotificationService', () => {
  let service: TrackerNotificationService;
  let mockConfigService: ConfigService;
  let mockTrackerRepository: TrackerRepository;
  let mockUserRepository: UserRepository;
  let mockHttpService: HttpService;

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

  beforeEach(async () => {
    mockConfigService = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'frontend.url') return 'https://example.com';
        if (key === 'bot.webhookUrl') return 'http://localhost:3001';
        if (key === 'auth.botApiKey') return 'test-api-key';
        return undefined;
      }),
    } as unknown as ConfigService;

    mockTrackerRepository = {
      findById: vi.fn(),
    } as unknown as TrackerRepository;

    mockUserRepository = {
      findById: vi.fn(),
    } as unknown as UserRepository;

    mockHttpService = {
      post: vi.fn().mockReturnValue(of({ data: {} })),
    } as unknown as HttpService;

    const module = await Test.createTestingModule({
      providers: [
        TrackerNotificationService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: TrackerRepository, useValue: mockTrackerRepository },
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: HttpService, useValue: mockHttpService },
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
    it('should_send_webhook_when_user_and_tracker_exist', async () => {
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
      expect(mockHttpService.post).toHaveBeenCalledWith(
        'http://localhost:3001/webhooks/tracker-scraping-complete',
        {
          type: 'tracker_scraping_complete',
          userId: 'user_123',
          trackerId: 'tracker_123',
          tracker: {
            url: mockTracker.url,
            platform: mockTracker.platform,
            game: mockTracker.game,
            username: mockTracker.username,
          },
          user: {
            id: mockUser.id,
            username: mockUser.username,
            globalName: mockUser.globalName,
          },
          seasonsScraped: 5,
          seasonsFailed: 0,
          frontendUrl: 'https://example.com',
        },
        {
          headers: {
            Authorization: 'Bearer test-api-key',
            'Content-Type': 'application/json',
          },
        },
      );
    });

    it('should_not_send_webhook_when_user_not_found', async () => {
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
      expect(mockHttpService.post).not.toHaveBeenCalled();
    });

    it('should_not_send_webhook_when_tracker_not_found', async () => {
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
      expect(mockHttpService.post).not.toHaveBeenCalled();
    });

    it('should_use_default_values_when_seasons_not_provided', async () => {
      vi.spyOn(mockUserRepository, 'findById').mockResolvedValue(mockUser);
      vi.spyOn(mockTrackerRepository, 'findById').mockResolvedValue(
        mockTracker,
      );

      await service.sendScrapingCompleteNotification('tracker_123', 'user_123');

      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          seasonsScraped: 0,
          seasonsFailed: 0,
        }),
        expect.any(Object),
      );
    });

    it('should_not_send_webhook_when_bot_webhook_url_not_configured', async () => {
      const configWithoutWebhook = {
        get: vi.fn().mockImplementation((key: string) => {
          if (key === 'frontend.url') return 'https://example.com';
          if (key === 'bot.webhookUrl') return '';
          if (key === 'auth.botApiKey') return 'test-api-key';
          return undefined;
        }),
      } as unknown as ConfigService;

      const module = await Test.createTestingModule({
        providers: [
          TrackerNotificationService,
          { provide: ConfigService, useValue: configWithoutWebhook },
          { provide: TrackerRepository, useValue: mockTrackerRepository },
          { provide: UserRepository, useValue: mockUserRepository },
          { provide: HttpService, useValue: mockHttpService },
        ],
      }).compile();

      const serviceWithoutWebhook = module.get<TrackerNotificationService>(
        TrackerNotificationService,
      );

      vi.spyOn(mockUserRepository, 'findById').mockResolvedValue(mockUser);
      vi.spyOn(mockTrackerRepository, 'findById').mockResolvedValue(
        mockTracker,
      );

      await serviceWithoutWebhook.sendScrapingCompleteNotification(
        'tracker_123',
        'user_123',
      );

      expect(mockHttpService.post).not.toHaveBeenCalled();
    });

    it('should_handle_webhook_errors_gracefully', async () => {
      vi.spyOn(mockUserRepository, 'findById').mockResolvedValue(mockUser);
      vi.spyOn(mockTrackerRepository, 'findById').mockResolvedValue(
        mockTracker,
      );
      vi.spyOn(mockHttpService, 'post').mockReturnValue(
        throwError(() => new Error('Webhook error')) as any,
      );

      await expect(
        service.sendScrapingCompleteNotification('tracker_123', 'user_123'),
      ).resolves.not.toThrow();
    });
  });

  describe('sendScrapingFailedNotification', () => {
    it('should_send_webhook_when_user_and_tracker_exist', async () => {
      vi.spyOn(mockTrackerRepository, 'findById').mockResolvedValue(
        mockTracker,
      );
      vi.spyOn(mockUserRepository, 'findById').mockResolvedValue(mockUser);

      await service.sendScrapingFailedNotification(
        'tracker_123',
        'user_123',
        'Test error',
      );

      expect(mockTrackerRepository.findById).toHaveBeenCalledWith(
        'tracker_123',
      );
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user_123');
      expect(mockHttpService.post).toHaveBeenCalledWith(
        'http://localhost:3001/webhooks/tracker-scraping-failed',
        {
          type: 'tracker_scraping_failed',
          userId: 'user_123',
          trackerId: 'tracker_123',
          tracker: {
            url: mockTracker.url,
            platform: mockTracker.platform,
            game: mockTracker.game,
            username: mockTracker.username,
            registrationInteractionToken: null,
            registrationChannelId: null,
          },
          user: {
            id: mockUser.id,
            username: mockUser.username,
            globalName: mockUser.globalName,
          },
          error: 'Test error',
          frontendUrl: 'https://example.com',
        },
        {
          headers: {
            Authorization: 'Bearer test-api-key',
            'Content-Type': 'application/json',
          },
        },
      );
    });

    it('should_include_registration_context_when_available', async () => {
      const trackerWithToken = {
        ...mockTracker,
        registrationInteractionToken: 'token_123',
        registrationChannelId: 'channel_123',
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

      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          tracker: expect.objectContaining({
            registrationInteractionToken: 'token_123',
            registrationChannelId: 'channel_123',
          }),
        }),
        expect.any(Object),
      );
    });

    it('should_not_send_webhook_when_tracker_not_found', async () => {
      vi.spyOn(mockTrackerRepository, 'findById').mockResolvedValue(null);

      await service.sendScrapingFailedNotification(
        'tracker_123',
        'user_123',
        'Test error',
      );

      expect(mockHttpService.post).not.toHaveBeenCalled();
    });

    it('should_not_send_webhook_when_user_not_found', async () => {
      vi.spyOn(mockTrackerRepository, 'findById').mockResolvedValue(
        mockTracker,
      );
      vi.spyOn(mockUserRepository, 'findById').mockResolvedValue(null);

      await service.sendScrapingFailedNotification(
        'tracker_123',
        'user_123',
        'Test error',
      );

      expect(mockHttpService.post).not.toHaveBeenCalled();
    });

    it('should_not_send_webhook_when_bot_webhook_url_not_configured', async () => {
      const configWithoutWebhook = {
        get: vi.fn().mockImplementation((key: string) => {
          if (key === 'frontend.url') return 'https://example.com';
          if (key === 'bot.webhookUrl') return '';
          if (key === 'auth.botApiKey') return 'test-api-key';
          return undefined;
        }),
      } as unknown as ConfigService;

      const module = await Test.createTestingModule({
        providers: [
          TrackerNotificationService,
          { provide: ConfigService, useValue: configWithoutWebhook },
          { provide: TrackerRepository, useValue: mockTrackerRepository },
          { provide: UserRepository, useValue: mockUserRepository },
          { provide: HttpService, useValue: mockHttpService },
        ],
      }).compile();

      const serviceWithoutWebhook = module.get<TrackerNotificationService>(
        TrackerNotificationService,
      );

      vi.spyOn(mockTrackerRepository, 'findById').mockResolvedValue(
        mockTracker,
      );
      vi.spyOn(mockUserRepository, 'findById').mockResolvedValue(mockUser);

      await serviceWithoutWebhook.sendScrapingFailedNotification(
        'tracker_123',
        'user_123',
        'Test error',
      );

      expect(mockHttpService.post).not.toHaveBeenCalled();
    });

    it('should_handle_webhook_errors_gracefully', async () => {
      vi.spyOn(mockTrackerRepository, 'findById').mockResolvedValue(
        mockTracker,
      );
      vi.spyOn(mockUserRepository, 'findById').mockResolvedValue(mockUser);
      vi.spyOn(mockHttpService, 'post').mockReturnValue(
        throwError(() => new Error('Webhook error')) as any,
      );

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

  describe('sendRegistrationSummary', () => {
    const interactionToken = 'interaction_token_123';
    const mockTrackers: Tracker[] = [
      {
        ...mockTracker,
        id: 'tracker_1',
        url: 'https://tracker.gg/profile/steam/user1',
        platform: GamePlatform.STEAM,
        scrapingStatus: TrackerScrapingStatus.COMPLETED,
        scrapingError: null,
        registrationInteractionToken: interactionToken,
      },
      {
        ...mockTracker,
        id: 'tracker_2',
        url: 'https://tracker.gg/profile/epic/user1',
        platform: GamePlatform.EPIC,
        scrapingStatus: TrackerScrapingStatus.COMPLETED,
        scrapingError: null,
        registrationInteractionToken: interactionToken,
      },
      {
        ...mockTracker,
        id: 'tracker_3',
        url: 'https://tracker.gg/profile/xbox/user1',
        platform: GamePlatform.XBOX,
        scrapingStatus: TrackerScrapingStatus.FAILED,
        scrapingError: 'Test error',
        registrationInteractionToken: interactionToken,
      },
    ];

    it('should_send_webhook_with_structured_data', async () => {
      await service.sendRegistrationSummary(interactionToken, mockTrackers);

      expect(mockHttpService.post).toHaveBeenCalledWith(
        'http://localhost:3001/webhooks/registration-summary',
        {
          interactionToken,
          applicationId: '',
          summary: {
            total: 3,
            successful: 2,
            failed: 1,
            trackers: [
              {
                url: 'https://tracker.gg/profile/steam/user1',
                platform: GamePlatform.STEAM,
                status: 'COMPLETED',
              },
              {
                url: 'https://tracker.gg/profile/epic/user1',
                platform: GamePlatform.EPIC,
                status: 'COMPLETED',
              },
              {
                url: 'https://tracker.gg/profile/xbox/user1',
                platform: GamePlatform.XBOX,
                status: 'FAILED',
                error: 'Test error',
              },
            ],
          },
        },
        {
          headers: {
            Authorization: 'Bearer test-api-key',
            'Content-Type': 'application/json',
          },
        },
      );
    });

    it('should_use_application_id_from_map_when_available', async () => {
      const applicationId = 'app_123';
      service.registerApplicationId(interactionToken, applicationId);

      await service.sendRegistrationSummary(interactionToken, mockTrackers);

      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          applicationId,
        }),
        expect.any(Object),
      );
    });

    it('should_handle_webhook_errors_gracefully', async () => {
      vi.spyOn(mockHttpService, 'post').mockReturnValue(
        throwError(() => new Error('Webhook error')) as any,
      );

      await expect(
        service.sendRegistrationSummary(interactionToken, mockTrackers),
      ).resolves.not.toThrow();
    });

    it('should_not_send_when_interaction_token_missing', async () => {
      await service.sendRegistrationSummary('', mockTrackers);

      expect(mockHttpService.post).not.toHaveBeenCalled();
    });

    it('should_not_send_when_no_trackers', async () => {
      await service.sendRegistrationSummary(interactionToken, []);

      expect(mockHttpService.post).not.toHaveBeenCalled();
    });

    it('should_not_send_when_bot_webhook_url_not_configured', async () => {
      const configWithoutWebhook = {
        get: vi.fn().mockImplementation((key: string) => {
          if (key === 'frontend.url') return 'https://example.com';
          if (key === 'bot.webhookUrl') return '';
          if (key === 'auth.botApiKey') return 'test-api-key';
          return undefined;
        }),
      } as unknown as ConfigService;

      const module = await Test.createTestingModule({
        providers: [
          TrackerNotificationService,
          { provide: ConfigService, useValue: configWithoutWebhook },
          { provide: TrackerRepository, useValue: mockTrackerRepository },
          { provide: UserRepository, useValue: mockUserRepository },
          { provide: HttpService, useValue: mockHttpService },
        ],
      }).compile();

      const serviceWithoutWebhook = module.get<TrackerNotificationService>(
        TrackerNotificationService,
      );

      await serviceWithoutWebhook.sendRegistrationSummary(
        interactionToken,
        mockTrackers,
      );

      expect(mockHttpService.post).not.toHaveBeenCalled();
    });
  });
});
