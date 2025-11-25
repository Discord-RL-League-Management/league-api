import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LeagueSettingsService } from '../../leagues/league-settings.service';
import { LeagueMemberRepository } from '../repositories/league-member.repository';
import { PlayerService } from '../../players/services/player.service';
import { PlayerValidationService } from '../../players/services/player-validation.service';
import { GuildMembersService } from '../../guild-members/guild-members.service';
import { TrackerService } from '../../trackers/services/tracker.service';
import {
  LeagueJoinValidationException,
  LeagueCooldownException,
} from '../exceptions/league-member.exceptions';
import { LeagueConfiguration } from '../../leagues/interfaces/league-settings.interface';

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
  async validateJoin(
    playerId: string,
    leagueId: string,
  ): Promise<void> {
    // Get league settings
    const settings = await this.leagueSettingsService.getSettings(leagueId);
    const membershipConfig = settings.membership;
    const skillConfig = settings.skill;

    // Get player
    const player = await this.playerService.findOne(playerId, {
      includeUser: true,
      includeGuild: true,
      includePrimaryTracker: true,
    });

    // 1. Check requireGuildMembership
    if (membershipConfig.requireGuildMembership) {
      await this.guildMembersService.findOne(player.userId, player.guildId);
    }

    // 2. Check requirePlayerStatus
    if (membershipConfig.requirePlayerStatus) {
      this.playerValidationService.validatePlayerStatus(player.status);
    }

    // 3. Check requireTracker
    if (skillConfig.requireTracker) {
      if (!player.primaryTrackerId) {
        throw new LeagueJoinValidationException(
          'Player must have a primary tracker to join this league',
        );
      }
      await this.playerValidationService.validateTrackerLink(
        player.primaryTrackerId,
        player.userId,
      );
    }

    // 4. Check skillRequirements
    if (membershipConfig.skillRequirements) {
      await this.validateSkillRequirements(
        player,
        membershipConfig.skillRequirements,
      );
    }

    // 5. Check registration window
    this.validateRegistrationWindow(membershipConfig);

    // 6. Check capacity limits
    await this.validateCapacity(leagueId, membershipConfig);

    // 7. Check allowMultipleLeagues
    if (!membershipConfig.allowMultipleLeagues) {
      const existingMemberships = await this.leagueMemberRepository.findByPlayerId(
        playerId,
        { status: 'ACTIVE' },
      );
      if (existingMemberships.total > 0) {
        throw new LeagueJoinValidationException(
          'Player is already a member of another league and multiple leagues are not allowed',
        );
      }
    }

    // 8. Check cooldownAfterLeave
    if (membershipConfig.cooldownAfterLeave && membershipConfig.cooldownAfterLeave > 0) {
      this.playerValidationService.validateCooldown(
        player.lastLeftLeagueAt,
        membershipConfig.cooldownAfterLeave,
      );
    }

    // 9. Check joinMethod and requiresApproval
    if (membershipConfig.joinMethod === 'INVITE_ONLY' || membershipConfig.joinMethod === 'APPLICATION') {
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
    player: any,
    skillRequirements: {
      minSkill?: number;
      maxSkill?: number;
      skillMetric: 'MMR' | 'RANK' | 'ELO' | 'CUSTOM';
    },
  ): Promise<void> {
    if (!player.primaryTrackerId) {
      throw new LeagueJoinValidationException(
        'Player must have a primary tracker to validate skill requirements',
      );
    }

    // Get latest tracker snapshot
    const tracker = await this.trackerService.getTrackerById(player.primaryTrackerId);
    
    // Get latest season data
    const latestSeason = tracker.seasons?.[0];
    if (!latestSeason) {
      throw new LeagueJoinValidationException(
        'Player tracker has no season data',
      );
    }

    // Extract skill value based on metric
    let skillValue: number | null = null;
    
    const playlist2v2 = latestSeason.playlist2v2 as any;
    switch (skillRequirements.skillMetric) {
      case 'MMR':
        // Use 2v2 MMR as default (most common)
        skillValue = playlist2v2?.['mmr'] as number | null;
        break;
      case 'RANK':
        // Extract rank value from season data
        skillValue = playlist2v2?.['rank'] as number | null;
        break;
      case 'ELO':
        skillValue = playlist2v2?.['elo'] as number | null;
        break;
      case 'CUSTOM':
        // Custom metric - would need league-specific logic
        throw new LeagueJoinValidationException(
          'Custom skill metric validation not yet implemented',
        );
    }

    if (skillValue === null || skillValue === undefined) {
      throw new LeagueJoinValidationException(
        `Unable to determine ${skillRequirements.skillMetric} value from tracker`,
      );
    }

    // Validate min/max skill
    if (skillRequirements.minSkill !== undefined && skillValue < skillRequirements.minSkill) {
      throw new LeagueJoinValidationException(
        `Player skill (${skillValue}) is below minimum required (${skillRequirements.minSkill})`,
      );
    }

    if (skillRequirements.maxSkill !== undefined && skillValue > skillRequirements.maxSkill) {
      throw new LeagueJoinValidationException(
        `Player skill (${skillValue}) is above maximum allowed (${skillRequirements.maxSkill})`,
      );
    }
  }

  /**
   * Validate registration window
   * Single Responsibility: Registration window validation
   */
  private validateRegistrationWindow(membershipConfig: any): void {
    if (!membershipConfig.registrationOpen) {
      throw new LeagueJoinValidationException('League registration is currently closed');
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
    membershipConfig: any,
  ): Promise<void> {
    if (membershipConfig.maxPlayers) {
      const activeCount = await this.leagueMemberRepository.countActiveMembers(leagueId);
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

