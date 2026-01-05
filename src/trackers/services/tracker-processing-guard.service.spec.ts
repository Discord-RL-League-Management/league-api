import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { TrackerProcessingGuardService } from './tracker-processing-guard.service';
import { TrackerRepository } from '../repositories/tracker.repository';
import { GuildMemberRepository } from '../../guild-members/repositories/guild-member.repository';
import { GuildSettingsService } from '../../guilds/guild-settings.service';
import { GuildSettings } from '../../guilds/interfaces/settings.interface';

describe('TrackerProcessingGuardService', () => {
  let service: TrackerProcessingGuardService;
  let trackerRepository: TrackerRepository;
  let guildMemberRepository: GuildMemberRepository;
  let guildSettingsService: GuildSettingsService;

  const mockTrackerRepository = {
    findUserIdById: vi.fn(),
    findByIdsWithUserId: vi.fn(),
  };

  const mockGuildMemberRepository = {
    findByUserId: vi.fn(),
  };

  const mockGuildSettingsService = {
    getSettings: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackerProcessingGuardService,
        {
          provide: TrackerRepository,
          useValue: mockTrackerRepository,
        },
        {
          provide: GuildMemberRepository,
          useValue: mockGuildMemberRepository,
        },
        {
          provide: GuildSettingsService,
          useValue: mockGuildSettingsService,
        },
      ],
    }).compile();

    service = module.get<TrackerProcessingGuardService>(
      TrackerProcessingGuardService,
    );
    trackerRepository = module.get<TrackerRepository>(TrackerRepository);
    guildMemberRepository = module.get<GuildMemberRepository>(
      GuildMemberRepository,
    );
    guildSettingsService =
      module.get<GuildSettingsService>(GuildSettingsService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('canProcessTracker', () => {
    const trackerId = 'tracker1';
    const userId = 'user1';

    it('should return true when user has no guilds (backward compatibility)', async () => {
      vi.mocked(mockTrackerRepository.findUserIdById).mockResolvedValue(userId);
      vi.mocked(mockGuildMemberRepository.findByUserId).mockResolvedValue([]);

      const result = await service.canProcessTracker(trackerId);

      expect(result).toBe(true);
      expect(mockTrackerRepository.findUserIdById).toHaveBeenCalledWith(
        trackerId,
      );
      expect(mockGuildMemberRepository.findByUserId).toHaveBeenCalledWith(
        userId,
      );
    });

    it('should return true when user has one guild with processing enabled', async () => {
      const guildId = 'guild1';
      const settings: GuildSettings = {
        bot_command_channels: [],
        trackerProcessing: {
          enabled: true,
        },
      };

      vi.mocked(mockTrackerRepository.findUserIdById).mockResolvedValue(userId);
      vi.mocked(mockGuildMemberRepository.findByUserId).mockResolvedValue([
        { guildId, isDeleted: false, isBanned: false },
      ] as any);
      vi.mocked(mockGuildSettingsService.getSettings).mockResolvedValue(
        settings,
      );

      const result = await service.canProcessTracker(trackerId);

      expect(result).toBe(true);
      expect(mockGuildSettingsService.getSettings).toHaveBeenCalledWith(
        guildId,
      );
    });

    it('should return false when user has one guild with processing disabled', async () => {
      const guildId = 'guild1';
      const settings: GuildSettings = {
        bot_command_channels: [],
        trackerProcessing: {
          enabled: false,
        },
      };

      vi.mocked(mockTrackerRepository.findUserIdById).mockResolvedValue(userId);
      vi.mocked(mockGuildMemberRepository.findByUserId).mockResolvedValue([
        { guildId, isDeleted: false, isBanned: false },
      ] as any);
      vi.mocked(mockGuildSettingsService.getSettings).mockResolvedValue(
        settings,
      );

      const result = await service.canProcessTracker(trackerId);

      expect(result).toBe(false);
    });

    it('should return true when user has multiple guilds and at least one has processing enabled', async () => {
      const guildId1 = 'guild1';
      const guildId2 = 'guild2';
      const settings1: GuildSettings = {
        bot_command_channels: [],
        trackerProcessing: {
          enabled: false,
        },
      };
      const settings2: GuildSettings = {
        bot_command_channels: [],
        trackerProcessing: {
          enabled: true,
        },
      };

      vi.mocked(mockTrackerRepository.findUserIdById).mockResolvedValue(userId);
      vi.mocked(mockGuildMemberRepository.findByUserId).mockResolvedValue([
        { guildId: guildId1, isDeleted: false, isBanned: false },
        { guildId: guildId2, isDeleted: false, isBanned: false },
      ] as any);
      vi.mocked(mockGuildSettingsService.getSettings)
        .mockResolvedValueOnce(settings1)
        .mockResolvedValueOnce(settings2);

      const result = await service.canProcessTracker(trackerId);

      expect(result).toBe(true);
      expect(mockGuildSettingsService.getSettings).toHaveBeenCalledTimes(2);
    });

    it('should return false when user has multiple guilds and all have processing disabled', async () => {
      const guildId1 = 'guild1';
      const guildId2 = 'guild2';
      const settings: GuildSettings = {
        bot_command_channels: [],
        trackerProcessing: {
          enabled: false,
        },
      };

      vi.mocked(mockTrackerRepository.findUserIdById).mockResolvedValue(userId);
      vi.mocked(mockGuildMemberRepository.findByUserId).mockResolvedValue([
        { guildId: guildId1, isDeleted: false, isBanned: false },
        { guildId: guildId2, isDeleted: false, isBanned: false },
      ] as any);
      vi.mocked(mockGuildSettingsService.getSettings)
        .mockResolvedValueOnce(settings)
        .mockResolvedValueOnce(settings);

      const result = await service.canProcessTracker(trackerId);

      expect(result).toBe(false);
    });

    it('should return true when trackerProcessing is not set (defaults to enabled)', async () => {
      const guildId = 'guild1';
      const settings: GuildSettings = {
        bot_command_channels: [],
        // trackerProcessing not set
      };

      vi.mocked(mockTrackerRepository.findUserIdById).mockResolvedValue(userId);
      vi.mocked(mockGuildMemberRepository.findByUserId).mockResolvedValue([
        { guildId, isDeleted: false, isBanned: false },
      ] as any);
      vi.mocked(mockGuildSettingsService.getSettings).mockResolvedValue(
        settings,
      );

      const result = await service.canProcessTracker(trackerId);

      expect(result).toBe(true);
    });

    it('should return false when tracker not found', async () => {
      vi.mocked(mockTrackerRepository.findUserIdById).mockResolvedValue(null);

      const result = await service.canProcessTracker(trackerId);

      expect(result).toBe(false);
      expect(mockTrackerRepository.findUserIdById).toHaveBeenCalledWith(
        trackerId,
      );
    });

    it('should return true on error (backward compatibility)', async () => {
      vi.mocked(mockTrackerRepository.findUserIdById).mockRejectedValue(
        new Error('Database error'),
      );

      const result = await service.canProcessTracker(trackerId);

      expect(result).toBe(true);
    });
  });

  describe('canProcessTrackerForUser', () => {
    const userId = 'user1';

    it('should return true when user has no guilds', async () => {
      vi.mocked(mockGuildMemberRepository.findByUserId).mockResolvedValue([]);

      const result = await service.canProcessTrackerForUser(userId);

      expect(result).toBe(true);
      expect(mockGuildMemberRepository.findByUserId).toHaveBeenCalledWith(
        userId,
      );
    });

    it('should return true when user has guild with processing enabled', async () => {
      const guildId = 'guild1';
      const settings: GuildSettings = {
        bot_command_channels: [],
        trackerProcessing: {
          enabled: true,
        },
      };

      vi.mocked(mockGuildMemberRepository.findByUserId).mockResolvedValue([
        { guildId, isDeleted: false, isBanned: false },
      ] as any);
      vi.mocked(mockGuildSettingsService.getSettings).mockResolvedValue(
        settings,
      );

      const result = await service.canProcessTrackerForUser(userId);

      expect(result).toBe(true);
    });

    it('should return false when user has guild with processing disabled', async () => {
      const guildId = 'guild1';
      const settings: GuildSettings = {
        bot_command_channels: [],
        trackerProcessing: {
          enabled: false,
        },
      };

      vi.mocked(mockGuildMemberRepository.findByUserId).mockResolvedValue([
        { guildId, isDeleted: false, isBanned: false },
      ] as any);
      vi.mocked(mockGuildSettingsService.getSettings).mockResolvedValue(
        settings,
      );

      const result = await service.canProcessTrackerForUser(userId);

      expect(result).toBe(false);
    });
  });

  describe('filterProcessableTrackers', () => {
    it('should return empty array when no tracker IDs provided', async () => {
      const result = await service.filterProcessableTrackers([]);

      expect(result).toEqual([]);
      expect(mockTrackerRepository.findByIdsWithUserId).not.toHaveBeenCalled();
    });

    it('should filter trackers based on user guild settings', async () => {
      const trackerId1 = 'tracker1';
      const trackerId2 = 'tracker2';
      const trackerId3 = 'tracker3';
      const userId1 = 'user1';
      const userId2 = 'user2';
      const guildId1 = 'guild1';
      const guildId2 = 'guild2';

      const settings1: GuildSettings = {
        bot_command_channels: [],
        trackerProcessing: {
          enabled: true,
        },
      };
      const settings2: GuildSettings = {
        bot_command_channels: [],
        trackerProcessing: {
          enabled: false,
        },
      };

      vi.mocked(mockTrackerRepository.findByIdsWithUserId).mockResolvedValue([
        { id: trackerId1, userId: userId1 },
        { id: trackerId2, userId: userId2 },
        { id: trackerId3, userId: userId1 },
      ]);

      // User1 has processing enabled
      vi.mocked(mockGuildMemberRepository.findByUserId)
        .mockResolvedValueOnce([
          { guildId: guildId1, isDeleted: false, isBanned: false },
        ] as any)
        // User2 has processing disabled
        .mockResolvedValueOnce([
          { guildId: guildId2, isDeleted: false, isBanned: false },
        ] as any);

      vi.mocked(mockGuildSettingsService.getSettings)
        .mockResolvedValueOnce(settings1) // User1's guild
        .mockResolvedValueOnce(settings2); // User2's guild

      const result = await service.filterProcessableTrackers([
        trackerId1,
        trackerId2,
        trackerId3,
      ]);

      // trackerId1 and trackerId3 should be included (user1), trackerId2 should be excluded (user2)
      expect(result).toEqual([trackerId1, trackerId3]);
      expect(result).not.toContain(trackerId2);
    });

    it('should return all trackers on error (backward compatibility)', async () => {
      const trackerIds = ['tracker1', 'tracker2'];

      vi.mocked(mockTrackerRepository.findByIdsWithUserId).mockRejectedValue(
        new Error('Database error'),
      );

      const result = await service.filterProcessableTrackers(trackerIds);

      expect(result).toEqual(trackerIds);
    });

    it('should handle trackers with same user efficiently', async () => {
      const trackerId1 = 'tracker1';
      const trackerId2 = 'tracker2';
      const userId = 'user1';
      const guildId = 'guild1';

      const settings: GuildSettings = {
        bot_command_channels: [],
        trackerProcessing: {
          enabled: true,
        },
      };

      vi.mocked(mockTrackerRepository.findByIdsWithUserId).mockResolvedValue([
        { id: trackerId1, userId },
        { id: trackerId2, userId },
      ]);

      vi.mocked(mockGuildMemberRepository.findByUserId).mockResolvedValue([
        { guildId, isDeleted: false, isBanned: false },
      ] as any);
      vi.mocked(mockGuildSettingsService.getSettings).mockResolvedValue(
        settings,
      );

      const result = await service.filterProcessableTrackers([
        trackerId1,
        trackerId2,
      ]);

      expect(result).toEqual([trackerId1, trackerId2]);
      // Should only check user's guilds once, not per tracker
      expect(mockGuildMemberRepository.findByUserId).toHaveBeenCalledTimes(1);
    });
  });
});
