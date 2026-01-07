import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
  Inject,
} from '@nestjs/common';
import {
  Prisma,
  LeagueMemberStatus,
  Player,
  LeagueMember,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateLeagueMemberDto } from '../dto/update-league-member.dto';
import { JoinLeagueDto } from '../dto/join-league.dto';
import { LeagueMemberRepository } from '../repositories/league-member.repository';
import { LeagueJoinValidationService } from './league-join-validation.service';
import { PlayerService } from '../../players/player.service';
import { PlayerRepository } from '../../players/repositories/player.repository';
import { PlayerNotFoundException } from '../../players/exceptions/player.exceptions';
import type { ILeagueSettingsProvider } from '../../common/interfaces/league-domain/league-settings-provider.interface';
import { ILEAGUE_SETTINGS_PROVIDER } from '../../common/tokens/injection.tokens';
import { ActivityLogService } from '../../infrastructure/activity-log/services/activity-log.service';
import { PlayerLeagueRatingService } from '../../player-ratings/services/player-league-rating.service';
import { LeagueRepository } from '../../leagues/repositories/league.repository';
import {
  LeagueMemberNotFoundException,
  LeagueMemberAlreadyExistsException,
  InvalidLeagueMemberStatusException,
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
    @Inject(ILEAGUE_SETTINGS_PROVIDER)
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
   * Single Responsibility: League join orchestration
   */
  async joinLeague(
    leagueId: string,
    joinLeagueDto: JoinLeagueDto,
  ): Promise<any> {
    try {
      const league = await this.validateLeagueExists(leagueId);
      const guildPlayer = await this.resolvePlayer(
        joinLeagueDto.playerId,
        league.guildId,
      );

      const existing = await this.leagueMemberRepository.findByPlayerAndLeague(
        guildPlayer.id,
        leagueId,
      );

      if (existing) {
        return await this.handleExistingMember(
          existing,
          guildPlayer.id,
          leagueId,
          joinLeagueDto.notes,
        );
      }

      await this.joinValidationService.validateJoin(guildPlayer.id, leagueId);
      const initialStatus = await this.determineInitialStatus(leagueId);

      return await this.createNewMemberInTransaction(
        guildPlayer,
        leagueId,
        initialStatus,
        joinLeagueDto.notes,
        league.guildId,
      );
    } catch (error) {
      this.handleJoinError(error, joinLeagueDto.playerId, leagueId);
    }
  }

  /**
   * Validate league exists
   * Single Responsibility: League existence validation
   */
  private async validateLeagueExists(leagueId: string) {
    const league = await this.leagueRepository.findById(leagueId);
    if (!league) {
      throw new NotFoundException('League', leagueId);
    }
    return league;
  }

  /**
   * Resolve player and ensure exists in guild
   * Single Responsibility: Player resolution and guild membership
   */
  private async resolvePlayer(
    playerId: string,
    guildId: string,
  ): Promise<{ id: string; userId: string }> {
    let player = null;
    try {
      player = await this.playerService.findOne(playerId);
    } catch (error) {
      // Only catch PlayerNotFoundException - re-throw unexpected errors
      if (!(error instanceof PlayerNotFoundException)) {
        throw error;
      }
    }

    if (!player) {
      throw new NotFoundException('Player', playerId);
    }

    const guildPlayer = await this.playerService.ensurePlayerExists(
      (player as Player & { userId: string }).userId,
      guildId,
    );

    return { id: guildPlayer.id, userId: guildPlayer.userId };
  }

  /**
   * Handle existing member reactivation
   * Single Responsibility: Existing member reactivation logic
   */
  private async handleExistingMember(
    existing: LeagueMember,
    playerId: string,
    leagueId: string,
    notes?: string | null,
  ) {
    if (existing.status === 'ACTIVE') {
      throw new LeagueMemberAlreadyExistsException(playerId, leagueId);
    }

    // Prevent reactivation from terminal states
    if (
      existing.status === LeagueMemberStatus.SUSPENDED ||
      existing.status === LeagueMemberStatus.BANNED
    ) {
      throw new InvalidLeagueMemberStatusException(
        `Cannot reactivate member with status '${existing.status}'. Terminal states (SUSPENDED, BANNED) cannot be reactivated.`,
      );
    }

    await this.joinValidationService.validateJoin(playerId, leagueId);

    return this.leagueMemberRepository.update(existing.id, {
      status: LeagueMemberStatus.ACTIVE,
      leftAt: null,
      notes: notes ?? undefined,
    });
  }

  /**
   * Determine initial member status based on league settings
   * Single Responsibility: Status determination
   */
  private async determineInitialStatus(
    leagueId: string,
  ): Promise<LeagueMemberStatus> {
    const settings = await this.leagueSettingsProvider.getSettings(leagueId);
    return settings.membership.requiresApproval
      ? LeagueMemberStatus.PENDING_APPROVAL
      : LeagueMemberStatus.ACTIVE;
  }

  /**
   * Create new member in transaction
   * Single Responsibility: Atomic member creation with logging and rating
   */
  private async createNewMemberInTransaction(
    guildPlayer: { id: string; userId: string },
    leagueId: string,
    initialStatus: LeagueMemberStatus,
    notes: string | null | undefined,
    guildId: string,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      // Double-check in transaction to prevent race condition
      const existingInTx =
        await this.leagueMemberRepository.findByPlayerAndLeague(
          guildPlayer.id,
          leagueId,
          undefined,
          tx,
        );

      if (existingInTx) {
        return await this.reactivateMemberInTransaction(
          existingInTx,
          guildPlayer.id,
          leagueId,
          notes,
          tx,
        );
      }

      const member = await this.leagueMemberRepository.create(
        {
          playerId: guildPlayer.id,
          leagueId,
          status: initialStatus,
          role: 'MEMBER',
          notes: notes ?? undefined,
        },
        tx,
      );

      await this.logMemberActivity(
        member.id,
        initialStatus,
        guildPlayer.userId,
        guildId,
        leagueId,
        tx,
      );

      if (initialStatus === 'ACTIVE') {
        await this.initializeRatingForMember(guildPlayer.id, leagueId, tx);
      }

      return member;
    });
  }

  /**
   * Reactivate existing member in transaction
   * Single Responsibility: Member reactivation in transaction context
   */
  private async reactivateMemberInTransaction(
    existingInTx: LeagueMember,
    playerId: string,
    leagueId: string,
    notes: string | null | undefined,
    tx: Prisma.TransactionClient,
  ) {
    if (existingInTx.status === 'ACTIVE') {
      throw new LeagueMemberAlreadyExistsException(playerId, leagueId);
    }

    // Prevent reactivation from terminal states
    if (
      existingInTx.status === LeagueMemberStatus.SUSPENDED ||
      existingInTx.status === LeagueMemberStatus.BANNED
    ) {
      throw new InvalidLeagueMemberStatusException(
        `Cannot reactivate member with status '${existingInTx.status}'. Terminal states (SUSPENDED, BANNED) cannot be reactivated.`,
      );
    }

    return await this.leagueMemberRepository.update(
      existingInTx.id,
      {
        status: LeagueMemberStatus.ACTIVE,
        leftAt: null,
        notes: notes ?? undefined,
      },
      tx,
    );
  }

  /**
   * Log member activity
   * Single Responsibility: Activity logging
   */
  private async logMemberActivity(
    memberId: string,
    status: LeagueMemberStatus,
    userId: string,
    guildId: string,
    leagueId: string,
    tx: Prisma.TransactionClient,
  ) {
    const activityType =
      status === 'PENDING_APPROVAL'
        ? 'LEAGUE_MEMBER_PENDING'
        : 'LEAGUE_MEMBER_JOINED';

    await this.activityLogService.logActivity(
      tx,
      'league_member',
      memberId,
      activityType,
      'create',
      userId,
      guildId,
      { status, leagueId },
    );
  }

  /**
   * Initialize rating for new member
   * Single Responsibility: Rating initialization
   */
  private async initializeRatingForMember(
    playerId: string,
    leagueId: string,
    tx: Prisma.TransactionClient,
  ) {
    try {
      await this.ratingService.updateRating(
        playerId,
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
        tx,
      );
    } catch (error) {
      // Rating initialization failure shouldn't block join
      this.logger.warn(
        `Failed to initialize rating for player ${playerId} in league ${leagueId}:`,
        error,
      );
    }
  }

  /**
   * Handle join errors
   * Single Responsibility: Error handling and transformation
   */
  private handleJoinError(
    error: unknown,
    playerId: string,
    leagueId: string,
  ): never {
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
      throw new LeagueMemberAlreadyExistsException(playerId, leagueId);
    }

    this.logger.error('Failed to join league:', error);
    throw new InternalServerErrorException('Failed to join league');
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

    return await this.prisma.$transaction(async (tx) => {
      const updated = await this.leagueMemberRepository.update(
        id,
        {
          status: LeagueMemberStatus.ACTIVE,
          approvedBy,
        },
        tx,
      );

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
          tx,
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
