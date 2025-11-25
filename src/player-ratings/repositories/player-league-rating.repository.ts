import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, PlayerLeagueRating } from '@prisma/client';

@Injectable()
export class PlayerLeagueRatingRepository {
  constructor(private prisma: PrismaService) {}

  async findByPlayerAndLeague(playerId: string, leagueId: string) {
    return this.prisma.playerLeagueRating.findUnique({
      where: { playerId_leagueId: { playerId, leagueId } },
    });
  }

  async upsert(playerId: string, leagueId: string, data: Partial<PlayerLeagueRating>, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    const { playerId: _, leagueId: __, ...updateData } = data;
    return client.playerLeagueRating.upsert({
      where: { playerId_leagueId: { playerId, leagueId } },
      create: { playerId, leagueId, ...data } as any,
      update: updateData as any,
    });
  }

  async getStandings(leagueId: string, limit: number = 10) {
    return this.prisma.playerLeagueRating.findMany({
      where: { leagueId },
      orderBy: { currentRating: 'desc' },
      take: limit,
      include: { player: true },
    });
  }
}

