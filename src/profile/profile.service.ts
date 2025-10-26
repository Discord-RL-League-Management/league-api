import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        globalName: true,
        avatar: true,
        email: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    return user;
  }

  async getStats(userId: string) {
    // Placeholder - return mock stats
    return {
      userId,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
    };
  }

  async updateSettings(userId: string, settings: any) {
    // In real app, you'd have a UserSettings model
    return {
      userId,
      settings,
      updated: true,
    };
  }
}
