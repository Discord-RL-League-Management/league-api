import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import type { ILoggingService } from '../../infrastructure/logging/interfaces/logging.interface';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  ITransactionService,
  ITransactionClient,
} from '../../infrastructure/transactions/interfaces/transaction.interface';
import { MatchRepository } from '../repositories/match.repository';
import { MatchParticipantRepository } from '../repositories/match-participant.repository';
import { CreateMatchDto } from '../dto/create-match.dto';
import { CreateMatchParticipantDto } from '../dto/create-match-participant.dto';
import { PlayerLeagueStatsService } from '../../player-stats/services/player-league-stats.service';
import { PlayerLeagueRatingService } from '../../player-ratings/services/player-league-rating.service';
import { MatchStatus, Prisma } from '@prisma/client';

@Injectable()
export class MatchService {
  private readonly serviceName = MatchService.name;

  constructor(
    private matchRepository: MatchRepository,
    private participantRepository: MatchParticipantRepository,
    private prisma: PrismaService,
    private statsService: PlayerLeagueStatsService,
    private ratingService: PlayerLeagueRatingService,
    @Inject('ITransactionService')
    private transactionService: ITransactionService,
    @Inject('ILoggingService')
    private readonly loggingService: ILoggingService,
  ) {}

  async findOne(id: string) {
    return this.matchRepository.findById(id);
  }

  async create(createDto: CreateMatchDto) {
    return this.matchRepository.create(createDto);
  }

  async addParticipant(
    matchId: string,
    participantDto: CreateMatchParticipantDto,
  ) {
    return this.participantRepository.create({ ...participantDto, matchId });
  }

  async updateStatus(id: string, status: string) {
    const match = await this.matchRepository.findById(id);
    if (!match) {
      throw new NotFoundException(`Match with ID ${id} not found`);
    }

    if (
      match.status === 'COMPLETED' ||
      match.status === 'CANCELLED' ||
      match.status === 'FORFEIT'
    ) {
      throw new BadRequestException(
        `Cannot update status of a ${match.status.toLowerCase()} match`,
      );
    }

    return this.matchRepository.update(id, {
      status: status as MatchStatus,
    });
  }

  // Completes match and updates player stats/ratings atomically to maintain data consistency.
  async completeMatch(matchId: string, winnerId?: string) {
    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      throw new NotFoundException(`Match with ID ${matchId} not found`);
    }

    if (match.status === 'COMPLETED') {
      return match;
    }

    const participants = await this.prisma.matchParticipant.findMany({
      where: { matchId },
      include: { player: true },
    });

    const updatedMatch = await this.transactionService.executeTransaction(
      async (tx: ITransactionClient) => {
        const match = (await (
          tx as unknown as {
            match: { update: (args: unknown) => Promise<unknown> };
          }
        ).match.update({
          where: { id: matchId },
          data: {
            status: 'COMPLETED',
            playedAt: new Date(),
            winnerId,
          },
        })) as { id: string; leagueId: string };

        for (const participant of participants) {
          const playerId = participant.playerId;
          const leagueId = match.leagueId;

          // Use atomic increments within transaction to prevent race conditions when multiple matches complete simultaneously.
          await this.statsService.incrementStats(
            playerId,
            leagueId,
            {
              matchesPlayed: 1,
              wins: participant.isWinner ? 1 : 0,
              losses: !participant.isWinner ? 1 : 0,
              draws: 0,
              totalGoals: participant.goals || 0,
              totalAssists: participant.assists || 0,
              totalSaves: participant.saves || 0,
              totalShots: participant.shots || 0,
            },
            tx as unknown as Parameters<
              typeof this.statsService.incrementStats
            >[3],
          );

          // Rating calculation is handled by external service; only update match count to track participation.
          const currentRating = (await (
            tx as unknown as {
              playerLeagueRating: {
                findUnique: (args: unknown) => Promise<unknown>;
              };
            }
          ).playerLeagueRating.findUnique({
            where: { playerId_leagueId: { playerId, leagueId } },
          })) as { matchesPlayed: number; wins: number; losses: number } | null;

          await this.ratingService.updateRating(
            playerId,
            leagueId,
            {
              matchesPlayed: (currentRating?.matchesPlayed || 0) + 1,
              wins: participant.isWinner
                ? (currentRating?.wins || 0) + 1
                : currentRating?.wins || 0,
              losses: !participant.isWinner
                ? (currentRating?.losses || 0) + 1
                : currentRating?.losses || 0,
              draws: 0,
              lastMatchId: matchId,
            },
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            tx as Prisma.TransactionClient,
          );
        }

        return match;
      },
    );

    return updatedMatch;
  }
}
