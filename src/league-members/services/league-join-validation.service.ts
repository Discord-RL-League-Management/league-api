import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LeagueSettingsService } from '../../leagues/league-settings.service';
import { LeagueMemberRepository } from '../repositories/league-member.repository';
import { PlayerService } from '../../players/services/player.service';
import { PlayerValidationService } from '../../players/services/player-validation.service';
import { GuildMembersService } from '../../guild-members/guild-members.service';
import { TrackerService } from '../../trackers/services/tracker.service';
import { LeagueJoinValidationException } from '../exceptions/league-member.exceptions';
import { PlaylistData } from '../../trackers/interfaces/scraper.interfaces';
import { Player, PlayerStatus } from '@prisma/client';

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
    @Inject(forwardRef(() => LeagueSettingsService))
    private leagueSettingsService: LeagueSettingsService,
    private leagueMemberRepository: LeagueMemberRepository,
    private playerService: PlayerService,
    private playerValidationService: PlayerValidationService,
    private guildMembersService: GuildMembersService,
    private trackerService: TrackerService,
  ) {}

  /**
   * Validate player can join league
   * Single Responsibility: Complete join validation
   */
  async validateJoin(playerId: string, leagueId: string): Promise<void> {
    // Get league settings
    const settings = await this.leagueSettingsService.getSettings(leagueId);
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
      await this.validateSkillRequirements(
        player,
        membershipConfig.skillRequirements,
      );
    }

    this.validateRegistrationWindow(membershipConfig);

    await this.validateCapacity(leagueId, membershipConfig);

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

  /**
   * Validate skill requirements
   * Single Responsibility: Skill validation
   */
  private async validateSkillRequirements(
    player: { userId: string },
    skillRequirements: {
      minSkill?: number;
      maxSkill?: number;
      skillMetric: 'MMR' | 'RANK' | 'ELO' | 'CUSTOM';
    },
  ): Promise<void> {
    const tracker = await this.trackerService.findBestTrackerForUser(
      player.userId,
    );

    if (!tracker) {
      throw new LeagueJoinValidationException(
        'Player must have at least one active tracker with data to validate skill requirements',
      );
    }

    const latestSeason = tracker.seasons?.[0];
    if (!latestSeason) {
      throw new LeagueJoinValidationException(
        'Player tracker has no season data',
      );
    }

    let skillValue: number | null = null;

    const playlist2v2 = latestSeason.playlist2v2 as PlaylistData | null;
    switch (skillRequirements.skillMetric) {
      case 'MMR':
        skillValue = playlist2v2?.rating ?? null;
        break;
      case 'RANK':
        skillValue = playlist2v2?.rankValue ?? null;
        break;
      case 'ELO':
        skillValue = null;
        break;
      case 'CUSTOM':
        throw new LeagueJoinValidationException(
          'Custom skill metric validation not yet implemented',
        );
    }

    if (skillValue === null || skillValue === undefined) {
      throw new LeagueJoinValidationException(
        `Unable to determine ${skillRequirements.skillMetric} value from tracker`,
      );
    }

    if (
      skillRequirements.minSkill !== undefined &&
      skillValue < skillRequirements.minSkill
    ) {
      throw new LeagueJoinValidationException(
        `Player skill (${skillValue}) is below minimum required (${skillRequirements.minSkill})`,
      );
    }

    if (
      skillRequirements.maxSkill !== undefined &&
      skillValue > skillRequirements.maxSkill
    ) {
      throw new LeagueJoinValidationException(
        `Player skill (${skillValue}) is above maximum allowed (${skillRequirements.maxSkill})`,
      );
    }
  }

  /**
   * Validate registration window
   * Single Responsibility: Registration window validation
   */
  private validateRegistrationWindow(membershipConfig: {
    registrationOpen: boolean;
    registrationStartDate?: Date | string | null;
    registrationEndDate?: Date | string | null;
  }): void {
    if (!membershipConfig.registrationOpen) {
      throw new LeagueJoinValidationException(
        'League registration is currently closed',
      );
    }

    const now = new Date();

    if (membershipConfig.registrationStartDate) {
      const startDate = new Date(membershipConfig.registrationStartDate);
      if (now < startDate) {
        throw new LeagueJoinValidationException(
          `Registration opens on ${startDate.toISOString()}`,
        );
      }
    }

    if (membershipConfig.registrationEndDate) {
      const endDate = new Date(membershipConfig.registrationEndDate);
      if (now > endDate) {
        throw new LeagueJoinValidationException(
          `Registration closed on ${endDate.toISOString()}`,
        );
      }
    }
  }

  /**
   * Validate capacity limits
   * Single Responsibility: Capacity validation
   */
  private async validateCapacity(
    leagueId: string,
    membershipConfig: { maxPlayers?: number | null; autoCloseOnFull: boolean },
  ): Promise<void> {
    if (membershipConfig.maxPlayers) {
      const activeCount =
        await this.leagueMemberRepository.countActiveMembers(leagueId);
      if (activeCount >= membershipConfig.maxPlayers) {
        if (membershipConfig.autoCloseOnFull) {
          throw new LeagueJoinValidationException(
            'League is full and registration is closed',
          );
        } else {
          throw new LeagueJoinValidationException(
            `League is full (${activeCount}/${membershipConfig.maxPlayers} players)`,
          );
        }
      }
    }
  }
}
