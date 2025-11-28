import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { User } from '@prisma/client';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { BaseRepository } from '../../common/repositories/base.repository.interface';
import { UserTransformer } from '../transformers/user.transformer';

/**
 * UserRepository - Handles all database operations for User entity
 * Single Responsibility: Data access layer for User entity
 *
 * Separates data access concerns from business logic,
 * making services more focused and testable.
 */
@Injectable()
export class UserRepository
  implements BaseRepository<User, CreateUserDto, UpdateUserDto>
{
  constructor(
    private prisma: PrismaService,
    private userTransformer: UserTransformer,
  ) {}

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.userTransformer.transformForRetrieval(user) : null;
  }

  async findAll(options?: {
    page?: number;
    limit?: number;
  }): Promise<{ data: User[]; total: number; page: number; limit: number }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 50;
    const skip = (page - 1) * limit;
    const maxLimit = Math.min(limit, 100);

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: maxLimit,
      }),
      this.prisma.user.count(),
    ]);

    return {
      data: this.userTransformer.transformArrayForRetrieval(users),
      total,
      page,
      limit: maxLimit,
    };
  }

  async create(data: CreateUserDto): Promise<User> {
    const transformed = this.userTransformer.transformForStorage(data);
    const user = await this.prisma.user.create({ data: transformed as any });
    return this.userTransformer.transformForRetrieval(user)!;
  }

  async update(id: string, data: UpdateUserDto): Promise<User> {
    const transformed = this.userTransformer.transformForStorage(data);
    const user = await this.prisma.user.update({
      where: { id },
      data: transformed as any,
    });
    return this.userTransformer.transformForRetrieval(user)!;
  }

  async delete(id: string): Promise<User> {
    const user = await this.prisma.user.delete({ where: { id } });
    return this.userTransformer.transformForRetrieval(user)!;
  }

  async exists(id: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    return !!user;
  }

  /**
   * Get user tokens (access and refresh tokens)
   * Repository-specific method for token retrieval
   */
  async getUserTokens(userId: string): Promise<{
    accessToken: string | null;
    refreshToken: string | null;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { accessToken: true, refreshToken: true },
    });

    if (!user) {
      return { accessToken: null, refreshToken: null };
    }

    const transformed = this.userTransformer.transformForRetrieval(user as any);
    return {
      accessToken: transformed?.accessToken ?? null,
      refreshToken: transformed?.refreshToken ?? null,
    };
  }

  /**
   * Update user tokens
   * Repository-specific method for token updates
   */
  async updateUserTokens(
    userId: string,
    tokens: { accessToken?: string; refreshToken?: string },
  ): Promise<User> {
    const data: any = { updatedAt: new Date() };

    if (tokens.accessToken !== undefined) {
      data.accessToken = tokens.accessToken;
    }

    if (tokens.refreshToken !== undefined) {
      data.refreshToken = tokens.refreshToken || null;
    }

    const transformed = this.userTransformer.transformForStorage(data);
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: transformed,
    });
    return this.userTransformer.transformForRetrieval(user)!;
  }

  /**
   * Get user profile (limited fields)
   * Repository-specific method for profile retrieval
   */
  async getProfile(userId: string): Promise<Partial<User> | null> {
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
}
