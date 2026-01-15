/**
 * GuildAccessProviderAdapter Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GuildAccessProviderAdapter } from './guild-access-provider.adapter';
import { GuildSettingsService } from '../guild-settings.service';
import { GuildMembersService } from '../../guild-members/guild-members.service';
import type { GuildSettings } from '../interfaces/settings.interface';

describe('GuildAccessProviderAdapter', () => {
  let adapter: GuildAccessProviderAdapter;
  let mockGuildSettingsService: GuildSettingsService;
  let mockGuildMembersService: GuildMembersService;

  const mockGuildId = 'guild-123';
  const mockUserId = 'user-123';

  const mockGuildSettings: GuildSettings = {
    guildId: mockGuildId,
    mmrCalculation: {
      formula: 'ones * 0.6 + twos * 0.4',
      enabled: true,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockGuildMember = {
    id: 'member-123',
    userId: mockUserId,
    guildId: mockGuildId,
    roles: ['role-1', 'role-2'],
    username: 'testuser',
    globalName: 'Test User',
    avatar: 'avatar_hash',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockGuildSettingsService = {
      getSettings: vi.fn(),
    } as unknown as GuildSettingsService;

    mockGuildMembersService = {
      findOne: vi.fn(),
    } as unknown as GuildMembersService;

    const module = await Test.createTestingModule({
      providers: [
        GuildAccessProviderAdapter,
        {
          provide: GuildSettingsService,
          useValue: mockGuildSettingsService,
        },
        {
          provide: GuildMembersService,
          useValue: mockGuildMembersService,
        },
      ],
    }).compile();

    adapter = module.get<GuildAccessProviderAdapter>(
      GuildAccessProviderAdapter,
    );
  });

  describe('getSettings', () => {
    it('should_return_guild_settings_when_guild_settings_service_returns_settings', async () => {
      vi.spyOn(mockGuildSettingsService, 'getSettings').mockResolvedValue(
        mockGuildSettings,
      );

      const result = await adapter.getSettings(mockGuildId);

      expect(result).toEqual(mockGuildSettings);
      expect(result.guildId).toBe(mockGuildId);
    });

    it('should_delegate_to_guild_settings_service', async () => {
      vi.spyOn(mockGuildSettingsService, 'getSettings').mockResolvedValue(
        mockGuildSettings,
      );

      await adapter.getSettings(mockGuildId);

      expect(mockGuildSettingsService.getSettings).toHaveBeenCalledWith(
        mockGuildId,
      );
      expect(mockGuildSettingsService.getSettings).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should_return_guild_member_when_member_exists', async () => {
      vi.spyOn(mockGuildMembersService, 'findOne').mockResolvedValue(
        mockGuildMember,
      );

      const result = await adapter.findOne(mockUserId, mockGuildId);

      expect(result).toEqual({
        id: mockGuildMember.id,
        userId: mockGuildMember.userId,
        guildId: mockGuildMember.guildId,
        roles: mockGuildMember.roles,
      });
    });

    it('should_return_null_when_member_not_found', async () => {
      vi.spyOn(mockGuildMembersService, 'findOne').mockRejectedValue(
        new NotFoundException('Guild member not found'),
      );

      const result = await adapter.findOne(mockUserId, mockGuildId);

      expect(result).toBeNull();
    });

    it('should_return_member_with_empty_roles_array_when_roles_is_null', async () => {
      const memberWithoutRoles = {
        ...mockGuildMember,
        roles: null,
      };
      vi.spyOn(mockGuildMembersService, 'findOne').mockResolvedValue(
        memberWithoutRoles,
      );

      const result = await adapter.findOne(mockUserId, mockGuildId);

      expect(result).toEqual({
        id: mockGuildMember.id,
        userId: mockGuildMember.userId,
        guildId: mockGuildMember.guildId,
        roles: [],
      });
    });

    it('should_throw_error_when_non_not_found_exception_occurs', async () => {
      const error = new Error('Database connection failed');
      vi.spyOn(mockGuildMembersService, 'findOne').mockRejectedValue(error);

      await expect(adapter.findOne(mockUserId, mockGuildId)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should_transform_member_to_expected_interface_format', async () => {
      vi.spyOn(mockGuildMembersService, 'findOne').mockResolvedValue(
        mockGuildMember,
      );

      const result = await adapter.findOne(mockUserId, mockGuildId);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('guildId');
      expect(result).toHaveProperty('roles');
      expect(result).not.toHaveProperty('username');
      expect(result).not.toHaveProperty('globalName');
      expect(result).not.toHaveProperty('avatar');
    });

    it('should_delegate_to_guild_members_service', async () => {
      vi.spyOn(mockGuildMembersService, 'findOne').mockResolvedValue(
        mockGuildMember,
      );

      await adapter.findOne(mockUserId, mockGuildId);

      expect(mockGuildMembersService.findOne).toHaveBeenCalledWith(
        mockUserId,
        mockGuildId,
      );
      expect(mockGuildMembersService.findOne).toHaveBeenCalledTimes(1);
    });
  });
});
