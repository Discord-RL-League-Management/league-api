import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Match } from '@prisma/client';
import { CreateMatchDto } from '../dto/create-match.dto';
import { BaseRepository } from '../../common/repositories/base.repository.interface';

@Injectable()
export class MatchRepository
  implements BaseRepository<Match, CreateMatchDto, any>
{
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.match.findUnique({
      where: { id },
      include: { participants: true },
    });
  }

  async findAll(options?: { page?: number; limit?: number }) {
    const page = options?.page ?? 1;
    const limit = Math.min(options?.limit ?? 50, 100);
    const [data, total] = await Promise.all([
      this.prisma.match.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.match.count(),
    ]);
    return { data, total, page, limit };
  }

  async create(data: CreateMatchDto) {
    return this.prisma.match.create({
      data: {
        leagueId: data.leagueId,
        tournamentId: data.tournamentId,
        round: data.round,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.match.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.prisma.match.delete({ where: { id } });
  }

  async exists(id: string) {
    return (await this.prisma.match.count({ where: { id } })) > 0;
  }
}

