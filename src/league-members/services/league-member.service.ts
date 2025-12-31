import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Inject,
} from '@nestjs/common';
import { ILoggingService } from '../../infrastructure/logging/interfaces/logging.interface';
import { Prisma, LeagueMemberStatus, Player } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ITransactionService,
  ITransactionClient,
} from '../../infrastructure/transactions/interfaces/transaction.interface';
import { UpdateLeagueMemberDto } from '../dto/update-league-member.dto';
import { JoinLeagueDto } from '../dto/join-league.dto';
import { LeagueMemberRepository } from '../repositories/league-member.repository';
import { LeagueJoinValidationService } from './league-join-validation.service';
import { PlayerService } from '../../players/services/player.service';
import { ILeagueSettingsProvider } from '../interfaces/league-settings-provider.interface';
import { ActivityLogService } from '../../infrastructure/activity-log/services/activity-log.service';
import { PlayerLeagueRatingService } from '../../player-ratings/services/player-league-rating.service';
import {
  LeagueMemberNotFoundException,
  LeagueMemberAlreadyExistsException,
} from '../exceptions/league-member.exceptions';
import { LeagueMemberQueryOptions } from '../interfaces/league-member.interface';

/**
 * LeagueMemberService - Business logic layer for LeagueMember operations
 *
 * Uses LeagueMemberRepository for data access, keeping concerns separated.
 * This service handles business rules and validation logic.
 */
@Injectable()
export class LeagueMemberService {
  private readonly serviceName = LeagueMemberService.name;

  constructor(
    private leagueMemberRepository: LeagueMemberRepository,
    private joinValidationService: LeagueJoinValidationService,
    private playerService: PlayerService,
    @Inject(ILeagueSettingsProvider)
    private leagueSettingsProvider: ILeagueSettingsProvider,
    private prisma: PrismaService,
    private activityLogService: ActivityLogService,
    private ratingService: PlayerLeagueRatingService,
    @Inject(ILoggingService)
    private readonly loggingService: ILoggingService,
    @Inject(ITransactionService)
    private readonly transactionService: ITransactionService,
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
   */
  async joinLeague(
    leagueId: string,
    joinLeagueDto: JoinLeagueDto,
  ): Promise<any> {
    try {
      const league = await this.prisma.league.findUnique({
        where: { id: leagueId },
      });

      if (!league) {
        throw new NotFoundException('League', leagueId);
      }

      let player;
      try {
        player = await this.playerService.findOne(joinLeagueDto.playerId);
      } catch {
        // If player doesn't exist, we'll create it below
        player = null;
      }

      let guildPlayer: { id: string };
      if (player) {
        guildPlayer = (await this.playerService.ensurePlayerExists(
          (player as Player & { userId: string }).userId,
          league.guildId,
        )) as { id: string };
      } else {
        // Player doesn't exist - this shouldn't happen if playerId is provided
        // For now, throw error - we'll need to update the DTO to include userId
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

      return await this.transactionService.executeTransaction(
        async (tx: ITransactionClient) => {
          // Double-check in transaction
          const existingInTx = await (
            tx as Prisma.TransactionClient
          ).leagueMember.findUnique({
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
            return (tx as Prisma.TransactionClient).leagueMember.update({
              where: { id: existingInTx.id },
              data: {
                status: LeagueMemberStatus.ACTIVE,
                leftAt: null,
                notes: joinLeagueDto.notes,
              },
            });
          }

          const member = await (
            tx as Prisma.TransactionClient
          ).leagueMember.create({
            data: {
              playerId: guildPlayer.id,
              leagueId,
              status: initialStatus,
              role: 'MEMBER',
              notes: joinLeagueDto.notes,
            },
          });

          await this.activityLogService.logActivity(
            tx as Prisma.TransactionClient,
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
                tx as Prisma.TransactionClient, // Pass transaction client for atomicity
              );
            } catch (error) {
              // Rating initialization failure shouldn't block join
              this.loggingService.warn(
                `Failed to initialize rating for player ${guildPlayer.id} in league ${leagueId}: ${error instanceof Error ? error.message : String(error)}`,
                this.serviceName,
              );
            }
          }

          return member;
        },
      );
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

      this.loggingService.error(
        `Failed to join league: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      throw new InternalServerErrorException('Failed to join league');
    }
  }

  /**
   * Leave league (handle cooldown)
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

    return await this.transactionService.executeTransaction(
      async (tx: ITransactionClient) => {
        // Get league and player for activity logging (inside transaction for atomicity)
        const league = await (tx as Prisma.TransactionClient).league.findUnique(
          {
            where: { id: leagueId },
          },
        );
        const player = await (tx as Prisma.TransactionClient).player.findUnique(
          {
            where: { id: playerId },
          },
        );

        if (!league || !player) {
          throw new LeagueMemberNotFoundException(`${playerId}-${leagueId}`);
        }

        const updatedMember = await (
          tx as Prisma.TransactionClient
        ).leagueMember.update({
          where: { id: member.id },
          data: {
            status: LeagueMemberStatus.INACTIVE,
            leftAt: new Date(),
          },
        });

        if (cooldownDays && cooldownDays > 0) {
          await (tx as Prisma.TransactionClient).player.update({
            where: { id: playerId },
            data: {
              lastLeftLeagueAt: new Date(),
              lastLeftLeagueId: leagueId,
            },
          });
        }

        await this.activityLogService.logActivity(
          tx as Prisma.TransactionClient,
          'league_member',
          member.id,
          'LEAGUE_MEMBER_LEFT',
          'update',
          player.userId,
          league.guildId,
          { status: 'INACTIVE', cooldownDays },
        );

        return updatedMember;
      },
    );
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
    return await this.transactionService.executeTransaction(
      async (tx: ITransactionClient) => {
        const updated = await (
          tx as Prisma.TransactionClient
        ).leagueMember.update({
          where: { id },
          data: {
            status: LeagueMemberStatus.ACTIVE,
            approvedBy,
            approvedAt: new Date(),
          },
        });

        const player = await (tx as Prisma.TransactionClient).player.findUnique(
          {
            where: { id: member.playerId },
          },
        );
        const league = await (tx as Prisma.TransactionClient).league.findUnique(
          {
            where: { id: member.leagueId },
          },
        );

        if (player && league) {
          await this.activityLogService.logActivity(
            tx as Prisma.TransactionClient,
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
            tx as Prisma.TransactionClient, // Pass transaction client for atomicity
          );
        } catch (error) {
          this.loggingService.warn(
            `Failed to initialize rating for player ${member.playerId} in league ${member.leagueId}: ${error instanceof Error ? error.message : String(error)}`,
            this.serviceName,
          );
        }

        return updated;
      },
    );
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
