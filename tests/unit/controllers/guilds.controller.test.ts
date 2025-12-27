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
import { GuildMembersService } from '@/guild-members/guild-members.service';
import { GuildAccessValidationService } from '@/guilds/services/guild-access-validation.service';
import { PermissionCheckService } from '@/permissions/modules/permission-check/permission-check.service';
import { GuildSettingsService } from '@/guilds/guild-settings.service';
import { UserGuildsService } from '@/user-guilds/user-guilds.service';
import { DiscordBotService } from '@/discord/discord-bot.service';
import type { AuthenticatedUser } from '@/common/interfaces/user.interface';

describe('GuildsController', () => {
  let controller: GuildsController;
  let mockGuildsService: GuildsService;
  let mockGuildMembersService: GuildMembersService;
  let mockGuildAccessValidationService: GuildAccessValidationService;
  let mockPermissionCheckService: PermissionCheckService;
  let mockGuildSettingsService: GuildSettingsService;
  let mockUserGuildsService: UserGuildsService;
  let mockDiscordBotService: DiscordBotService;

  const mockUser: AuthenticatedUser = {
    id: 'user-123',
    username: 'testuser',
    globalName: 'Test User',
    avatar: 'avatar_hash',
    email: 'test@example.com',
    guilds: ['guild-1'],
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
    // ARRANGE: Setup test dependencies with mocks
    mockGuildsService = {
      findOne: vi.fn(),
      findActiveGuildIds: vi.fn(),
    } as unknown as GuildsService;

    mockGuildMembersService = {
      findOne: vi.fn(),
    } as unknown as GuildMembersService;

    mockGuildAccessValidationService = {
      validateUserGuildAccess: vi.fn(),
    } as unknown as GuildAccessValidationService;

    mockPermissionCheckService = {
      checkAdminRoles: vi.fn(),
    } as unknown as PermissionCheckService;

    mockGuildSettingsService = {
      getSettings: vi.fn(),
    } as unknown as GuildSettingsService;

    mockUserGuildsService = {
      syncUserGuildMembershipsWithRoles: vi.fn(),
    } as unknown as UserGuildsService;

    mockDiscordBotService = {
      getGuildChannels: vi.fn(),
      getGuildRoles: vi.fn(),
    } as unknown as DiscordBotService;

    const module = await Test.createTestingModule({
      controllers: [GuildsController],
      providers: [
        { provide: GuildsService, useValue: mockGuildsService },
        { provide: GuildMembersService, useValue: mockGuildMembersService },
        {
          provide: GuildAccessValidationService,
          useValue: mockGuildAccessValidationService,
        },
        {
          provide: PermissionCheckService,
          useValue: mockPermissionCheckService,
        },
        { provide: GuildSettingsService, useValue: mockGuildSettingsService },
        { provide: UserGuildsService, useValue: mockUserGuildsService },
        { provide: DiscordBotService, useValue: mockDiscordBotService },
      ],
    }).compile();

    controller = module.get<GuildsController>(GuildsController);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getGuild', () => {
    it('should_return_guild_when_user_has_access', async () => {
      // ARRANGE
      mockGuildAccessValidationService.validateUserGuildAccess.mockResolvedValue(
        undefined,
      );
      mockGuildsService.findOne.mockResolvedValue(mockGuild as never);

      // ACT
      const result = await controller.getGuild('guild-1', mockUser);

      // ASSERT
      expect(result).toEqual(mockGuild);
      expect(
        mockGuildAccessValidationService.validateUserGuildAccess,
      ).toHaveBeenCalledWith(mockUser.id, 'guild-1');
    });

    it('should_throw_when_user_lacks_access', async () => {
      // ARRANGE
      mockGuildAccessValidationService.validateUserGuildAccess.mockRejectedValue(
        new ForbiddenException('Access denied'),
      );

      // ACT & ASSERT
      await expect(controller.getGuild('guild-1', mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getGuildSettings', () => {
    it('should_return_settings_when_user_is_admin', async () => {
      // ARRANGE
      mockGuildAccessValidationService.validateUserGuildAccess.mockResolvedValue(
        undefined,
      );
      mockGuildMembersService.findOne.mockResolvedValue({
        roles: ['admin-role'],
      } as never);
      mockGuildSettingsService.getSettings.mockResolvedValue(
        mockSettings as never,
      );
      mockPermissionCheckService.checkAdminRoles.mockResolvedValue(true);

      // ACT
      const result = await controller.getGuildSettings('guild-1', mockUser);

      // ASSERT
      expect(result).toEqual(mockSettings);
      expect(mockPermissionCheckService.checkAdminRoles).toHaveBeenCalled();
    });

    it('should_throw_when_user_is_not_admin', async () => {
      // ARRANGE
      mockGuildAccessValidationService.validateUserGuildAccess.mockResolvedValue(
        undefined,
      );
      mockGuildMembersService.findOne.mockResolvedValue({
        roles: ['member-role'],
      } as never);
      mockGuildSettingsService.getSettings.mockResolvedValue(
        mockSettings as never,
      );
      mockPermissionCheckService.checkAdminRoles.mockResolvedValue(false);

      // ACT & ASSERT
      await expect(
        controller.getGuildSettings('guild-1', mockUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getGuildChannels', () => {
    it('should_return_channels_when_user_is_admin', async () => {
      // ARRANGE
      const mockChannels = [{ id: 'channel-1', name: 'General' }];
      mockGuildAccessValidationService.validateUserGuildAccess.mockResolvedValue(
        undefined,
      );
      mockGuildMembersService.findOne.mockResolvedValue({
        roles: ['admin-role'],
      } as never);
      mockGuildSettingsService.getSettings.mockResolvedValue(
        mockSettings as never,
      );
      mockPermissionCheckService.checkAdminRoles.mockResolvedValue(true);
      mockDiscordBotService.getGuildChannels.mockResolvedValue(
        mockChannels as never,
      );

      // ACT
      const result = await controller.getGuildChannels('guild-1', mockUser);

      // ASSERT
      expect(result).toEqual(mockChannels);
      expect(mockDiscordBotService.getGuildChannels).toHaveBeenCalledWith(
        'guild-1',
      );
    });
  });

  describe('getGuildRoles', () => {
    it('should_return_roles_when_user_is_admin', async () => {
      // ARRANGE
      const mockRoles = [{ id: 'role-1', name: 'Admin' }];
      mockGuildAccessValidationService.validateUserGuildAccess.mockResolvedValue(
        undefined,
      );
      mockGuildMembersService.findOne.mockResolvedValue({
        roles: ['admin-role'],
      } as never);
      mockGuildSettingsService.getSettings.mockResolvedValue(
        mockSettings as never,
      );
      mockPermissionCheckService.checkAdminRoles.mockResolvedValue(true);
      mockDiscordBotService.getGuildRoles.mockResolvedValue(mockRoles as never);

      // ACT
      const result = await controller.getGuildRoles('guild-1', mockUser);

      // ASSERT
      expect(result).toEqual(mockRoles);
      expect(mockDiscordBotService.getGuildRoles).toHaveBeenCalledWith(
        'guild-1',
      );
    });
  });
});
