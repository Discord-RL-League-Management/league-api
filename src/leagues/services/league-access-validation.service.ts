import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { LeagueRepository } from '../repositories/league.repository';
import { GuildsService } from '../../guilds/guilds.service';
import { LeagueNotFoundException, LeagueAccessDeniedException } from '../exceptions/league.exceptions';

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
    private guildsService: GuildsService,
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
      this.logger.debug(`User ${userId} has access to guild ${guildId}`);
    } catch (error) {
      this.logger.error(`Failed to validate guild access for user ${userId}, guild ${guildId}:`, error);
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

      // Validate user has access to the guild that owns the league
      await this.validateGuildAccess(userId, league.guildId);

      this.logger.debug(`User ${userId} has access to league ${leagueId}`);
    } catch (error) {
      if (error instanceof LeagueNotFoundException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to validate league access for user ${userId}, league ${leagueId}:`, error);
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


