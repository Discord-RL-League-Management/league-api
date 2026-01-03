import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { TrackerProcessingGuardService } from './tracker-processing-guard.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GuildSettingsService } from '../../guilds/guild-settings.service';
import { GuildSettings } from '../../guilds/interfaces/settings.interface';

describe('TrackerProcessingGuardService', () => {
  let service: TrackerProcessingGuardService;
  let prismaService: PrismaService;
  let guildSettingsService: GuildSettingsService;

  const mockPrismaService = {
    tracker: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    guildMember: {
      findMany: vi.fn(),
    },
  };

  const mockGuildSettingsService = {
    getSettings: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackerProcessingGuardService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
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
    prismaService = module.get<PrismaService>(PrismaService);
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
      mockPrismaService.tracker.findUnique.mockResolvedValue({
        id: trackerId,
        userId,
      } as any);
      mockPrismaService.guildMember.findMany.mockResolvedValue([]);

      const result = await service.canProcessTracker(trackerId);

      expect(result).toBe(true);
      expect(mockPrismaService.tracker.findUnique).toHaveBeenCalledWith({
        where: { id: trackerId },
        select: { userId: true },
      });
      expect(mockPrismaService.guildMember.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          isDeleted: false,
          isBanned: false,
        },
        select: {
          guildId: true,
        },
      });
    });

    it('should return true when user has one guild with processing enabled', async () => {
      const guildId = 'guild1';
      const settings: GuildSettings = {
        bot_command_channels: [],
        trackerProcessing: {
          enabled: true,
        },
      };

      mockPrismaService.tracker.findUnique.mockResolvedValue({
        id: trackerId,
        userId,
      } as any);
      mockPrismaService.guildMember.findMany.mockResolvedValue([
        { guildId },
      ] as any);
      mockGuildSettingsService.getSettings.mockResolvedValue(settings);

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

      mockPrismaService.tracker.findUnique.mockResolvedValue({
        id: trackerId,
        userId,
      } as any);
      mockPrismaService.guildMember.findMany.mockResolvedValue([
        { guildId },
      ] as any);
      mockGuildSettingsService.getSettings.mockResolvedValue(settings);

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

      mockPrismaService.tracker.findUnique.mockResolvedValue({
        id: trackerId,
        userId,
      } as any);
      mockPrismaService.guildMember.findMany.mockResolvedValue([
        { guildId: guildId1 },
        { guildId: guildId2 },
      ] as any);
      mockGuildSettingsService.getSettings
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

      mockPrismaService.tracker.findUnique.mockResolvedValue({
        id: trackerId,
        userId,
      } as any);
      mockPrismaService.guildMember.findMany.mockResolvedValue([
        { guildId: guildId1 },
        { guildId: guildId2 },
      ] as any);
      mockGuildSettingsService.getSettings
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

      mockPrismaService.tracker.findUnique.mockResolvedValue({
        id: trackerId,
        userId,
      } as any);
      mockPrismaService.guildMember.findMany.mockResolvedValue([
        { guildId },
      ] as any);
      mockGuildSettingsService.getSettings.mockResolvedValue(settings);

      const result = await service.canProcessTracker(trackerId);

      expect(result).toBe(true);
    });

    it('should return false when tracker not found', async () => {
      mockPrismaService.tracker.findUnique.mockResolvedValue(null);

      const result = await service.canProcessTracker(trackerId);

      expect(result).toBe(false);
    });

    it('should return true on error (backward compatibility)', async () => {
      mockPrismaService.tracker.findUnique.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await service.canProcessTracker(trackerId);

      expect(result).toBe(true);
    });
  });

  describe('canProcessTrackerForUser', () => {
    const userId = 'user1';

    it('should return true when user has no guilds', async () => {
      mockPrismaService.guildMember.findMany.mockResolvedValue([]);

      const result = await service.canProcessTrackerForUser(userId);

      expect(result).toBe(true);
    });

    it('should return true when user has guild with processing enabled', async () => {
      const guildId = 'guild1';
      const settings: GuildSettings = {
        bot_command_channels: [],
        trackerProcessing: {
          enabled: true,
        },
      };

      mockPrismaService.guildMember.findMany.mockResolvedValue([
        { guildId },
      ] as any);
      mockGuildSettingsService.getSettings.mockResolvedValue(settings);

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

      mockPrismaService.guildMember.findMany.mockResolvedValue([
        { guildId },
      ] as any);
      mockGuildSettingsService.getSettings.mockResolvedValue(settings);

      const result = await service.canProcessTrackerForUser(userId);

      expect(result).toBe(false);
    });
  });

  describe('filterProcessableTrackers', () => {
    it('should return empty array when no tracker IDs provided', async () => {
      const result = await service.filterProcessableTrackers([]);

      expect(result).toEqual([]);
      expect(mockPrismaService.tracker.findMany).not.toHaveBeenCalled();
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

      mockPrismaService.tracker.findMany.mockResolvedValue([
        { id: trackerId1, userId: userId1 },
        { id: trackerId2, userId: userId2 },
        { id: trackerId3, userId: userId1 },
      ] as any);

      // User1 has processing enabled
      mockPrismaService.guildMember.findMany
        .mockResolvedValueOnce([{ guildId: guildId1 }] as any)
        // User2 has processing disabled
        .mockResolvedValueOnce([{ guildId: guildId2 }] as any);

      mockGuildSettingsService.getSettings
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

      mockPrismaService.tracker.findMany.mockRejectedValue(
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

      mockPrismaService.tracker.findMany.mockResolvedValue([
        { id: trackerId1, userId },
        { id: trackerId2, userId },
      ] as any);

      mockPrismaService.guildMember.findMany.mockResolvedValue([
        { guildId },
      ] as any);
      mockGuildSettingsService.getSettings.mockResolvedValue(settings);

      const result = await service.filterProcessableTrackers([
        trackerId1,
        trackerId2,
      ]);

      expect(result).toEqual([trackerId1, trackerId2]);
      // Should only check user's guilds once, not per tracker
      expect(mockPrismaService.guildMember.findMany).toHaveBeenCalledTimes(1);
    });
  });
});
