/**
 * PermissionsController Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { PermissionsController } from './permissions.controller';
import { PermissionCheckService } from './modules/permission-check/permission-check.service';
import { GuildMembersService } from '../guild-members/guild-members.service';
import { GuildSettingsService } from '../guilds/guild-settings.service';
import type { AuthenticatedUser } from '../common/interfaces/user.interface';

describe('PermissionsController', () => {
  let controller: PermissionsController;
  let mockPermissionCheckService: PermissionCheckService;
  let mockGuildMembersService: GuildMembersService;
  let mockGuildSettingsService: GuildSettingsService;

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

  beforeEach(async () => {
    mockPermissionCheckService = {
      checkGuildAccess: vi.fn(),
    } as unknown as PermissionCheckService;

    mockGuildMembersService = {
      findOne: vi.fn(),
    } as unknown as GuildMembersService;

    mockGuildSettingsService = {
      getSettings: vi.fn(),
    } as unknown as GuildSettingsService;

    const module = await Test.createTestingModule({
      controllers: [PermissionsController],
      providers: [
        {
          provide: PermissionCheckService,
          useValue: mockPermissionCheckService,
        },
        { provide: GuildMembersService, useValue: mockGuildMembersService },
        { provide: GuildSettingsService, useValue: mockGuildSettingsService },
      ],
    }).compile();

    controller = module.get<PermissionsController>(PermissionsController);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getMyPermissions', () => {
    it('should_return_permissions_when_user_authenticated', async () => {
      const mockSettings = { _metadata: {} };
      const mockPermissionState = { isAdmin: true, isModerator: false };
      const mockMembership = { roles: ['admin'] };
      vi.mocked(mockGuildSettingsService.getSettings).mockResolvedValue(
        mockSettings as never,
      );
      vi.mocked(mockPermissionCheckService.checkGuildAccess).mockResolvedValue(
        mockPermissionState as never,
      );
      vi.mocked(mockGuildMembersService.findOne).mockResolvedValue(
        mockMembership as never,
      );

      const result = await controller.getMyPermissions('guild-1', mockUser);

      expect(result).toHaveProperty('isAdmin', true);
      expect(result).toHaveProperty('roles', ['admin']);
      expect(mockPermissionCheckService.checkGuildAccess).toHaveBeenCalled();
    });
  });
});
