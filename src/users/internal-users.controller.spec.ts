/**
 * InternalUsersController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { InternalUsersController } from './internal-users.controller';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from '@prisma/client';
import { RegisterByStaffDto } from '../internal/dto/register-by-staff.dto';
import { TrackerProcessingService } from '../trackers/services/tracker-processing.service';
import { PermissionCheckService } from '../permissions/modules/permission-check/permission-check.service';
import { GuildSettingsService } from '../guilds/guild-settings.service';
import { DiscordBotService } from '../discord/discord-bot.service';
import { TrackerScrapingStatus, Game, GamePlatform } from '@prisma/client';

describe('InternalUsersController', () => {
  let controller: InternalUsersController;
  let mockUsersService: UsersService;
  let mockTrackerProcessingService: TrackerProcessingService;
  let mockPermissionCheckService: PermissionCheckService;
  let mockGuildSettingsService: GuildSettingsService;
  let mockDiscordBotService: DiscordBotService;

  const mockUser: User = {
    id: 'user-123',
    username: 'testuser',
    discriminator: '1234',
    globalName: 'Test User',
    avatar: 'avatar_hash',
    email: 'test@example.com',
    accessToken: 'encrypted_access_token',
    refreshToken: 'encrypted_refresh_token',
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    isBanned: false,
    isDeleted: false,
  };

  beforeEach(async () => {
    mockUsersService = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as unknown as UsersService;

    mockTrackerProcessingService = {
      registerTrackers: vi.fn(),
    } as unknown as TrackerProcessingService;

    mockPermissionCheckService = {
      checkAdminRoles: vi.fn(),
    } as unknown as PermissionCheckService;

    mockGuildSettingsService = {
      getSettings: vi.fn(),
    } as unknown as GuildSettingsService;

    mockDiscordBotService = {
      getGuildMemberByUserId: vi.fn(),
    } as unknown as DiscordBotService;

    const module = await Test.createTestingModule({
      controllers: [InternalUsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
        {
          provide: TrackerProcessingService,
          useValue: mockTrackerProcessingService,
        },
        {
          provide: PermissionCheckService,
          useValue: mockPermissionCheckService,
        },
        {
          provide: GuildSettingsService,
          useValue: mockGuildSettingsService,
        },
        { provide: DiscordBotService, useValue: mockDiscordBotService },
      ],
    }).compile();

    controller = module.get<InternalUsersController>(InternalUsersController);
  });

  describe('findAll', () => {
    it('should_return_all_users_when_called', async () => {
      const mockUsers = [mockUser];
      vi.spyOn(mockUsersService, 'findAll').mockResolvedValue(mockUsers);

      const result = await controller.findAll();

      expect(result).toEqual(mockUsers);
      expect(mockUsersService.findAll).toHaveBeenCalledWith();
    });

    it('should_return_empty_array_when_no_users_exist', async () => {
      vi.spyOn(mockUsersService, 'findAll').mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
      expect(mockUsersService.findAll).toHaveBeenCalledWith();
    });
  });

  describe('findOne', () => {
    it('should_return_user_when_id_provided', async () => {
      vi.spyOn(mockUsersService, 'findOne').mockResolvedValue(mockUser);

      const result = await controller.findOne('user-123');

      expect(result).toEqual(mockUser);
      expect(mockUsersService.findOne).toHaveBeenCalledWith('user-123');
    });
  });

  describe('create', () => {
    it('should_create_user_when_valid_dto_provided', async () => {
      const createUserDto: CreateUserDto = {
        id: 'user-456',
        username: 'newuser',
        email: 'newuser@example.com',
      };

      const createdUser: User = {
        ...mockUser,
        id: 'user-456',
        username: 'newuser',
        email: 'newuser@example.com',
      };

      vi.spyOn(mockUsersService, 'create').mockResolvedValue(createdUser);

      const result = await controller.create(createUserDto);

      expect(result).toEqual(createdUser);
      expect(mockUsersService.create).toHaveBeenCalledWith(createUserDto);
    });

    it('should_create_user_with_minimal_fields_when_only_required_fields_provided', async () => {
      const createUserDto: CreateUserDto = {
        id: 'user-789',
        username: 'minimaluser',
      };

      const createdUser: User = {
        ...mockUser,
        id: 'user-789',
        username: 'minimaluser',
      };

      vi.spyOn(mockUsersService, 'create').mockResolvedValue(createdUser);

      const result = await controller.create(createUserDto);

      expect(result).toEqual(createdUser);
      expect(mockUsersService.create).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('update', () => {
    it('should_update_user_when_valid_id_and_dto_provided', async () => {
      const updateUserDto: UpdateUserDto = {
        username: 'updateduser',
        email: 'updated@example.com',
      };

      const updatedUser: User = {
        ...mockUser,
        username: 'updateduser',
        email: 'updated@example.com',
      };

      vi.spyOn(mockUsersService, 'update').mockResolvedValue(updatedUser);

      const result = await controller.update('user-123', updateUserDto);

      expect(result).toEqual(updatedUser);
      expect(mockUsersService.update).toHaveBeenCalledWith(
        'user-123',
        updateUserDto,
      );
    });

    it('should_update_partial_fields_when_partial_dto_provided', async () => {
      const updateUserDto: UpdateUserDto = {
        username: 'partialupdate',
      };

      const updatedUser: User = {
        ...mockUser,
        username: 'partialupdate',
      };

      vi.spyOn(mockUsersService, 'update').mockResolvedValue(updatedUser);

      const result = await controller.update('user-123', updateUserDto);

      expect(result).toEqual(updatedUser);
      expect(mockUsersService.update).toHaveBeenCalledWith(
        'user-123',
        updateUserDto,
      );
    });
  });

  describe('delete', () => {
    it('should_delete_user_when_valid_id_provided', async () => {
      vi.spyOn(mockUsersService, 'delete').mockResolvedValue(mockUser);

      const result = await controller.delete('user-123');

      expect(result).toEqual(mockUser);
      expect(mockUsersService.delete).toHaveBeenCalledWith('user-123');
    });
  });

  describe('registerByStaff', () => {
    const registerDto: RegisterByStaffDto = {
      staffUserId: 'staff-123',
      guildId: 'guild-123',
      userId: 'user-456',
      urls: [
        'https://rocketleague.tracker.network/rocket-league/profile/steam/76561198051701160/overview',
      ],
      userData: {
        username: 'newuser',
        globalName: 'New User',
        avatar: 'avatar_hash',
      },
      channelId: 'channel-123',
      interactionToken: 'token-123',
    };

    const mockGuildSettings = {
      roles: {
        admin: [{ id: 'admin-role-1', name: 'Admin' }],
      },
    };

    const mockStaffMember = {
      roles: ['admin-role-1', 'other-role'],
      user: { id: 'staff-123', username: 'staffuser' },
    };

    const mockTargetMember = {
      roles: ['member-role'],
      user: { id: 'user-456', username: 'newuser' },
    };

    const mockTrackers = [
      {
        id: 'tracker-1',
        url: 'https://rocketleague.tracker.network/rocket-league/profile/steam/76561198051701160/overview',
        scrapingStatus: TrackerScrapingStatus.PENDING,
        game: Game.ROCKET_LEAGUE,
        platform: GamePlatform.STEAM,
        userId: 'user-456',
        username: 'testuser',
        isActive: true,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it('should_register_user_with_trackers_when_staff_has_admin_role_and_user_is_guild_member', async () => {
      vi.spyOn(mockGuildSettingsService, 'getSettings').mockResolvedValue(
        mockGuildSettings as never,
      );
      vi.spyOn(mockDiscordBotService, 'getGuildMemberByUserId')
        .mockResolvedValueOnce(mockStaffMember)
        .mockResolvedValueOnce(mockTargetMember);
      vi.spyOn(mockPermissionCheckService, 'checkAdminRoles').mockResolvedValue(
        true,
      );
      vi.spyOn(
        mockTrackerProcessingService,
        'registerTrackers',
      ).mockResolvedValue(mockTrackers as never);
      vi.spyOn(mockUsersService, 'findOne').mockResolvedValue(mockUser);

      const result = await controller.registerByStaff(registerDto);

      expect(result).toEqual({
        user: mockUser,
        trackers: {
          count: 1,
          items: [
            {
              id: 'tracker-1',
              url: 'https://rocketleague.tracker.network/rocket-league/profile/steam/76561198051701160/overview',
              status: TrackerScrapingStatus.PENDING,
              game: Game.ROCKET_LEAGUE,
              platform: GamePlatform.STEAM,
            },
          ],
        },
      });
      expect(mockGuildSettingsService.getSettings).toHaveBeenCalledWith(
        'guild-123',
      );
      expect(mockDiscordBotService.getGuildMemberByUserId).toHaveBeenCalledWith(
        'guild-123',
        'staff-123',
      );
      expect(mockDiscordBotService.getGuildMemberByUserId).toHaveBeenCalledWith(
        'guild-123',
        'user-456',
      );
      expect(mockPermissionCheckService.checkAdminRoles).toHaveBeenCalledWith(
        ['admin-role-1', 'other-role'],
        'guild-123',
        mockGuildSettings,
        true,
      );
      expect(
        mockTrackerProcessingService.registerTrackers,
      ).toHaveBeenCalledWith(
        'user-456',
        registerDto.urls,
        registerDto.userData,
        'channel-123',
        'token-123',
      );
      expect(mockUsersService.findOne).toHaveBeenCalledWith('user-456');
    });

    it('should_throw_forbidden_exception_when_staff_member_not_in_guild', async () => {
      vi.spyOn(mockGuildSettingsService, 'getSettings').mockResolvedValue(
        mockGuildSettings as never,
      );
      vi.spyOn(
        mockDiscordBotService,
        'getGuildMemberByUserId',
      ).mockResolvedValue(null);

      await expect(controller.registerByStaff(registerDto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockDiscordBotService.getGuildMemberByUserId).toHaveBeenCalledWith(
        'guild-123',
        'staff-123',
      );
      expect(mockPermissionCheckService.checkAdminRoles).not.toHaveBeenCalled();
    });

    it('should_throw_forbidden_exception_when_staff_member_does_not_have_admin_role', async () => {
      vi.spyOn(mockGuildSettingsService, 'getSettings').mockResolvedValue(
        mockGuildSettings as never,
      );
      vi.spyOn(
        mockDiscordBotService,
        'getGuildMemberByUserId',
      ).mockResolvedValue(mockStaffMember);
      vi.spyOn(mockPermissionCheckService, 'checkAdminRoles').mockResolvedValue(
        false,
      );

      await expect(controller.registerByStaff(registerDto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockPermissionCheckService.checkAdminRoles).toHaveBeenCalled();
      expect(
        mockTrackerProcessingService.registerTrackers,
      ).not.toHaveBeenCalled();
    });

    it('should_throw_forbidden_exception_when_target_user_not_in_guild', async () => {
      vi.spyOn(mockGuildSettingsService, 'getSettings').mockResolvedValue(
        mockGuildSettings as never,
      );
      vi.spyOn(mockDiscordBotService, 'getGuildMemberByUserId')
        .mockResolvedValueOnce(mockStaffMember)
        .mockResolvedValueOnce(null);
      vi.spyOn(mockPermissionCheckService, 'checkAdminRoles').mockResolvedValue(
        true,
      );

      await expect(controller.registerByStaff(registerDto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(
        mockDiscordBotService.getGuildMemberByUserId,
      ).toHaveBeenCalledTimes(2);
      expect(
        mockTrackerProcessingService.registerTrackers,
      ).not.toHaveBeenCalled();
    });

    it('should_throw_not_found_exception_when_user_not_found_after_registration', async () => {
      vi.spyOn(mockGuildSettingsService, 'getSettings').mockResolvedValue(
        mockGuildSettings as never,
      );
      vi.spyOn(mockDiscordBotService, 'getGuildMemberByUserId')
        .mockResolvedValueOnce(mockStaffMember)
        .mockResolvedValueOnce(mockTargetMember);
      vi.spyOn(mockPermissionCheckService, 'checkAdminRoles').mockResolvedValue(
        true,
      );
      vi.spyOn(
        mockTrackerProcessingService,
        'registerTrackers',
      ).mockResolvedValue(mockTrackers as never);
      vi.spyOn(mockUsersService, 'findOne').mockResolvedValue(null as never);

      await expect(controller.registerByStaff(registerDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockUsersService.findOne).toHaveBeenCalledWith('user-456');
    });

    it('should_register_multiple_trackers_when_provided', async () => {
      const multipleTrackersDto: RegisterByStaffDto = {
        ...registerDto,
        urls: [
          'https://rocketleague.tracker.network/rocket-league/profile/steam/76561198051701160/overview',
          'https://rocketleague.tracker.network/rocket-league/profile/epic/username/overview',
        ],
      };

      const multipleMockTrackers = [
        {
          ...mockTrackers[0],
          id: 'tracker-1',
        },
        {
          ...mockTrackers[0],
          id: 'tracker-2',
          platform: GamePlatform.EPIC,
        },
      ];

      vi.spyOn(mockGuildSettingsService, 'getSettings').mockResolvedValue(
        mockGuildSettings as never,
      );
      vi.spyOn(mockDiscordBotService, 'getGuildMemberByUserId')
        .mockResolvedValueOnce(mockStaffMember)
        .mockResolvedValueOnce(mockTargetMember);
      vi.spyOn(mockPermissionCheckService, 'checkAdminRoles').mockResolvedValue(
        true,
      );
      vi.spyOn(
        mockTrackerProcessingService,
        'registerTrackers',
      ).mockResolvedValue(multipleMockTrackers as never);
      vi.spyOn(mockUsersService, 'findOne').mockResolvedValue(mockUser);

      const result = await controller.registerByStaff(multipleTrackersDto);

      expect(result.trackers.count).toBe(2);
      expect(result.trackers.items).toHaveLength(2);
    });
  });
});
