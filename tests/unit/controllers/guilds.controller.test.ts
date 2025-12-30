/**
 * GuildsController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { GuildsController } from '@/guilds/guilds.controller';
import { GuildsService } from '@/guilds/guilds.service';
import { GuildAccessValidationService } from '@/guilds/services/guild-access-validation.service';
import { GuildSettingsService } from '@/guilds/guild-settings.service';
import { DiscordBotService } from '@/discord/discord-bot.service';
import { GuildAdminGuard } from '@/common/guards/guild-admin.guard';
import type { AuthenticatedUser } from '@/common/interfaces/user.interface';

describe('GuildsController', () => {
  let controller: GuildsController;
  let mockGuildsService: GuildsService;
  let mockGuildAccessValidationService: GuildAccessValidationService;
  let mockGuildSettingsService: GuildSettingsService;
  let mockDiscordBotService: DiscordBotService;

  const mockUser: AuthenticatedUser = {
    id: 'user-123',
    username: 'testuser',
    globalName: 'Test User',
    avatar: 'avatar_hash',
    email: 'test@example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  };

  const mockGuild = {
    id: 'guild-1',
    name: 'Test Guild',
    icon: 'guild_icon',
    ownerId: 'owner-123',
    memberCount: 100,
    isActive: true,
  };

  const mockSettings = {
    _metadata: {
      schemaVersion: '1.0.0',
      configVersion: 1,
    },
    bot_command_channels: [],
  };

  beforeEach(async () => {
    mockGuildsService = {
      findOne: vi.fn(),
      getSettings: vi.fn(),
    } as unknown as GuildsService;

    mockGuildAccessValidationService = {
      validateUserGuildAccess: vi.fn(),
    } as unknown as GuildAccessValidationService;

    mockGuildSettingsService = {
      getSettings: vi.fn(),
    } as unknown as GuildSettingsService;

    mockDiscordBotService = {
      getGuildChannels: vi.fn(),
      getGuildRoles: vi.fn(),
    } as unknown as DiscordBotService;

    const module = await Test.createTestingModule({
      controllers: [GuildsController],
      providers: [
        { provide: GuildsService, useValue: mockGuildsService },
        {
          provide: GuildAccessValidationService,
          useValue: mockGuildAccessValidationService,
        },
        { provide: GuildSettingsService, useValue: mockGuildSettingsService },
        { provide: DiscordBotService, useValue: mockDiscordBotService },
      ],
    })
      .overrideGuard(GuildAdminGuard)
      .useValue({
        canActivate: vi.fn().mockResolvedValue(true),
      } as unknown as GuildAdminGuard)
      .compile();

    controller = module.get<GuildsController>(GuildsController);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getGuild', () => {
    it('should_return_guild_when_user_has_access', async () => {
      vi.mocked(
        mockGuildAccessValidationService.validateUserGuildAccess,
      ).mockResolvedValue(undefined);
      vi.mocked(mockGuildsService.findOne).mockResolvedValue(
        mockGuild as never,
      );

      const result = await controller.getGuild('guild-1', mockUser);

      expect(result).toEqual(mockGuild);
      expect(
        mockGuildAccessValidationService.validateUserGuildAccess,
      ).toHaveBeenCalledWith(mockUser.id, 'guild-1');
    });

    it('should_throw_when_user_lacks_access', async () => {
      vi.mocked(
        mockGuildAccessValidationService.validateUserGuildAccess,
      ).mockRejectedValue(new ForbiddenException('Access denied'));

      await expect(controller.getGuild('guild-1', mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getGuildSettings', () => {
    it('should_return_settings_when_user_is_admin', async () => {
      // Note: GuildAdminGuard is applied, so we skip permission checks here
      // The guard handles validation, so the controller just returns settings
      vi.mocked(mockGuildSettingsService.getSettings).mockResolvedValue(
        mockSettings as never,
      );

      const result = await controller.getGuildSettings('guild-1', mockUser);

      expect(result).toEqual(mockSettings);
      expect(mockGuildSettingsService.getSettings).toHaveBeenCalledWith(
        'guild-1',
      );
    });
  });

  describe('getGuildChannels', () => {
    it('should_return_channels_when_user_is_admin', async () => {
      const mockChannels = [{ id: 'channel-1', name: 'General' }];
      // Note: GuildAdminGuard is applied, so we skip permission checks here
      vi.mocked(mockDiscordBotService.getGuildChannels).mockResolvedValue(
        mockChannels as never,
      );

      const result = await controller.getGuildChannels('guild-1', mockUser);

      expect(result).toEqual(mockChannels);
      expect(mockDiscordBotService.getGuildChannels).toHaveBeenCalledWith(
        'guild-1',
      );
    });
  });

  describe('getGuildRoles', () => {
    it('should_return_roles_when_user_is_admin', async () => {
      const mockRoles = [{ id: 'role-1', name: 'Admin' }];
      // Note: GuildAdminGuard is applied, so we skip permission checks here
      vi.mocked(mockDiscordBotService.getGuildRoles).mockResolvedValue(
        mockRoles as never,
      );

      const result = await controller.getGuildRoles('guild-1', mockUser);

      expect(result).toEqual(mockRoles);
      expect(mockDiscordBotService.getGuildRoles).toHaveBeenCalledWith(
        'guild-1',
      );
    });
  });
});
