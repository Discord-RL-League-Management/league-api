import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PlayerStatus } from '@prisma/client';
import { PlayerValidationException, InvalidPlayerStatusException } from '../exceptions/player.exceptions';
import { TrackerService } from '../../trackers/services/tracker.service';
import { GuildMembersService } from '../../guild-members/guild-members.service';

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
    private trackerService: TrackerService,
    private guildMembersService: GuildMembersService,
  ) {}

  /**
   * Validate player status for league operations
   * Single Responsibility: Status validation
   */
  validatePlayerStatus(playerStatus: PlayerStatus): void {
    if (playerStatus === PlayerStatus.BANNED || playerStatus === PlayerStatus.SUSPENDED) {
      throw new InvalidPlayerStatusException(
        `Player status '${playerStatus}' does not allow league operations`,
      );
    }
  }

  /**
   * Validate tracker link
   * Single Responsibility: Tracker validation
   */
  async validateTrackerLink(trackerId: string | null | undefined, userId: string): Promise<void> {
    if (!trackerId) {
      return; // Optional field
    }

    try {
      const tracker = await this.trackerService.getTrackerById(trackerId);
      
      if (tracker.userId !== userId) {
        throw new PlayerValidationException(
          `Tracker ${trackerId} does not belong to user ${userId}`,
        );
      }

      if (!tracker.isActive || tracker.isDeleted) {
        throw new PlayerValidationException(
          `Tracker ${trackerId} is not active`,
        );
      }
    } catch (error) {
      if (error instanceof PlayerValidationException) {
        throw error;
      }
      throw new PlayerValidationException(`Tracker ${trackerId} not found`);
    }
  }

  /**
   * Validate guild membership prerequisite
   * Single Responsibility: Guild membership validation
   */
  async validateGuildMembership(userId: string, guildId: string): Promise<void> {
    try {
      await this.guildMembersService.findOne(userId, guildId);
    } catch (error) {
      throw new PlayerValidationException(
        `User ${userId} is not a member of guild ${guildId}`,
      );
    }
  }

  /**
   * Validate cooldown period
   * Single Responsibility: Cooldown validation
   */
  validateCooldown(
    lastLeftLeagueAt: Date | null | undefined,
    cooldownDays: number | null | undefined,
  ): void {
    if (!lastLeftLeagueAt || !cooldownDays || cooldownDays <= 0) {
      return; // No cooldown or cooldown expired
    }

    const now = new Date();
    const cooldownEnd = new Date(lastLeftLeagueAt);
    cooldownEnd.setDate(cooldownEnd.getDate() + cooldownDays);

    if (now < cooldownEnd) {
      const daysRemaining = Math.ceil((cooldownEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      throw new PlayerValidationException(
        `Player is in cooldown period. ${daysRemaining} day(s) remaining.`,
      );
    }
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
      include: { primaryTracker: true },
    });

    if (!player) {
      throw new PlayerValidationException(`Player ${playerId} not found`);
    }

    // Validate status
    this.validatePlayerStatus(player.status);

    // Validate tracker if required
    if (requireTracker && !player.primaryTrackerId) {
      throw new PlayerValidationException(
        `Player ${playerId} must have a primary tracker`,
      );
    }

    if (player.primaryTrackerId) {
      await this.validateTrackerLink(player.primaryTrackerId, player.userId);
    }
  }
}

