import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { ILeagueSettingsProvider } from '../interfaces/league-settings-provider.interface';
import { LeagueMemberRepository } from '../repositories/league-member.repository';
import { PlayerService } from '../../players/services/player.service';
import { PlayerValidationService } from '../../players/services/player-validation.service';
import { GuildMembersService } from '../../guild-members/guild-members.service';
import { LeagueJoinValidationException } from '../exceptions/league-member.exceptions';
import { Player, PlayerStatus } from '@prisma/client';
import type { ITrackerService } from '../../trackers/interfaces/tracker-service.interface';
import { SkillValidationService } from './skill-validation.service';
import { RegistrationWindowValidator } from './registration-window-validator';
import { CapacityValidator } from './capacity-validator';

/**
 * LeagueJoinValidationService - Single Responsibility: League join validation logic
 *
 * Validates player eligibility to join a league based on league settings.
 */
@Injectable()
export class LeagueJoinValidationService {
  private readonly logger = new Logger(LeagueJoinValidationService.name);

  constructor(
    private prisma: PrismaService,
    @Inject('ILeagueSettingsProvider')
    private leagueSettingsProvider: ILeagueSettingsProvider,
    private leagueMemberRepository: LeagueMemberRepository,
    private playerService: PlayerService,
    private playerValidationService: PlayerValidationService,
    private guildMembersService: GuildMembersService,
    @Inject('ITrackerService') private trackerService: ITrackerService,
    private skillValidationService: SkillValidationService,
    private registrationWindowValidator: RegistrationWindowValidator,
    private capacityValidator: CapacityValidator,
  ) {}

  /**
   * Validate player can join league
   * Single Responsibility: Complete join validation
   */
  async validateJoin(playerId: string, leagueId: string): Promise<void> {
    const settings = await this.leagueSettingsProvider.getSettings(leagueId);
    const membershipConfig = settings.membership;
    const skillConfig = settings.skill;

    const player = (await this.playerService.findOne(playerId, {
      includeUser: true,
      includeGuild: true,
    })) as Player & {
      userId: string;
      guildId: string;
      status: string;
    };

    if (membershipConfig.requireGuildMembership) {
      await this.guildMembersService.findOne(player.userId, player.guildId);
    }

    if (membershipConfig.requirePlayerStatus) {
      this.playerValidationService.validatePlayerStatus(
        player.status as PlayerStatus,
      );
    }

    if (skillConfig.requireTracker) {
      const bestTracker = await this.trackerService.findBestTrackerForUser(
        player.userId,
      );
      if (!bestTracker) {
        throw new LeagueJoinValidationException(
          'Player must have at least one active tracker to join this league',
        );
      }
    }

    if (membershipConfig.skillRequirements) {
      await this.skillValidationService.validateSkillRequirements(
        player,
        membershipConfig.skillRequirements,
      );
    }

    this.registrationWindowValidator.validateRegistrationWindow(
      membershipConfig,
    );

    await this.capacityValidator.validateCapacity(leagueId, membershipConfig);

    if (!membershipConfig.allowMultipleLeagues) {
      const existingMemberships =
        await this.leagueMemberRepository.findByPlayerId(playerId, {
          status: 'ACTIVE',
        });
      if (existingMemberships.total > 0) {
        throw new LeagueJoinValidationException(
          'Player is already a member of another league and multiple leagues are not allowed',
        );
      }
    }

    if (
      membershipConfig.cooldownAfterLeave &&
      membershipConfig.cooldownAfterLeave > 0
    ) {
      this.playerValidationService.validateCooldown(
        player.lastLeftLeagueAt,
        membershipConfig.cooldownAfterLeave,
      );
    }

    if (
      membershipConfig.joinMethod === 'INVITE_ONLY' ||
      membershipConfig.joinMethod === 'APPLICATION'
    ) {
      if (!membershipConfig.allowSelfRegistration) {
        throw new LeagueJoinValidationException(
          'This league does not allow self-registration',
        );
      }
    }
  }
}
