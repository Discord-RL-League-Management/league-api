import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
  Inject,
} from '@nestjs/common';
import { Prisma, LeagueMemberStatus, Player } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateLeagueMemberDto } from '../dto/update-league-member.dto';
import { JoinLeagueDto } from '../dto/join-league.dto';
import { LeagueMemberRepository } from '../repositories/league-member.repository';
import { LeagueJoinValidationService } from './league-join-validation.service';
import { PlayerService } from '../../players/player.service';
import { PlayerRepository } from '../../players/repositories/player.repository';
import type { ILeagueSettingsProvider } from '../../common/interfaces/league-domain/league-settings-provider.interface';
import { ActivityLogService } from '../../infrastructure/activity-log/services/activity-log.service';
import { PlayerLeagueRatingService } from '../../player-ratings/services/player-league-rating.service';
import { LeagueRepository } from '../../leagues/repositories/league.repository';
import {
  LeagueMemberNotFoundException,
  LeagueMemberAlreadyExistsException,
} from '../exceptions/league-member.exceptions';
import { LeagueMemberQueryOptions } from '../interfaces/league-member.interface';

/**
 * LeagueMemberService - Business logic layer for LeagueMember operations
 * Single Responsibility: Orchestrates league member-related business logic
 *
 * Uses LeagueMemberRepository for data access, keeping concerns separated.
 * This service handles business rules and validation logic.
 */
@Injectable()
export class LeagueMemberService {
  private readonly logger = new Logger(LeagueMemberService.name);

  constructor(
    private leagueMemberRepository: LeagueMemberRepository,
    private joinValidationService: LeagueJoinValidationService,
    private playerService: PlayerService,
    private playerRepository: PlayerRepository,
    @Inject('ILeagueSettingsProvider')
    private leagueSettingsProvider: ILeagueSettingsProvider,
    private leagueRepository: LeagueRepository,
    private prisma: PrismaService,
    private activityLogService: ActivityLogService,
    private ratingService: PlayerLeagueRatingService,
  ) {}

  /**
   * Find league member by ID
   */
  async findOne(id: string, options?: LeagueMemberQueryOptions): Promise<any> {
    const member = await this.leagueMemberRepository.findById(id, options);
    if (!member) {
      throw new LeagueMemberNotFoundException(id);
    }
    return member;
  }

  /**
   * Find league member by player and league (composite key)
   */
  async findByPlayerAndLeague(
    playerId: string,
    leagueId: string,
    options?: LeagueMemberQueryOptions,
  ): Promise<Record<string, unknown> | null> {
    return this.leagueMemberRepository.findByPlayerAndLeague(
      playerId,
      leagueId,
      options,
    );
  }

  /**
   * Find all members in a league
   */
  async findByLeagueId(
    leagueId: string,
    options?: LeagueMemberQueryOptions,
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    return this.leagueMemberRepository.findByLeagueId(leagueId, options);
  }

  /**
   * Find all league memberships for a player
   */
  async findByPlayerId(
    playerId: string,
    options?: LeagueMemberQueryOptions,
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    return this.leagueMemberRepository.findByPlayerId(playerId, options);
  }

  /**
   * Join league with full validation
   * Single Responsibility: League join with validation and auto-creation
   */
  async joinLeague(
    leagueId: string,
    joinLeagueDto: JoinLeagueDto,
  ): Promise<any> {
    try {
      const league = await this.leagueRepository.findById(leagueId);

      if (!league) {
        throw new NotFoundException('League', leagueId);
      }

      let player;
      try {
        player = await this.playerService.findOne(joinLeagueDto.playerId);
      } catch {
        player = null;
      }

      let guildPlayer: { id: string };
      if (player) {
        guildPlayer = (await this.playerService.ensurePlayerExists(
          (player as Player & { userId: string }).userId,
          league.guildId,
        )) as { id: string };
      } else {
        throw new NotFoundException('Player', joinLeagueDto.playerId);
      }

      const existing = await this.leagueMemberRepository.findByPlayerAndLeague(
        guildPlayer.id,
        leagueId,
      );

      if (existing) {
        if (existing.status === 'ACTIVE') {
          throw new LeagueMemberAlreadyExistsException(
            guildPlayer.id,
            leagueId,
          );
        }
        // If inactive, validate join eligibility (including cooldown) before reactivating
        await this.joinValidationService.validateJoin(guildPlayer.id, leagueId);
        return this.leagueMemberRepository.update(existing.id, {
          status: LeagueMemberStatus.ACTIVE,
          leftAt: null,
          notes: joinLeagueDto.notes,
        });
      }

      await this.joinValidationService.validateJoin(guildPlayer.id, leagueId);

      const settings = await this.leagueSettingsProvider.getSettings(leagueId);
      const initialStatus = settings.membership.requiresApproval
        ? LeagueMemberStatus.PENDING_APPROVAL
        : LeagueMemberStatus.ACTIVE;

      return await this.prisma.$transaction(async (tx) => {
        // Double-check in transaction
        const existingInTx =
          await this.leagueMemberRepository.findByPlayerAndLeague(
            guildPlayer.id,
            leagueId,
            undefined,
            tx,
          );

        if (existingInTx) {
          if (existingInTx.status === 'ACTIVE') {
            throw new LeagueMemberAlreadyExistsException(
              guildPlayer.id,
              leagueId,
            );
          }
          return this.leagueMemberRepository.update(
            existingInTx.id,
            {
              status: LeagueMemberStatus.ACTIVE,
              leftAt: null,
              notes: joinLeagueDto.notes,
            },
            tx,
          );
        }

        const member = await this.leagueMemberRepository.create(
          {
            playerId: guildPlayer.id,
            leagueId,
            status: initialStatus,
            role: 'MEMBER',
            notes: joinLeagueDto.notes,
          },
          tx,
        );

        await this.activityLogService.logActivity(
          tx,
          'league_member',
          member.id,
          initialStatus === 'PENDING_APPROVAL'
            ? 'LEAGUE_MEMBER_PENDING'
            : 'LEAGUE_MEMBER_JOINED',
          'create',
          (guildPlayer as Player & { userId: string }).userId,
          league.guildId,
          { status: initialStatus, leagueId },
        );

        if (initialStatus === 'ACTIVE') {
          try {
            await this.ratingService.updateRating(
              guildPlayer.id,
              leagueId,
              {
                ratingSystem: 'DEFAULT',
                currentRating: 1000,
                initialRating: 1000,
                ratingData: {},
                matchesPlayed: 0,
                wins: 0,
                losses: 0,
                draws: 0,
              },
              tx, // Pass transaction client for atomicity
            );
          } catch (error) {
            // Rating initialization failure shouldn't block join
            this.logger.warn(
              `Failed to initialize rating for player ${guildPlayer.id} in league ${leagueId}:`,
              error,
            );
          }
        }

        return member;
      });
    } catch (error) {
      if (
        error instanceof LeagueMemberAlreadyExistsException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new LeagueMemberAlreadyExistsException(
          joinLeagueDto.playerId,
          leagueId,
        );
      }

      this.logger.error('Failed to join league:', error);
      throw new InternalServerErrorException('Failed to join league');
    }
  }

  /**
   * Leave league (handle cooldown)
   * Single Responsibility: League leave with cooldown tracking
   */
  async leaveLeague(
    playerId: string,
    leagueId: string,
  ): Promise<{ id: string; status: string; leftAt: Date | null }> {
    const member = await this.leagueMemberRepository.findByPlayerAndLeague(
      playerId,
      leagueId,
    );

    if (!member) {
      throw new LeagueMemberNotFoundException(`${playerId}-${leagueId}`);
    }

    if (member.status !== 'ACTIVE') {
      throw new LeagueMemberNotFoundException(`${playerId}-${leagueId}`);
    }

    const settings = await this.leagueSettingsProvider.getSettings(leagueId);
    const cooldownDays = settings.membership.cooldownAfterLeave;

    return await this.prisma.$transaction(async (tx) => {
      // Get league and player for activity logging (inside transaction for atomicity)
      const league = await this.leagueRepository.findById(
        leagueId,
        undefined,
        tx,
      );
      const player = await this.playerRepository.findById(
        playerId,
        undefined,
        tx,
      );

      if (!league || !player) {
        throw new LeagueMemberNotFoundException(`${playerId}-${leagueId}`);
      }

      const updatedMember = await this.leagueMemberRepository.update(
        member.id,
        {
          status: LeagueMemberStatus.INACTIVE,
          leftAt: new Date().toISOString(),
        },
        tx,
      );

      if (cooldownDays && cooldownDays > 0) {
        await this.playerRepository.updateCooldown(
          playerId,
          new Date(),
          leagueId,
          tx,
        );
      }

      await this.activityLogService.logActivity(
        tx,
        'league_member',
        member.id,
        'LEAGUE_MEMBER_LEFT',
        'update',
        player.userId,
        league.guildId,
        { status: 'INACTIVE', cooldownDays },
      );

      return updatedMember;
    });
  }

  /**
   * Update membership status
   */
  async update(
    id: string,
    updateLeagueMemberDto: UpdateLeagueMemberDto,
  ): Promise<{
    id: string;
    status: string;
    role: string;
    notes: string | null;
  }> {
    const member = await this.leagueMemberRepository.findById(id);
    if (!member) {
      throw new LeagueMemberNotFoundException(id);
    }

    return this.leagueMemberRepository.update(id, updateLeagueMemberDto);
  }

  /**
   * Approve pending member
   */
  async approveMember(id: string, approvedBy: string): Promise<any> {
    const member = await this.leagueMemberRepository.findById(id, {
      includePlayer: true,
      includeLeague: true,
    });
    if (!member) {
      throw new LeagueMemberNotFoundException(id);
    }

    if (member.status !== LeagueMemberStatus.PENDING_APPROVAL) {
      throw new LeagueMemberNotFoundException(id);
    }

    // Approve with activity logging and rating initialization in transaction
    return await this.prisma.$transaction(async (tx) => {
      const updated = await this.leagueMemberRepository.update(
        id,
        {
          status: LeagueMemberStatus.ACTIVE,
          approvedBy,
        },
        tx,
      );

      // Get player and league for activity logging
      const player = await this.playerRepository.findById(
        member.playerId,
        undefined,
        tx,
      );
      const league = await this.leagueRepository.findById(
        member.leagueId,
        undefined,
        tx,
      );

      if (player && league) {
        await this.activityLogService.logActivity(
          tx,
          'league_member',
          id,
          'LEAGUE_MEMBER_APPROVED',
          'update',
          player.userId,
          league.guildId,
          { approvedBy },
        );
      }

      try {
        await this.ratingService.updateRating(
          member.playerId,
          member.leagueId,
          {
            ratingSystem: 'DEFAULT',
            currentRating: 1000,
            initialRating: 1000,
            ratingData: {},
            matchesPlayed: 0,
            wins: 0,
            losses: 0,
            draws: 0,
          },
          tx, // Pass transaction client for atomicity
        );
      } catch (error) {
        this.logger.warn(
          `Failed to initialize rating for player ${member.playerId} in league ${member.leagueId}:`,
          error,
        );
      }

      return updated;
    });
  }

  /**
   * Reject pending member
   */
  async rejectMember(id: string): Promise<any> {
    const member = await this.leagueMemberRepository.findById(id);
    if (!member) {
      throw new LeagueMemberNotFoundException(id);
    }

    if (member.status !== LeagueMemberStatus.PENDING_APPROVAL) {
      throw new LeagueMemberNotFoundException(id);
    }

    return this.leagueMemberRepository.delete(id);
  }

  /**
   * Delete league member
   */
  async delete(id: string): Promise<any> {
    const member = await this.leagueMemberRepository.findById(id);
    if (!member) {
      throw new LeagueMemberNotFoundException(id);
    }

    return this.leagueMemberRepository.delete(id);
  }

  /**
   * Check if league member exists
   */
  async exists(id: string): Promise<boolean> {
    return this.leagueMemberRepository.exists(id);
  }
}
