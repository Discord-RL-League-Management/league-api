import { Injectable, Inject } from '@nestjs/common';
import { ILoggingService } from '../infrastructure/logging/interfaces/logging.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserNotFoundException } from './exceptions/user.exceptions';
import { UserRepository } from './repositories/user.repository';
import { User } from '@prisma/client';

/**
 * UsersService - Business logic layer for User operations
 * Single Responsibility: Orchestrates user-related business logic
 *
 * Uses UserRepository for data access, keeping concerns separated.
 * This service handles business rules and validation logic.
 */
@Injectable()
export class UsersService {
  private readonly serviceName = UsersService.name;

  constructor(
    private userRepository: UserRepository,
    @Inject(ILoggingService)
    private readonly loggingService: ILoggingService,
  ) {}

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new UserNotFoundException(id);
    }
    return user;
  }

  /**
   * Find all users with optional pagination
   * Single Responsibility: User retrieval with performance optimization
   */
  async findAll(options?: { page?: number; limit?: number }): Promise<User[]> {
    const result = await this.userRepository.findAll(options);
    return result.data;
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    return this.userRepository.create(createUserDto);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const existing = await this.userRepository.findById(id);
    if (!existing) {
      throw new UserNotFoundException(id);
    }
    return this.userRepository.update(id, updateUserDto);
  }

  async delete(id: string): Promise<User> {
    const existing = await this.userRepository.findById(id);
    if (!existing) {
      throw new UserNotFoundException(id);
    }
    return this.userRepository.delete(id);
  }

  async getUserTokens(userId: string): Promise<{
    accessToken: string | null;
    refreshToken: string | null;
  }> {
    const tokens = await this.userRepository.getUserTokens(userId);
    if (!tokens || (!tokens.accessToken && !tokens.refreshToken)) {
      const exists = await this.userRepository.exists(userId);
      if (!exists) {
        throw new UserNotFoundException(userId);
      }
    }
    return tokens;
  }

  async updateUserTokens(
    userId: string,
    tokens: { accessToken?: string; refreshToken?: string },
  ): Promise<User> {
    const exists = await this.userRepository.exists(userId);
    if (!exists) {
      throw new UserNotFoundException(userId);
    }
    return this.userRepository.updateUserTokens(userId, tokens);
  }

  async getProfile(userId: string): Promise<Partial<User>> {
    const profile = await this.userRepository.getProfile(userId);
    if (!profile) {
      throw new UserNotFoundException(userId);
    }
    return profile;
  }

  async exists(userId: string): Promise<boolean> {
    return this.userRepository.exists(userId);
  }
}
