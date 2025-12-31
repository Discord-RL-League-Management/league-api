import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import type { ILoggingService } from '../../infrastructure/logging/interfaces/logging.interface';
import { LeagueRepository } from '../repositories/league.repository';
import { GuildsService } from '../../guilds/guilds.service';
import { PlayerService } from '../../players/services/player.service';
import type { ILeagueMemberAccess } from '../interfaces/league-member-access.interface';
import {
  LeagueNotFoundException,
  LeagueAccessDeniedException,
} from '../exceptions/league.exceptions';
import { PlayerNotFoundException } from '../../players/exceptions/player.exceptions';

/**
 * LeagueAccessValidationService - Single Responsibility: League access validation
 *
 * Validates user access to leagues and performs permission checks.
 * Ensures users can only access leagues they have permission for.
 */
@Injectable()
export class LeagueAccessValidationService {
  private readonly serviceName = LeagueAccessValidationService.name;

  constructor(
    private leagueRepository: LeagueRepository,
    private guildsService: GuildsService,
    private playerService: PlayerService,
    @Inject('ILeagueMemberAccess')
    private leagueMemberAccess: ILeagueMemberAccess,
    @Inject('ILoggingService')
    private readonly loggingService: ILoggingService,
  ) {}

  /**
   * Validate user can access guild
   * Single Responsibility: Guild access validation
   *
   * @param userId - User ID to validate
   * @param guildId - Guild ID to check access for
   * @throws NotFoundException if guild doesn't exist
   */
  async validateGuildAccess(userId: string, guildId: string): Promise<void> {
    try {
      const guild = await this.guildsService.findOne(guildId);
      if (!guild) {
        throw new NotFoundException('Guild', guildId);
      }
      // Guild exists - user access is validated at a higher level (AdminGuard, etc.)
      this.loggingService.debug(
        `User ${userId} has access to guild ${guildId}`,
        this.serviceName,
      );
    } catch (error) {
      this.loggingService.error(
        `Failed to validate guild access for user ${userId}, guild ${guildId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      throw error;
    }
  }

  /**
   * Validate user can access league
   * Single Responsibility: League access validation
   *
   * @param userId - User ID to validate
   * @param leagueId - League ID to check access for
   * @throws LeagueNotFoundException if league doesn't exist
   * @throws LeagueAccessDeniedException if user doesn't have access
   */
  async validateLeagueAccess(userId: string, leagueId: string): Promise<void> {
    try {
      const league = await this.leagueRepository.findOne(leagueId);
      if (!league) {
        throw new LeagueNotFoundException(leagueId);
      }

      await this.validateGuildAccess(userId, league.guildId);

      const player = await this.playerService.findByUserIdAndGuildId(
        userId,
        league.guildId,
      );
      if (!player) {
        this.loggingService.debug(
          `User ${userId} is not a player in guild ${league.guildId}`,
          this.serviceName,
        );
        // Not a player yet - that's okay, they can still view public leagues
      } else {
        // Check if player is a league member (optional - depends on league visibility settings)
        const member = await this.leagueMemberAccess.findByPlayerAndLeague(
          player.id,
          leagueId,
        );
        if (member && member.status === 'BANNED') {
          throw new LeagueAccessDeniedException(leagueId, userId);
        }
      }

      this.loggingService.debug(
        `User ${userId} has access to league ${leagueId}`,
        this.serviceName,
      );
    } catch (error) {
      if (
        error instanceof LeagueNotFoundException ||
        error instanceof NotFoundException ||
        error instanceof LeagueAccessDeniedException ||
        error instanceof PlayerNotFoundException
      ) {
        throw error;
      }
      this.loggingService.error(
        `Failed to validate league access for user ${userId}, league ${leagueId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      throw new LeagueAccessDeniedException(leagueId, userId);
    }
  }

  /**
   * Check if league exists
   * Single Responsibility: League existence check
   *
   * @param leagueId - League ID to check
   * @returns true if league exists
   */
  async leagueExists(leagueId: string): Promise<boolean> {
    return this.leagueRepository.exists(leagueId);
  }
}
