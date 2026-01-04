import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { LeagueMemberRole } from '@prisma/client';
import { LeagueRepository } from '../repositories/league.repository';
import { LeagueAccessValidationService } from './league-access-validation.service';
import { PlayerService } from '../../players/services/player.service';
import { LeagueMemberRepository } from '../../league-members/repositories/league-member.repository';
import { PermissionCheckService } from '../../permissions/modules/permission-check/permission-check.service';
import { SettingsService } from '../../infrastructure/settings/services/settings.service';
import { LeagueNotFoundException } from '../exceptions/league.exceptions';

/**
 * LeaguePermissionService - Single Responsibility: League-level permission checking
 *
 * Checks if users have admin or moderator permissions for specific leagues.
 * Supports both guild-level admin checks and league-specific role checks.
 */
@Injectable()
export class LeaguePermissionService {
  private readonly logger = new Logger(LeaguePermissionService.name);

  constructor(
    private leagueRepository: LeagueRepository,
    private leagueAccessValidationService: LeagueAccessValidationService,
    private playerService: PlayerService,
    private leagueMemberRepository: LeagueMemberRepository,
    private permissionCheckService: PermissionCheckService,
    private settingsService: SettingsService,
  ) {}

  /**
   * Check if user has league admin access
   * Single Responsibility: League admin permission check
   *
   * User has access if:
   * - They are a guild admin (full access to all leagues in guild), OR
   * - They are a league admin for this specific league
   *
   * @param userId - User ID to check
   * @param leagueId - League ID to check permissions for
   * @throws ForbiddenException if user doesn't have admin access
   */
  async checkLeagueAdminAccess(
    userId: string,
    leagueId: string,
  ): Promise<void> {
    try {
      const league = await this.leagueRepository.findOne(leagueId);
      if (!league) {
        throw new LeagueNotFoundException(leagueId);
      }

      // Guild admins have full access to all leagues in their guild
      const isGuildAdmin = await this.checkGuildAdminAccess(
        userId,
        league.guildId,
      );
      if (isGuildAdmin) {
        this.logger.debug(
          `User ${userId} has league admin access via guild admin role for league ${leagueId}`,
        );
        return;
      }

      const isLeagueAdmin = await this.checkLeagueRole(userId, leagueId, [
        LeagueMemberRole.ADMIN,
      ]);

      if (!isLeagueAdmin) {
        this.logger.warn(
          `User ${userId} does not have league admin access for league ${leagueId}`,
        );
        throw new ForbiddenException(
          'League admin access required - you must be a guild admin or league admin',
        );
      }

      this.logger.debug(
        `User ${userId} has league admin access via league admin role for league ${leagueId}`,
      );
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof LeagueNotFoundException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to check league admin access for user ${userId}, league ${leagueId}:`,
        error,
      );
      throw new ForbiddenException('Error checking league admin permissions');
    }
  }

  /**
   * Check if user has league admin or moderator access
   * Single Responsibility: League admin/moderator permission check
   *
   * User has access if:
   * - They are a guild admin (full access), OR
   * - They are a league admin for this specific league, OR
   * - They are a league moderator for this specific league
   *
   * @param userId - User ID to check
   * @param leagueId - League ID to check permissions for
   * @throws ForbiddenException if user doesn't have admin/moderator access
   */
  async checkLeagueAdminOrModeratorAccess(
    userId: string,
    leagueId: string,
  ): Promise<void> {
    try {
      const league = await this.leagueRepository.findOne(leagueId);
      if (!league) {
        throw new LeagueNotFoundException(leagueId);
      }

      // Guild admins have full access to all leagues in their guild
      const isGuildAdmin = await this.checkGuildAdminAccess(
        userId,
        league.guildId,
      );
      if (isGuildAdmin) {
        this.logger.debug(
          `User ${userId} has league admin/moderator access via guild admin role for league ${leagueId}`,
        );
        return;
      }

      const hasLeagueRole = await this.checkLeagueRole(userId, leagueId, [
        LeagueMemberRole.ADMIN,
        LeagueMemberRole.MODERATOR,
      ]);

      if (!hasLeagueRole) {
        this.logger.warn(
          `User ${userId} does not have league admin/moderator access for league ${leagueId}`,
        );
        throw new ForbiddenException(
          'League admin or moderator access required - you must be a guild admin, league admin, or league moderator',
        );
      }

      this.logger.debug(
        `User ${userId} has league admin/moderator access via league role for league ${leagueId}`,
      );
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof LeagueNotFoundException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to check league admin/moderator access for user ${userId}, league ${leagueId}:`,
        error,
      );
      throw new ForbiddenException('Error checking league permissions');
    }
  }

  /**
   * Check if user has guild admin access (for operations that require guild admin, not league admin)
   * Single Responsibility: Guild admin permission check for guild-level operations
   *
   * @param userId - User ID to check
   * @param guildId - Guild ID to check permissions for
   * @throws ForbiddenException if user doesn't have guild admin access
   */
  async checkGuildAdminAccessForGuild(
    userId: string,
    guildId: string,
  ): Promise<void> {
    const isAdmin = await this.checkGuildAdminAccess(userId, guildId);
    if (!isAdmin) {
      this.logger.warn(
        `User ${userId} does not have guild admin access for guild ${guildId}`,
      );
      throw new ForbiddenException('Guild admin access required');
    }
    this.logger.debug(
      `User ${userId} has guild admin access for guild ${guildId}`,
    );
  }

  /**
   * Check if user is a guild admin
   * Single Responsibility: Guild admin check helper
   *
   * @param userId - User ID to check
   * @param guildId - Guild ID to check permissions for
   * @returns true if user is guild admin
   */
  private async checkGuildAdminAccess(
    userId: string,
    guildId: string,
  ): Promise<boolean> {
    try {
      const settingsRecord = await this.settingsService.getSettings(
        'guild',
        guildId,
      );
      const settings = settingsRecord?.settings as
        | Record<string, unknown>
        | undefined;
      // Validates admin role through Discord API to ensure permissions are current
      return await this.permissionCheckService.hasAdminRole(
        userId,
        guildId,
        true,
        settings,
      );
    } catch (error) {
      this.logger.error(
        `Failed to check guild admin access for user ${userId}, guild ${guildId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Check if user has a specific role in the league
   * Single Responsibility: League role check helper
   *
   * @param userId - User ID to check
   * @param leagueId - League ID to check
   * @param roles - Roles to check for (ADMIN, MODERATOR, etc.)
   * @returns true if user has one of the specified roles
   */
  private async checkLeagueRole(
    userId: string,
    leagueId: string,
    roles: LeagueMemberRole[],
  ): Promise<boolean> {
    try {
      const league = await this.leagueRepository.findOne(leagueId);
      if (!league) {
        return false;
      }

      const player = await this.playerService.findByUserIdAndGuildId(
        userId,
        league.guildId,
      );

      if (!player) {
        this.logger.debug(
          `User ${userId} is not a player in guild ${league.guildId}`,
        );
        return false;
      }

      const leagueMember =
        await this.leagueMemberRepository.findByPlayerAndLeague(
          player.id,
          leagueId,
        );

      if (!leagueMember) {
        this.logger.debug(
          `Player ${player.id} is not a member of league ${leagueId}`,
        );
        return false;
      }

      // Only active members can have admin/moderator privileges
      const hasRole =
        leagueMember.status === 'ACTIVE' && roles.includes(leagueMember.role);

      return hasRole;
    } catch (error) {
      this.logger.error(
        `Failed to check league role for user ${userId}, league ${leagueId}:`,
        error,
      );
      return false;
    }
  }
}
