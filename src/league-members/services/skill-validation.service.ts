import { Injectable, Logger, Inject } from '@nestjs/common';
import type { ITrackerService } from '../../trackers/interfaces/tracker-service.interface';
import { LeagueJoinValidationException } from '../exceptions/league-member.exceptions';
import { PlaylistData } from '../../trackers/interfaces/scraper.interfaces';

/**
 * SkillValidationService - Single Responsibility: Skill requirement validation
 *
 * Validates player skill requirements against league settings.
 */
@Injectable()
export class SkillValidationService {
  private readonly logger = new Logger(SkillValidationService.name);

  constructor(
    @Inject('ITrackerService') private trackerService: ITrackerService,
  ) {}

  /**
   * Validate skill requirements
   * Single Responsibility: Skill validation
   *
   * @param player - Player with userId
   * @param skillRequirements - Skill requirements configuration
   * @throws LeagueJoinValidationException if requirements not met
   */
  async validateSkillRequirements(
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

    if (skillValue === null) {
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
}
