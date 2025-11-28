import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Prisma, LeagueMemberStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLeagueMemberDto } from '../dto/create-league-member.dto';
import { UpdateLeagueMemberDto } from '../dto/update-league-member.dto';
import { JoinLeagueDto } from '../dto/join-league.dto';
import { LeagueMemberRepository } from '../repositories/league-member.repository';
import { LeagueJoinValidationService } from './league-join-validation.service';
import { PlayerService } from '../../players/services/player.service';
import { LeagueSettingsService } from '../../leagues/league-settings.service';
import { ActivityLogService } from '../../infrastructure/activity-log/services/activity-log.service';
import { PlayerLeagueRatingService } from '../../player-ratings/services/player-league-rating.service';
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
    @Inject(forwardRef(() => LeagueSettingsService))
    private leagueSettingsService: LeagueSettingsService,
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
  ): Promise<any | null> {
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
      // Get league to get guildId
      const league = await this.prisma.league.findUnique({
        where: { id: leagueId },
      });

      if (!league) {
        throw new NotFoundException('League', leagueId);
      }

      // Get player - if playerId is provided, use it; otherwise we'll need userId
      // For now, assume playerId is a CUID
      let player;
      try {
        player = await this.playerService.findOne(joinLeagueDto.playerId);
      } catch (error) {
        // If player doesn't exist, we'll create it below
        player = null;
      }

      // Ensure player exists for this guild (auto-create if needed)
      // If player doesn't exist, we need userId - for now, assume joinLeagueDto has userId
      // TODO: Update JoinLeagueDto to include userId or handle player creation differently
      let guildPlayer;
      if (player) {
        guildPlayer = await this.playerService.ensurePlayerExists(
          player.userId,
          league.guildId,
        );
      } else {
        // Player doesn't exist - this shouldn't happen if playerId is provided
        // For now, throw error - we'll need to update the DTO to include userId
        throw new NotFoundException('Player', joinLeagueDto.playerId);
      }

      // Check if already a member
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
        // Reactivate
        return this.leagueMemberRepository.update(existing.id, {
          status: LeagueMemberStatus.ACTIVE,
          leftAt: null,
          notes: joinLeagueDto.notes,
        });
      }

      // Validate join eligibility for new members
      await this.joinValidationService.validateJoin(guildPlayer.id, leagueId);

      // Get league settings to determine initial status
      const settings = await this.leagueSettingsService.getSettings(leagueId);
      const initialStatus = settings.membership.requiresApproval
        ? LeagueMemberStatus.PENDING_APPROVAL
        : LeagueMemberStatus.ACTIVE;

      // Create league member in transaction
      return await this.prisma.$transaction(async (tx) => {
        // Double-check in transaction
        const existingInTx = await tx.leagueMember.findUnique({
          where: {
            playerId_leagueId: {
              playerId: guildPlayer.id,
              leagueId,
            },
          },
        });

        if (existingInTx) {
          if (existingInTx.status === 'ACTIVE') {
            throw new LeagueMemberAlreadyExistsException(
              guildPlayer.id,
              leagueId,
            );
          }
          return tx.leagueMember.update({
            where: { id: existingInTx.id },
            data: {
              status: LeagueMemberStatus.ACTIVE,
              leftAt: null,
              notes: joinLeagueDto.notes,
            },
          });
        }

        const member = await tx.leagueMember.create({
          data: {
            playerId: guildPlayer.id,
            leagueId,
            status: initialStatus,
            role: 'MEMBER',
            notes: joinLeagueDto.notes,
          },
        });

        // Log activity
        await this.activityLogService.logActivity(
          tx,
          'league_member',
          member.id,
          initialStatus === 'PENDING_APPROVAL'
            ? 'LEAGUE_MEMBER_PENDING'
            : 'LEAGUE_MEMBER_JOINED',
          'create',
          guildPlayer.userId,
          league.guildId,
          { status: initialStatus, leagueId },
        );

        // Initialize rating if member is active
        if (initialStatus === 'ACTIVE') {
          try {
            await this.ratingService.updateRating(
              guildPlayer.id,
              leagueId,
              {
                ratingSystem: 'DEFAULT',
                currentRating: 1000, // Default starting rating
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

      // Handle Prisma unique constraint errors
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
  async leaveLeague(playerId: string, leagueId: string): Promise<any> {
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

    // Get league settings for cooldown
    const settings = await this.leagueSettingsService.getSettings(leagueId);
    const cooldownDays = settings.membership.cooldownAfterLeave;

    // Update member and player cooldown in transaction
    return await this.prisma.$transaction(async (tx) => {
      // Get league and player for activity logging (inside transaction for atomicity)
      const league = await tx.league.findUnique({ where: { id: leagueId } });
      const player = await tx.player.findUnique({ where: { id: playerId } });

      if (!league || !player) {
        throw new LeagueMemberNotFoundException(`${playerId}-${leagueId}`);
      }

      // Update member status
      const updatedMember = await tx.leagueMember.update({
        where: { id: member.id },
        data: {
          status: LeagueMemberStatus.INACTIVE,
          leftAt: new Date(),
        },
      });

      // Update player cooldown if needed
      if (cooldownDays && cooldownDays > 0) {
        await tx.player.update({
          where: { id: playerId },
          data: {
            lastLeftLeagueAt: new Date(),
            lastLeftLeagueId: leagueId,
          },
        });
      }

      // Log activity
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
  ): Promise<any> {
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
      const updated = await tx.leagueMember.update({
        where: { id },
        data: {
          status: LeagueMemberStatus.ACTIVE,
          approvedBy,
          approvedAt: new Date(),
        },
      });

      // Get player and league for activity logging
      const player = await tx.player.findUnique({
        where: { id: member.playerId },
      });
      const league = await tx.league.findUnique({
        where: { id: member.leagueId },
      });

      // Log activity
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

      // Initialize rating
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
