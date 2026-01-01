import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PlayerStatus } from '@prisma/client';
import { PlayerValidationException } from '../exceptions/player.exceptions';
import type { ITrackerService } from '../../trackers/interfaces/tracker-service.interface';
import { PlayerStatusValidator } from './player-status-validator';
import { PlayerTrackerValidator } from './player-tracker-validator';
import { PlayerGuildValidator } from './player-guild-validator';
import { PlayerCooldownValidator } from './player-cooldown-validator';

/**
 * PlayerValidationService - Single Responsibility: Player validation logic
 *
 * Validates player status, tracker links, and guild membership prerequisites.
 */
@Injectable()
export class PlayerValidationService {
  private readonly logger = new Logger(PlayerValidationService.name);

  constructor(
    private prisma: PrismaService,
    @Inject('ITrackerService') private trackerService: ITrackerService,
    private playerStatusValidator: PlayerStatusValidator,
    private playerTrackerValidator: PlayerTrackerValidator,
    private playerGuildValidator: PlayerGuildValidator,
    private playerCooldownValidator: PlayerCooldownValidator,
  ) {}

  /**
   * Validate player status for league operations
   * Single Responsibility: Status validation
   */
  validatePlayerStatus(playerStatus: PlayerStatus): void {
    this.playerStatusValidator.validatePlayerStatus(playerStatus);
  }

  /**
   * Validate tracker link
   * Single Responsibility: Tracker validation
   */
  async validateTrackerLink(
    trackerId: string | null | undefined,
    userId: string,
  ): Promise<void> {
    await this.playerTrackerValidator.validateTrackerLink(trackerId, userId);
  }

  /**
   * Validate guild membership prerequisite
   * Single Responsibility: Guild membership validation
   */
  async validateGuildMembership(
    userId: string,
    guildId: string,
  ): Promise<void> {
    await this.playerGuildValidator.validateGuildMembership(userId, guildId);
  }

  /**
   * Validate cooldown period
   * Single Responsibility: Cooldown validation
   */
  validateCooldown(
    lastLeftLeagueAt: Date | null | undefined,
    cooldownDays: number | null | undefined,
  ): void {
    this.playerCooldownValidator.validateCooldown(
      lastLeftLeagueAt,
      cooldownDays,
    );
  }

  /**
   * Validate complete player for league operations
   * Single Responsibility: Complete validation
   */
  async validatePlayerForLeague(
    playerId: string,
    requireTracker: boolean = false,
  ): Promise<void> {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!player) {
      throw new PlayerValidationException(`Player ${playerId} not found`);
    }

    this.validatePlayerStatus(player.status);

    if (requireTracker) {
      const bestTracker = await this.trackerService.findBestTrackerForUser(
        player.userId,
      );
      if (!bestTracker) {
        throw new PlayerValidationException(
          `Player ${playerId} must have at least one active tracker`,
        );
      }
    }
  }
}
