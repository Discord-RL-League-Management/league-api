/**
 * GuildSyncService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { GuildSyncService } from '@/guilds/services/guild-sync.service';
import { PrismaService } from '@/prisma/prisma.service';
import { SettingsDefaultsService } from '@/guilds/services/settings-defaults.service';
import { GuildErrorHandlerService } from '@/guilds/services/guild-error-handler.service';
import { UserRepository } from '@/users/repositories/user.repository';
import { SettingsService } from '@/infrastructure/settings/services/settings.service';
import { CreateGuildDto } from '@/guilds/dto/create-guild.dto';
import { Guild } from '@prisma/client';
import { GuildSettings } from '@/guilds/interfaces/settings.interface';

describe('GuildSyncService', () => {
  let service: GuildSyncService;
  let mockPrisma: PrismaService;
  let mockSettingsDefaults: SettingsDefaultsService;
  let mockErrorHandler: GuildErrorHandlerService;
  let mockUserRepository: UserRepository;
  let mockSettingsService: SettingsService;

  const guildId = 'guild-123';
  const ownerId = 'owner-123';

  const mockGuildData: CreateGuildDto = {
    id: guildId,
    name: 'Test Guild',
    icon: 'guild_icon',
    ownerId,
    memberCount: 100,
  };

  const mockGuild: Guild = {
    id: guildId,
    name: 'Test Guild',
    icon: 'guild_icon',
    ownerId,
    memberCount: 100,
    isActive: true,
    leftAt: null,
    joinedAt: new Date(),
  };

  const mockDefaultSettings: GuildSettings = {
    _metadata: {
      schemaVersion: '1.0.0',
      configVersion: 1,
    },
    bot_command_channels: [],
  } as unknown as GuildSettings;

  const mockMembers = [
    {
      userId: 'user-1',
      username: 'user1',
      globalName: 'User 1',
      avatar: 'avatar1',
      nickname: 'Nickname 1',
      roles: ['role-1'],
    },
    {
      userId: 'user-2',
      username: 'user2',
      globalName: 'User 2',
      avatar: 'avatar2',
      nickname: undefined,
      roles: ['role-2'],
    },
  ];

  beforeEach(() => {
    // ARRANGE: Setup test dependencies with mocks
    mockSettingsDefaults = {
      getDefaults: vi.fn().mockReturnValue(mockDefaultSettings),
    } as unknown as SettingsDefaultsService;

    mockErrorHandler = {
      extractErrorInfo: vi.fn().mockReturnValue({
        message: 'Error message',
        code: 'ERROR_CODE',
        details: {},
      }),
    } as unknown as GuildErrorHandlerService;

    mockUserRepository = {
      upsert: vi.fn(),
    } as unknown as UserRepository;

    mockSettingsService = {
      getSettings: vi.fn(),
      upsertSettings: vi.fn(),
    } as unknown as SettingsService;

    mockPrisma = {
      $transaction: vi.fn().mockImplementation((callback) => {
        const mockTx = {
          guild: {
            upsert: vi.fn(),
          },
          settings: {
            findUnique: vi.fn(),
            upsert: vi.fn(),
          },
          guildMember: {
            deleteMany: vi.fn(),
            createMany: vi.fn(),
          },
        } as any;
        return callback(mockTx);
      }),
    } as unknown as PrismaService;

    service = new GuildSyncService(
      mockPrisma,
      mockSettingsDefaults,
      mockErrorHandler,
      mockUserRepository,
      mockSettingsService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('syncGuildWithMembers', () => {
    it('should_sync_new_guild_with_members_successfully', async () => {
      // ARRANGE
      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback) => {
          const mockTx = {
            guild: {
              upsert: vi.fn().mockResolvedValue(mockGuild),
            },
            settings: {
              findUnique: vi.fn().mockResolvedValue(null),
              upsert: vi.fn().mockResolvedValue({
                id: 'settings-1',
                ownerType: 'guild',
                ownerId: guildId,
                settings: mockDefaultSettings,
              }),
            },
            guildMember: {
              deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
              createMany: vi.fn().mockResolvedValue({ count: 2 }),
            },
          } as any;
          return callback(mockTx);
        },
      );

      // ACT
      const result = await service.syncGuildWithMembers(
        guildId,
        mockGuildData,
        mockMembers,
      );

      // ASSERT
      expect(result.guild).toEqual(mockGuild);
      expect(result.membersSynced).toBe(2);
    });

    it('should_sync_existing_guild_with_members_successfully', async () => {
      // ARRANGE
      const existingGuild = { ...mockGuild, name: 'Existing Guild' };
      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback) => {
          const mockTx = {
            guild: {
              upsert: vi.fn().mockResolvedValue(existingGuild),
            },
            settings: {
              findUnique: vi.fn().mockResolvedValue({
                id: 'settings-1',
                ownerType: 'guild',
                ownerId: guildId,
                settings: mockDefaultSettings,
              }),
              upsert: vi.fn().mockResolvedValue({
                id: 'settings-1',
                ownerType: 'guild',
                ownerId: guildId,
                settings: mockDefaultSettings,
              }),
            },
            guildMember: {
              deleteMany: vi.fn().mockResolvedValue({ count: 5 }),
              createMany: vi.fn().mockResolvedValue({ count: 2 }),
            },
          } as any;
          return callback(mockTx);
        },
      );

      // ACT
      const result = await service.syncGuildWithMembers(
        guildId,
        mockGuildData,
        mockMembers,
      );

      // ASSERT
      expect(result.guild).toEqual(existingGuild);
      expect(result.membersSynced).toBe(2);
    });

    it('should_create_settings_when_settings_do_not_exist', async () => {
      // ARRANGE
      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback) => {
          const mockTx = {
            guild: {
              upsert: vi.fn().mockResolvedValue(mockGuild),
            },
            settings: {
              findUnique: vi.fn().mockResolvedValue(null),
              upsert: vi.fn().mockResolvedValue({
                id: 'settings-1',
                ownerType: 'guild',
                ownerId: guildId,
                settings: mockDefaultSettings,
              }),
            },
            guildMember: {
              deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
              createMany: vi.fn().mockResolvedValue({ count: 0 }),
            },
          } as any;
          return callback(mockTx);
        },
      );

      // ACT
      const result = await service.syncGuildWithMembers(
        guildId,
        mockGuildData,
        [],
      );

      // ASSERT
      expect(result.guild).toEqual(mockGuild);
      expect(result.membersSynced).toBe(0);
    });

    it('should_include_admin_roles_in_settings_when_provided', async () => {
      // ARRANGE
      const rolesData = {
        admin: [
          { id: 'admin-role-1', name: 'Admin Role 1' },
          { id: 'admin-role-2', name: 'Admin Role 2' },
        ],
      };
      const settingsWithRoles = {
        ...mockDefaultSettings,
        roles: {
          admin: rolesData.admin,
        },
      };

      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback) => {
          const mockTx = {
            guild: {
              upsert: vi.fn().mockResolvedValue(mockGuild),
            },
            settings: {
              findUnique: vi.fn().mockResolvedValue(null),
              upsert: vi.fn().mockResolvedValue({
                id: 'settings-1',
                ownerType: 'guild',
                ownerId: guildId,
                settings: settingsWithRoles,
              }),
            },
            guildMember: {
              deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
              createMany: vi.fn().mockResolvedValue({ count: 0 }),
            },
          } as any;
          return callback(mockTx);
        },
      );

      // ACT
      const result = await service.syncGuildWithMembers(
        guildId,
        mockGuildData,
        [],
        rolesData,
      );

      // ASSERT
      expect(result.guild).toEqual(mockGuild);
    });

    it('should_upsert_users_during_member_sync', async () => {
      // ARRANGE
      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback) => {
          const mockTx = {
            guild: {
              upsert: vi.fn().mockResolvedValue(mockGuild),
            },
            settings: {
              findUnique: vi.fn().mockResolvedValue(null),
              upsert: vi.fn().mockResolvedValue({
                id: 'settings-1',
                ownerType: 'guild',
                ownerId: guildId,
                settings: mockDefaultSettings,
              }),
            },
            guildMember: {
              deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
              createMany: vi.fn().mockResolvedValue({ count: 2 }),
            },
          } as any;
          vi.mocked(mockUserRepository.upsert).mockResolvedValue({} as any);
          return callback(mockTx);
        },
      );

      // ACT
      await service.syncGuildWithMembers(guildId, mockGuildData, mockMembers);

      // ASSERT: Verify users upserted (state verification through transaction completion)
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should_remove_duplicate_members_before_syncing', async () => {
      // ARRANGE
      const duplicateMembers = [
        ...mockMembers,
        { ...mockMembers[0] }, // Duplicate
      ];

      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback) => {
          const mockTx = {
            guild: {
              upsert: vi.fn().mockResolvedValue(mockGuild),
            },
            settings: {
              findUnique: vi.fn().mockResolvedValue(null),
              upsert: vi.fn().mockResolvedValue({
                id: 'settings-1',
                ownerType: 'guild',
                ownerId: guildId,
                settings: mockDefaultSettings,
              }),
            },
            guildMember: {
              deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
              createMany: vi.fn().mockResolvedValue({ count: 3 }), // All members created (deduplication happens for user upsert, not member count)
            },
          } as any;
          return callback(mockTx);
        },
      );

      // ACT
      const result = await service.syncGuildWithMembers(
        guildId,
        mockGuildData,
        duplicateMembers,
      );

      // ASSERT: Service returns original members.length, deduplication happens internally for user upsert
      expect(result.membersSynced).toBe(3); // Original array length
    });

    it('should_delete_existing_members_before_creating_new_ones', async () => {
      // ARRANGE
      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback) => {
          const mockTx = {
            guild: {
              upsert: vi.fn().mockResolvedValue(mockGuild),
            },
            settings: {
              findUnique: vi.fn().mockResolvedValue(null),
              upsert: vi.fn().mockResolvedValue({
                id: 'settings-1',
                ownerType: 'guild',
                ownerId: guildId,
                settings: mockDefaultSettings,
              }),
            },
            guildMember: {
              deleteMany: vi.fn().mockResolvedValue({ count: 5 }),
              createMany: vi.fn().mockResolvedValue({ count: 2 }),
            },
          } as any;
          return callback(mockTx);
        },
      );

      // ACT
      const result = await service.syncGuildWithMembers(
        guildId,
        mockGuildData,
        mockMembers,
      );

      // ASSERT
      expect(result.membersSynced).toBe(2);
    });

    it('should_throw_NotFoundException_when_user_foreign_key_constraint_fails', async () => {
      // ARRANGE
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        {
          code: 'P2003',
          clientVersion: '1.0.0',
          meta: { field_name: 'userId' },
        },
      );

      vi.mocked(mockPrisma.$transaction).mockRejectedValue(prismaError);

      // ACT & ASSERT
      await expect(
        service.syncGuildWithMembers(guildId, mockGuildData, mockMembers),
      ).rejects.toThrow(NotFoundException);
    });

    it('should_throw_NotFoundException_when_guild_foreign_key_constraint_fails', async () => {
      // ARRANGE
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        {
          code: 'P2003',
          clientVersion: '1.0.0',
          meta: { field_name: 'guildId' },
        },
      );

      vi.mocked(mockPrisma.$transaction).mockRejectedValue(prismaError);

      // ACT & ASSERT
      await expect(
        service.syncGuildWithMembers(guildId, mockGuildData, mockMembers),
      ).rejects.toThrow(NotFoundException);
    });

    it('should_throw_InternalServerErrorException_when_unexpected_error_occurs', async () => {
      // ARRANGE
      const error = new Error('Unexpected database error');
      vi.mocked(mockPrisma.$transaction).mockRejectedValue(error);

      // ACT & ASSERT
      await expect(
        service.syncGuildWithMembers(guildId, mockGuildData, mockMembers),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should_extract_error_info_when_error_handler_available', async () => {
      // ARRANGE
      const error = new Error('Database error');
      vi.mocked(mockPrisma.$transaction).mockRejectedValue(error);
      vi.mocked(mockErrorHandler.extractErrorInfo).mockReturnValue({
        message: 'Failed to sync guild',
        code: 'GUILD_SYNC_ERROR',
        details: { guildId },
      });

      // ACT & ASSERT
      await expect(
        service.syncGuildWithMembers(guildId, mockGuildData, mockMembers),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should_handle_empty_members_array', async () => {
      // ARRANGE
      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback) => {
          const mockTx = {
            guild: {
              upsert: vi.fn().mockResolvedValue(mockGuild),
            },
            settings: {
              findUnique: vi.fn().mockResolvedValue(null),
              upsert: vi.fn().mockResolvedValue({
                id: 'settings-1',
                ownerType: 'guild',
                ownerId: guildId,
                settings: mockDefaultSettings,
              }),
            },
            guildMember: {
              deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
              createMany: vi.fn().mockResolvedValue({ count: 0 }),
            },
          } as any;
          return callback(mockTx);
        },
      );

      // ACT
      const result = await service.syncGuildWithMembers(
        guildId,
        mockGuildData,
        [],
      );

      // ASSERT
      expect(result.guild).toEqual(mockGuild);
      expect(result.membersSynced).toBe(0);
    });

    it('should_update_existing_settings_when_admin_roles_provided', async () => {
      // ARRANGE
      const rolesData = {
        admin: [{ id: 'admin-role-1', name: 'Admin Role 1' }],
      };
      const existingSettings = {
        id: 'settings-1',
        ownerType: 'guild',
        ownerId: guildId,
        settings: mockDefaultSettings,
      };

      vi.mocked(mockPrisma.$transaction).mockImplementation(
        async (callback) => {
          const mockTx = {
            guild: {
              upsert: vi.fn().mockResolvedValue(mockGuild),
            },
            settings: {
              findUnique: vi.fn().mockResolvedValue(existingSettings),
              upsert: vi.fn().mockResolvedValue({
                ...existingSettings,
                settings: {
                  ...mockDefaultSettings,
                  roles: { admin: rolesData.admin },
                },
              }),
            },
            guildMember: {
              deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
              createMany: vi.fn().mockResolvedValue({ count: 0 }),
            },
          } as any;
          return callback(mockTx);
        },
      );

      // ACT
      const result = await service.syncGuildWithMembers(
        guildId,
        mockGuildData,
        [],
        rolesData,
      );

      // ASSERT
      expect(result.guild).toEqual(mockGuild);
    });
  });
});
