import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Tournament } from '@prisma/client';
import { CreateTournamentDto } from '../dto/create-tournament.dto';
import { BaseRepository } from '../../common/repositories/base.repository.interface';

@Injectable()
export class TournamentRepository
  implements BaseRepository<Tournament, CreateTournamentDto, any>
{
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.tournament.findUnique({
      where: { id },
      include: { participants: true, matches: true },
    });
  }

  async findAll(options?: { page?: number; limit?: number }) {
    const page = options?.page ?? 1;
    const limit = Math.min(options?.limit ?? 50, 100);
    const [data, total] = await Promise.all([
      this.prisma.tournament.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tournament.count(),
    ]);
    return { data, total, page, limit };
  }

  async create(data: CreateTournamentDto) {
    return this.prisma.tournament.create({
      data: {
        leagueId: data.leagueId,
        name: data.name,
        description: data.description,
        format: data.format,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        maxParticipants: data.maxParticipants,
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.tournament.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.prisma.tournament.delete({ where: { id } });
  }

  async exists(id: string) {
    return (await this.prisma.tournament.count({ where: { id } })) > 0;
  }
}


