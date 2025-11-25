import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PlayerLeagueRatingRepository } from '../repositories/player-league-rating.repository';

@Injectable()
export class PlayerLeagueRatingService {
  constructor(
    private repository: PlayerLeagueRatingRepository,
    private prisma: PrismaService,
  ) {}

  async getRating(playerId: string, leagueId: string) {
    return this.repository.findByPlayerAndLeague(playerId, leagueId);
  }

  async getStandings(leagueId: string, limit: number = 10) {
    return this.repository.getStandings(leagueId, limit);
  }

  async updateRating(playerId: string, leagueId: string, rating: any, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    
    // Fetch existing rating to check peak value
    const existing = await client.playerLeagueRating.findUnique({
      where: { playerId_leagueId: { playerId, leagueId } },
    });

    // Determine if we should update peak rating
    const shouldUpdatePeak = 
      rating.currentRating !== undefined &&
      existing &&
      (existing.peakRating === null || Number(rating.currentRating) > Number(existing.peakRating));

    // Use upsert to handle both create and update
    return client.playerLeagueRating.upsert({
      where: { playerId_leagueId: { playerId, leagueId } },
      create: {
        playerId,
        leagueId,
        ratingSystem: rating.ratingSystem || 'DEFAULT',
        currentRating: rating.currentRating || 1000,
        initialRating: rating.initialRating || rating.currentRating || 1000,
        peakRating: rating.currentRating || 1000,
        peakRatingAt: new Date(),
        ratingData: rating.ratingData || {},
        matchesPlayed: rating.matchesPlayed || 0,
        wins: rating.wins || 0,
        losses: rating.losses || 0,
        draws: rating.draws || 0,
        lastMatchId: rating.lastMatchId,
      },
      update: {
        ...(rating.currentRating !== undefined && { currentRating: rating.currentRating }),
        ...(rating.ratingData !== undefined && { ratingData: rating.ratingData }),
        ...(rating.matchesPlayed !== undefined && { matchesPlayed: rating.matchesPlayed }),
        ...(rating.wins !== undefined && { wins: rating.wins }),
        ...(rating.losses !== undefined && { losses: rating.losses }),
        ...(rating.draws !== undefined && { draws: rating.draws }),
        ...(rating.lastMatchId !== undefined && { lastMatchId: rating.lastMatchId }),
        // Update peak rating only if current rating exceeds existing peak
        ...(shouldUpdatePeak && {
          peakRating: rating.currentRating,
          peakRatingAt: new Date(),
        }),
      },
    });
  }
}

