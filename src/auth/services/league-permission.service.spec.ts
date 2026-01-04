/**
 * LeaguePermissionService Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { LeaguePermissionService } from './league-permission.service';
import { LeagueRepository } from '../../leagues/repositories/league.repository';
import { LeagueAccessValidationService } from './league-access-validation.service';
import { PlayerService } from '../../players/services/player.service';
import { LeagueMemberRepository } from '../../league-members/repositories/league-member.repository';
import { PermissionCheckService } from '../../permissions/modules/permission-check/permission-check.service';
import { SettingsService } from '../../infrastructure/settings/services/settings.service';
import { LeagueNotFoundException } from '../../leagues/exceptions/league.exceptions';
import { LeagueMemberRole } from '@prisma/client';

describe('LeaguePermissionService', () => {
  let service: LeaguePermissionService;
  let mockLeagueRepository: LeagueRepository;
  let mockLeagueAccessValidationService: LeagueAccessValidationService;
  let mockPlayerService: PlayerService;
  let mockLeagueMemberRepository: LeagueMemberRepository;
  let mockPermissionCheckService: PermissionCheckService;
  let mockSettingsService: SettingsService;

  beforeEach(() => {
    mockLeagueRepository = {
      findOne: vi.fn(),
    } as unknown as LeagueRepository;

    mockLeagueAccessValidationService = {} as LeagueAccessValidationService;

    mockPlayerService = {
      findByUserIdAndGuildId: vi.fn(),
    } as unknown as PlayerService;

    mockLeagueMemberRepository = {
      findByPlayerAndLeague: vi.fn(),
    } as unknown as LeagueMemberRepository;

    mockPermissionCheckService = {
      hasAdminRole: vi.fn(),
    } as unknown as PermissionCheckService;

    mockSettingsService = {
      getSettings: vi.fn(),
    } as unknown as SettingsService;

    service = new LeaguePermissionService(
      mockLeagueRepository,
      mockLeagueAccessValidationService,
      mockPlayerService,
      mockLeagueMemberRepository,
      mockPermissionCheckService,
      mockSettingsService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkLeagueAdminAccess', () => {
    it('should_pass_when_user_is_guild_admin', async () => {
      const userId = 'user123';
      const leagueId = 'league123';
      const guildId = 'guild123';
      const league = { id: leagueId, guildId };
      const settings = { roles: { admin: [] } };

      vi.mocked(mockLeagueRepository.findOne).mockResolvedValue(league as any);
      vi.mocked(mockSettingsService.getSettings).mockResolvedValue({
        id: 'settings-1',
        ownerType: 'guild',
        ownerId: guildId,
        settings,
        schemaVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      vi.mocked(mockPermissionCheckService.hasAdminRole).mockResolvedValue(
        true,
      );

      await service.checkLeagueAdminAccess(userId, leagueId);

      expect(mockLeagueRepository.findOne).toHaveBeenCalledWith(leagueId);
      expect(mockPermissionCheckService.hasAdminRole).toHaveBeenCalledWith(
        userId,
        guildId,
        true,
        settings,
      );
    });

    it('should_pass_when_user_is_league_admin', async () => {
      const userId = 'user123';
      const leagueId = 'league123';
      const guildId = 'guild123';
      const league = { id: leagueId, guildId };
      const player = { id: 'player123' };
      const leagueMember = {
        id: 'member123',
        role: LeagueMemberRole.ADMIN,
        status: 'ACTIVE',
      };
      const settings = { roles: { admin: [] } };

      vi.mocked(mockLeagueRepository.findOne).mockResolvedValue(league as any);
      vi.mocked(mockSettingsService.getSettings).mockResolvedValue({
        id: 'settings-1',
        ownerType: 'guild',
        ownerId: guildId,
        settings,
        schemaVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      vi.mocked(mockPermissionCheckService.hasAdminRole).mockResolvedValue(
        false,
      );
      vi.mocked(mockPlayerService.findByUserIdAndGuildId).mockResolvedValue(
        player as any,
      );
      vi.mocked(
        mockLeagueMemberRepository.findByPlayerAndLeague,
      ).mockResolvedValue(leagueMember as any);

      await service.checkLeagueAdminAccess(userId, leagueId);

      expect(mockPlayerService.findByUserIdAndGuildId).toHaveBeenCalledWith(
        userId,
        guildId,
      );
      expect(
        mockLeagueMemberRepository.findByPlayerAndLeague,
      ).toHaveBeenCalledWith(player.id, leagueId);
    });

    it('should_throw_LeagueNotFoundException_when_league_not_found', async () => {
      const userId = 'user123';
      const leagueId = 'league123';

      vi.mocked(mockLeagueRepository.findOne).mockResolvedValue(null);

      await expect(
        service.checkLeagueAdminAccess(userId, leagueId),
      ).rejects.toThrow(LeagueNotFoundException);
    });

    it('should_throw_ForbiddenException_when_user_has_no_admin_access', async () => {
      const userId = 'user123';
      const leagueId = 'league123';
      const guildId = 'guild123';
      const league = { id: leagueId, guildId };
      const player = { id: 'player123' };
      const leagueMember = {
        id: 'member123',
        role: LeagueMemberRole.MEMBER,
        status: 'ACTIVE',
      };
      const settings = { roles: { admin: [] } };

      vi.mocked(mockLeagueRepository.findOne).mockResolvedValue(league as any);
      vi.mocked(mockSettingsService.getSettings).mockResolvedValue({
        id: 'settings-1',
        ownerType: 'guild',
        ownerId: guildId,
        settings,
        schemaVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      vi.mocked(mockPermissionCheckService.hasAdminRole).mockResolvedValue(
        false,
      );
      vi.mocked(mockPlayerService.findByUserIdAndGuildId).mockResolvedValue(
        player as any,
      );
      vi.mocked(
        mockLeagueMemberRepository.findByPlayerAndLeague,
      ).mockResolvedValue(leagueMember as any);

      await expect(
        service.checkLeagueAdminAccess(userId, leagueId),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.checkLeagueAdminAccess(userId, leagueId),
      ).rejects.toThrow('League admin access required');
    });
  });

  describe('checkLeagueAdminOrModeratorAccess', () => {
    it('should_pass_when_user_is_guild_admin', async () => {
      const userId = 'user123';
      const leagueId = 'league123';
      const guildId = 'guild123';
      const league = { id: leagueId, guildId };
      const settings = { roles: { admin: [] } };

      vi.mocked(mockLeagueRepository.findOne).mockResolvedValue(league as any);
      vi.mocked(mockSettingsService.getSettings).mockResolvedValue({
        id: 'settings-1',
        ownerType: 'guild',
        ownerId: guildId,
        settings,
        schemaVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      vi.mocked(mockPermissionCheckService.hasAdminRole).mockResolvedValue(
        true,
      );

      await service.checkLeagueAdminOrModeratorAccess(userId, leagueId);

      expect(mockPermissionCheckService.hasAdminRole).toHaveBeenCalled();
    });

    it('should_pass_when_user_is_league_admin', async () => {
      const userId = 'user123';
      const leagueId = 'league123';
      const guildId = 'guild123';
      const league = { id: leagueId, guildId };
      const player = { id: 'player123' };
      const leagueMember = {
        id: 'member123',
        role: LeagueMemberRole.ADMIN,
        status: 'ACTIVE',
      };
      const settings = { roles: { admin: [] } };

      vi.mocked(mockLeagueRepository.findOne).mockResolvedValue(league as any);
      vi.mocked(mockSettingsService.getSettings).mockResolvedValue({
        id: 'settings-1',
        ownerType: 'guild',
        ownerId: guildId,
        settings,
        schemaVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      vi.mocked(mockPermissionCheckService.hasAdminRole).mockResolvedValue(
        false,
      );
      vi.mocked(mockPlayerService.findByUserIdAndGuildId).mockResolvedValue(
        player as any,
      );
      vi.mocked(
        mockLeagueMemberRepository.findByPlayerAndLeague,
      ).mockResolvedValue(leagueMember as any);

      await service.checkLeagueAdminOrModeratorAccess(userId, leagueId);

      expect(
        mockLeagueMemberRepository.findByPlayerAndLeague,
      ).toHaveBeenCalled();
    });

    it('should_pass_when_user_is_league_moderator', async () => {
      const userId = 'user123';
      const leagueId = 'league123';
      const guildId = 'guild123';
      const league = { id: leagueId, guildId };
      const player = { id: 'player123' };
      const leagueMember = {
        id: 'member123',
        role: LeagueMemberRole.MODERATOR,
        status: 'ACTIVE',
      };
      const settings = { roles: { admin: [] } };

      vi.mocked(mockLeagueRepository.findOne).mockResolvedValue(league as any);
      vi.mocked(mockSettingsService.getSettings).mockResolvedValue({
        id: 'settings-1',
        ownerType: 'guild',
        ownerId: guildId,
        settings,
        schemaVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      vi.mocked(mockPermissionCheckService.hasAdminRole).mockResolvedValue(
        false,
      );
      vi.mocked(mockPlayerService.findByUserIdAndGuildId).mockResolvedValue(
        player as any,
      );
      vi.mocked(
        mockLeagueMemberRepository.findByPlayerAndLeague,
      ).mockResolvedValue(leagueMember as any);

      await service.checkLeagueAdminOrModeratorAccess(userId, leagueId);

      expect(
        mockLeagueMemberRepository.findByPlayerAndLeague,
      ).toHaveBeenCalled();
    });

    it('should_throw_ForbiddenException_when_user_has_no_admin_or_moderator_access', async () => {
      const userId = 'user123';
      const leagueId = 'league123';
      const guildId = 'guild123';
      const league = { id: leagueId, guildId };
      const player = { id: 'player123' };
      const leagueMember = {
        id: 'member123',
        role: LeagueMemberRole.MEMBER,
        status: 'ACTIVE',
      };
      const settings = { roles: { admin: [] } };

      vi.mocked(mockLeagueRepository.findOne).mockResolvedValue(league as any);
      vi.mocked(mockSettingsService.getSettings).mockResolvedValue({
        id: 'settings-1',
        ownerType: 'guild',
        ownerId: guildId,
        settings,
        schemaVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      vi.mocked(mockPermissionCheckService.hasAdminRole).mockResolvedValue(
        false,
      );
      vi.mocked(mockPlayerService.findByUserIdAndGuildId).mockResolvedValue(
        player as any,
      );
      vi.mocked(
        mockLeagueMemberRepository.findByPlayerAndLeague,
      ).mockResolvedValue(leagueMember as any);

      await expect(
        service.checkLeagueAdminOrModeratorAccess(userId, leagueId),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.checkLeagueAdminOrModeratorAccess(userId, leagueId),
      ).rejects.toThrow('League admin or moderator access required');
    });
  });

  describe('checkGuildAdminAccessForGuild', () => {
    it('should_pass_when_user_is_guild_admin', async () => {
      const userId = 'user123';
      const guildId = 'guild123';
      const settings = { roles: { admin: [] } };

      vi.mocked(mockSettingsService.getSettings).mockResolvedValue({
        id: 'settings-1',
        ownerType: 'guild',
        ownerId: guildId,
        settings,
        schemaVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      vi.mocked(mockPermissionCheckService.hasAdminRole).mockResolvedValue(
        true,
      );

      await service.checkGuildAdminAccessForGuild(userId, guildId);

      expect(mockPermissionCheckService.hasAdminRole).toHaveBeenCalledWith(
        userId,
        guildId,
        true,
        settings,
      );
    });

    it('should_throw_ForbiddenException_when_user_is_not_guild_admin', async () => {
      const userId = 'user123';
      const guildId = 'guild123';
      const settings = { roles: { admin: [] } };

      vi.mocked(mockSettingsService.getSettings).mockResolvedValue({
        id: 'settings-1',
        ownerType: 'guild',
        ownerId: guildId,
        settings,
        schemaVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      vi.mocked(mockPermissionCheckService.hasAdminRole).mockResolvedValue(
        false,
      );

      await expect(
        service.checkGuildAdminAccessForGuild(userId, guildId),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.checkGuildAdminAccessForGuild(userId, guildId),
      ).rejects.toThrow('Guild admin access required');
    });
  });
});
