import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { LeagueRepository } from '../repositories/league.repository';
import { GuildRepository } from '../../guilds/repositories/guild.repository';
import { PlayerService } from '../../players/player.service';
import type { ILeagueMemberAccess } from '../../common/interfaces/league-domain/league-member-access.interface';
import { ILEAGUE_MEMBER_ACCESS } from '../../common/tokens/injection.tokens';
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
  private readonly logger = new Logger(LeagueAccessValidationService.name);

  constructor(
    private leagueRepository: LeagueRepository,
    private guildRepository: GuildRepository,
    private playerService: PlayerService,
    @Inject(ILEAGUE_MEMBER_ACCESS)
    private leagueMemberAccess: ILeagueMemberAccess,
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
      const guild = await this.guildRepository.findOne(guildId);
      if (!guild) {
        throw new NotFoundException('Guild', guildId);
      }
      // Guild exists - user access is validated at a higher level (AdminGuard, etc.)
      this.logger.debug(`User ${userId} has access to guild ${guildId}`);
    } catch (error) {
      this.logger.error(
        `Failed to validate guild access for user ${userId}, guild ${guildId}:`,
        error,
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
        this.logger.debug(
          `User ${userId} is not a player in guild ${league.guildId}`,
        );
        // Not a player yet - that's okay, they can still view public leagues
      } else {
        const member = await this.leagueMemberAccess.findByPlayerAndLeague(
          player.id,
          leagueId,
        );
        if (member && member.status === 'BANNED') {
          throw new LeagueAccessDeniedException(leagueId, userId);
        }
      }

      this.logger.debug(`User ${userId} has access to league ${leagueId}`);
    } catch (error) {
      if (
        error instanceof LeagueNotFoundException ||
        error instanceof NotFoundException ||
        error instanceof LeagueAccessDeniedException ||
        error instanceof PlayerNotFoundException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to validate league access for user ${userId}, league ${leagueId}:`,
        error,
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
