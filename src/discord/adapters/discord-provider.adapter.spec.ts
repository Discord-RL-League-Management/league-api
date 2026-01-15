/**
 * DiscordProviderAdapter Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 *
 * Aligned with ISO/IEC/IEEE 29119 standards and Black Box Axiom.
 * Tests verify inputs, outputs, and observable side effects only.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { DiscordProviderAdapter } from './discord-provider.adapter';
import { DiscordApiService } from '../discord-api.service';
import type { GuildPermissions } from '../../common/interfaces/discord-provider.interface';

describe('DiscordProviderAdapter', () => {
  let adapter: DiscordProviderAdapter;
  let mockDiscordApiService: DiscordApiService;

  const mockAccessToken = 'access-token-123';
  const mockGuildId = 'guild-123';

  const mockGuildPermissions: GuildPermissions = {
    isMember: true,
    permissions: ['ADMINISTRATOR'],
    roles: ['admin-role'],
    hasAdministratorPermission: true,
  };

  beforeEach(async () => {
    mockDiscordApiService = {
      checkGuildPermissions: vi.fn(),
    } as unknown as DiscordApiService;

    const module = await Test.createTestingModule({
      providers: [
        DiscordProviderAdapter,
        {
          provide: DiscordApiService,
          useValue: mockDiscordApiService,
        },
      ],
    }).compile();

    adapter = module.get<DiscordProviderAdapter>(DiscordProviderAdapter);
  });

  describe('checkGuildPermissions', () => {
    it('should_return_guild_permissions_when_discord_api_service_returns_permissions', async () => {
      vi.spyOn(
        mockDiscordApiService,
        'checkGuildPermissions',
      ).mockResolvedValue(mockGuildPermissions);

      const result = await adapter.checkGuildPermissions(
        mockAccessToken,
        mockGuildId,
      );

      expect(result).toEqual(mockGuildPermissions);
      expect(result.isMember).toBe(true);
      expect(result.hasAdministratorPermission).toBe(true);
    });

    it('should_return_permissions_with_false_admin_when_user_is_not_admin', async () => {
      const nonAdminPermissions: GuildPermissions = {
        isMember: true,
        permissions: ['VIEW_CHANNELS'],
        roles: ['member-role'],
        hasAdministratorPermission: false,
      };
      vi.spyOn(
        mockDiscordApiService,
        'checkGuildPermissions',
      ).mockResolvedValue(nonAdminPermissions);

      const result = await adapter.checkGuildPermissions(
        mockAccessToken,
        mockGuildId,
      );

      expect(result).toEqual(nonAdminPermissions);
      expect(result.hasAdministratorPermission).toBe(false);
    });

    it('should_delegate_to_discord_api_service', async () => {
      vi.spyOn(
        mockDiscordApiService,
        'checkGuildPermissions',
      ).mockResolvedValue(mockGuildPermissions);

      await adapter.checkGuildPermissions(mockAccessToken, mockGuildId);

      expect(mockDiscordApiService.checkGuildPermissions).toHaveBeenCalledWith(
        mockAccessToken,
        mockGuildId,
      );
      expect(mockDiscordApiService.checkGuildPermissions).toHaveBeenCalledTimes(
        1,
      );
    });
  });
});
