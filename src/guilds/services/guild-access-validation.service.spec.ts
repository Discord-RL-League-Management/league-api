/**
 * GuildAccessValidationService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestAccessToken } from '@tests/factories/token.factory';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { GuildAccessValidationService } from './guild-access-validation.service';
import { GuildRepository } from '../repositories/guild.repository';
import { GuildMemberRepository } from '../../guild-members/repositories/guild-member.repository';
import { TokenManagementService } from '../../auth/services/token-management.service';
import { DiscordApiService } from '../../discord/discord-api.service';

describe('GuildAccessValidationService', () => {
  let service: GuildAccessValidationService;
  let mockGuildRepository: GuildRepository;
  let mockGuildMemberRepository: GuildMemberRepository;
  let mockTokenManagementService: TokenManagementService;
  let mockDiscordApiService: DiscordApiService;

  beforeEach(() => {
    mockGuildRepository = {
      exists: vi.fn(),
      findOne: vi.fn(),
    } as unknown as GuildRepository;

    mockGuildMemberRepository = {
      findByCompositeKey: vi.fn(),
      create: vi.fn(),
    } as unknown as GuildMemberRepository;

    mockTokenManagementService = {
      getValidAccessToken: vi.fn(),
    } as unknown as TokenManagementService;

    mockDiscordApiService = {
      checkGuildPermissions: vi.fn(),
    } as unknown as DiscordApiService;

    service = new GuildAccessValidationService(
      mockGuildRepository,
      mockGuildMemberRepository,
      mockTokenManagementService,
      mockDiscordApiService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateUserGuildAccess', () => {
    it('should_pass_when_guild_exists_and_user_is_member', async () => {
      const userId = 'user123';
      const guildId = 'guild123';
      const membership = { userId, guildId };

      vi.mocked(mockGuildRepository.exists).mockResolvedValue(true);
      vi.mocked(mockGuildMemberRepository.findByCompositeKey).mockResolvedValue(
        membership as any,
      );

      await service.validateUserGuildAccess(userId, guildId);

      expect(mockGuildRepository.exists).toHaveBeenCalledWith(guildId);
      expect(mockGuildMemberRepository.findByCompositeKey).toHaveBeenCalledWith(
        userId,
        guildId,
      );
    });

    it('should_throw_NotFoundException_when_guild_does_not_exist', async () => {
      const userId = 'user123';
      const guildId = 'guild123';

      vi.mocked(mockGuildRepository.exists).mockResolvedValue(false);

      await expect(
        service.validateUserGuildAccess(userId, guildId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.validateUserGuildAccess(userId, guildId),
      ).rejects.toThrow('Guild not found or bot is not a member');
    });

    it('should_sync_membership_when_not_found_but_valid_in_discord', async () => {
      const userId = 'user123';
      const guildId = 'guild123';
      const accessToken = createTestAccessToken('guild');
      const guild = { id: guildId, name: 'Test Guild' };
      const guildPermissions = {
        isMember: true,
        roles: ['role123'],
      };

      vi.mocked(mockGuildRepository.exists).mockResolvedValue(true);
      vi.mocked(mockGuildMemberRepository.findByCompositeKey).mockResolvedValue(
        null,
      );
      vi.mocked(
        mockTokenManagementService.getValidAccessToken,
      ).mockResolvedValue(accessToken);
      vi.mocked(mockDiscordApiService.checkGuildPermissions).mockResolvedValue(
        guildPermissions as any,
      );
      vi.mocked(mockGuildRepository.findOne).mockResolvedValue(guild as any);
      vi.mocked(mockGuildMemberRepository.create).mockResolvedValue({} as any);

      await service.validateUserGuildAccess(userId, guildId);

      expect(mockDiscordApiService.checkGuildPermissions).toHaveBeenCalledWith(
        accessToken,
        guildId,
      );
      expect(mockGuildMemberRepository.create).toHaveBeenCalled();
    });

    it('should_throw_ForbiddenException_when_user_not_member_in_discord', async () => {
      const userId = 'user123';
      const guildId = 'guild123';
      const accessToken = createTestAccessToken('guild');
      const guildPermissions = {
        isMember: false,
        roles: [],
      };

      vi.mocked(mockGuildRepository.exists).mockResolvedValue(true);
      vi.mocked(mockGuildMemberRepository.findByCompositeKey).mockResolvedValue(
        null,
      );
      vi.mocked(
        mockTokenManagementService.getValidAccessToken,
      ).mockResolvedValue(accessToken);
      vi.mocked(mockDiscordApiService.checkGuildPermissions).mockResolvedValue(
        guildPermissions as any,
      );

      await expect(
        service.validateUserGuildAccess(userId, guildId),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.validateUserGuildAccess(userId, guildId),
      ).rejects.toThrow('You are not a member of this guild');
    });

    it('should_throw_ForbiddenException_when_no_access_token', async () => {
      const userId = 'user123';
      const guildId = 'guild123';

      vi.mocked(mockGuildRepository.exists).mockResolvedValue(true);
      vi.mocked(mockGuildMemberRepository.findByCompositeKey).mockResolvedValue(
        null,
      );
      vi.mocked(
        mockTokenManagementService.getValidAccessToken,
      ).mockResolvedValue(null);

      await expect(
        service.validateUserGuildAccess(userId, guildId),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
