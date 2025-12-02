import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MatchParticipant } from '@prisma/client';
import { CreateMatchParticipantDto } from '../dto/create-match-participant.dto';
import { BaseRepository } from '../../common/repositories/base.repository.interface';

@Injectable()
export class MatchParticipantRepository
  implements BaseRepository<MatchParticipant, CreateMatchParticipantDto, any>
{
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.matchParticipant.findUnique({
      where: { id },
      include: { player: true, team: true },
    });
  }

  async findAll(options?: { page?: number; limit?: number }) {
    const page = options?.page ?? 1;
    const limit = Math.min(options?.limit ?? 50, 100);
    const [data, total] = await Promise.all([
      this.prisma.matchParticipant.findMany({
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.matchParticipant.count(),
    ]);
    return { data, total, page, limit };
  }

  async create(data: CreateMatchParticipantDto & { matchId: string }) {
    return this.prisma.matchParticipant.create({
      data: {
        matchId: data.matchId,
        playerId: data.playerId,
        teamId: data.teamId,
        teamMemberId: data.teamMemberId,
        participantType: data.participantType || 'TEAM_MEMBER',
        isWinner: data.isWinner,
        score: data.score,
        goals: data.goals,
        assists: data.assists,
        saves: data.saves,
        shots: data.shots,
        wasSubstitute: data.wasSubstitute || false,
        substituteReason: data.substituteReason,
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.matchParticipant.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.prisma.matchParticipant.delete({ where: { id } });
  }

  async exists(id: string) {
    return (await this.prisma.matchParticipant.count({ where: { id } })) > 0;
  }
}


