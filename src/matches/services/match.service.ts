import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MatchRepository } from '../repositories/match.repository';
import { MatchParticipantRepository } from '../repositories/match-participant.repository';
import { CreateMatchDto } from '../dto/create-match.dto';
import { CreateMatchParticipantDto } from '../dto/create-match-participant.dto';
import { PlayerLeagueStatsService } from '../../player-stats/services/player-league-stats.service';
import { PlayerLeagueRatingService } from '../../player-ratings/services/player-league-rating.service';

@Injectable()
export class MatchService {
  private readonly logger = new Logger(MatchService.name);

  constructor(
    private matchRepository: MatchRepository,
    private participantRepository: MatchParticipantRepository,
    private prisma: PrismaService,
    private statsService: PlayerLeagueStatsService,
    private ratingService: PlayerLeagueRatingService,
  ) {}

  async findOne(id: string) {
    return this.matchRepository.findById(id);
  }

  async create(createDto: CreateMatchDto) {
    return this.matchRepository.create(createDto);
  }

  async addParticipant(matchId: string, participantDto: CreateMatchParticipantDto) {
    return this.participantRepository.create({ ...participantDto, matchId });
  }

  async updateStatus(id: string, status: string) {
    return this.matchRepository.update(id, { status });
  }

  /**
   * Complete match and update stats/ratings
   * Single Responsibility: Match completion with stats/rating updates
   */
  async completeMatch(matchId: string, winnerId?: string) {
    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    if (match.status === 'COMPLETED') {
      return match; // Already completed
    }

    // Get all participants
    const participants = await this.prisma.matchParticipant.findMany({
      where: { matchId },
      include: { player: true },
    });

    // Update match status and winner
    const updatedMatch = await this.prisma.$transaction(async (tx) => {
      const match = await tx.match.update({
        where: { id: matchId },
        data: {
          status: 'COMPLETED',
          playedAt: new Date(),
          winnerId,
        },
      });

      // Update stats and ratings for each participant
      for (const participant of participants) {
        const playerId = participant.playerId;
        const leagueId = match.leagueId;

        // Get current stats (within transaction)
        const currentStats = await tx.playerLeagueStats.findUnique({
          where: { playerId_leagueId: { playerId, leagueId } },
        });
        const matchesPlayed = (currentStats?.matchesPlayed || 0) + 1;
        const wins = participant.isWinner ? (currentStats?.wins || 0) + 1 : (currentStats?.wins || 0);
        const losses = !participant.isWinner ? (currentStats?.losses || 0) + 1 : (currentStats?.losses || 0);
        const draws = 0; // TODO: Determine draws based on match result
        const winRate = matchesPlayed > 0 ? wins / matchesPlayed : 0;

        // Update stats (within transaction)
        await this.statsService.updateStats(playerId, leagueId, {
          matchesPlayed,
          wins,
          losses,
          draws,
          winRate,
          totalGoals: (currentStats?.totalGoals || 0) + (participant.goals || 0),
          totalAssists: (currentStats?.totalAssists || 0) + (participant.assists || 0),
          totalSaves: (currentStats?.totalSaves || 0) + (participant.saves || 0),
          totalShots: (currentStats?.totalShots || 0) + (participant.shots || 0),
          avgGoals: matchesPlayed > 0 ? ((currentStats?.totalGoals || 0) + (participant.goals || 0)) / matchesPlayed : 0,
          avgAssists: matchesPlayed > 0 ? ((currentStats?.totalAssists || 0) + (participant.assists || 0)) / matchesPlayed : 0,
          avgSaves: matchesPlayed > 0 ? ((currentStats?.totalSaves || 0) + (participant.saves || 0)) / matchesPlayed : 0,
          lastMatchAt: new Date(),
        }, tx);

        // Update rating (rating calculation is handled by external system, just update match count)
        const currentRating = await tx.playerLeagueRating.findUnique({
          where: { playerId_leagueId: { playerId, leagueId } },
        });
        if (currentRating) {
          await this.ratingService.updateRating(playerId, leagueId, {
            matchesPlayed: (currentRating.matchesPlayed || 0) + 1,
            wins: participant.isWinner ? (currentRating.wins || 0) + 1 : (currentRating.wins || 0),
            losses: !participant.isWinner ? (currentRating.losses || 0) + 1 : (currentRating.losses || 0),
            draws: 0,
            lastMatchId: matchId,
            // Note: currentRating and ratingData should be updated by external rating calculation service
          }, tx);
        }
      }

      return match;
    });

    return updatedMatch;
  }
}

