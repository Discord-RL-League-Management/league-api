import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { CreateGuildMemberDto } from './dto/create-guild-member.dto';
import { UpdateGuildMemberDto } from './dto/update-guild-member.dto';
import { GuildMemberRepository } from './repositories/guild-member.repository';
import { GuildMemberQueryService } from './services/guild-member-query.service';
import { GuildMemberStatisticsService } from './services/guild-member-statistics.service';
import { GuildMemberSyncService } from './services/guild-member-sync.service';

/**
 * GuildMembersService - Business logic layer for GuildMember CRUD operations
 * Single Responsibility: Orchestrates guild member entity lifecycle management
 * 
 * Uses GuildMemberRepository for data access, keeping concerns separated.
 * Delegates to specialized services for queries, statistics, and sync operations.
 */
@Injectable()
export class GuildMembersService {
  private readonly logger = new Logger(GuildMembersService.name);

  constructor(
    private guildMemberRepository: GuildMemberRepository,
    private usersService: UsersService,
    private guildMemberQueryService: GuildMemberQueryService,
    private guildMemberStatisticsService: GuildMemberStatisticsService,
    private guildMemberSyncService: GuildMemberSyncService,
  ) {}

  /**
   * Create or update guild member with validation
   * Single Responsibility: Member data management with conflict resolution
   */
  async create(createGuildMemberDto: CreateGuildMemberDto) {
    try {
      // Validate user exists
      const userExists = await this.usersService.exists(createGuildMemberDto.userId);
      if (!userExists) {
        throw new NotFoundException(
          `User ${createGuildMemberDto.userId} not found`,
        );
      }

      return await this.guildMemberRepository.upsert(createGuildMemberDto);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      // Handle Prisma foreign key constraint errors
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new NotFoundException(
          `Guild ${createGuildMemberDto.guildId} not found`,
        );
      }
      this.logger.error(
        `Failed to create guild member ${createGuildMemberDto.userId}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to create guild member');
    }
  }

  /**
   * Find all members in a guild with pagination
   * Single Responsibility: Delegate to query service
   */
  async findAll(guildId: string, page: number = 1, limit: number = 50) {
    return this.guildMemberQueryService.findAll(guildId, page, limit);
  }

  /**
   * Find specific member in guild with validation
   * Single Responsibility: Single member retrieval with error handling
   */
  async findOne(userId: string, guildId: string) {
    try {
      const member = await this.guildMemberRepository.findByCompositeKey(
        userId,
        guildId,
        {
          user: true,
        },
      );

      if (!member) {
        throw new NotFoundException(
          `Member ${userId} not found in guild ${guildId}`,
        );
      }

      return member;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to fetch member ${userId} in guild ${guildId}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to fetch guild member');
    }
  }

  /**
   * Update guild member with validation
   * Single Responsibility: Member data updates with error handling
   */
  async update(
    userId: string,
    guildId: string,
    updateGuildMemberDto: UpdateGuildMemberDto,
  ) {
    try {
      // Check if member exists
      const exists = await this.guildMemberRepository.existsByCompositeKey(userId, guildId);

      if (!exists) {
        throw new NotFoundException(
          `Member ${userId} not found in guild ${guildId}`,
        );
      }

      return await this.guildMemberRepository.updateByCompositeKey(
        userId,
        guildId,
        updateGuildMemberDto,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to update member ${userId} in guild ${guildId}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to update guild member');
    }
  }

  /**
   * Remove member from guild with validation
   * Single Responsibility: Member removal with error handling
   */
  async remove(userId: string, guildId: string) {
    try {
      // Check if member exists
      const exists = await this.guildMemberRepository.existsByCompositeKey(userId, guildId);

      if (!exists) {
        throw new NotFoundException(
          `Member ${userId} not found in guild ${guildId}`,
        );
      }

      await this.guildMemberRepository.deleteByCompositeKey(userId, guildId);

      this.logger.log(`Removed member ${userId} from guild ${guildId}`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to remove member ${userId} from guild ${guildId}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to remove guild member');
    }
  }

  /**
   * Get user's guild memberships with validation
   * Single Responsibility: Delegate to query service
   */
  async getUserGuilds(userId: string) {
    return this.guildMemberQueryService.getUserGuilds(userId);
  }

  /**
   * Sync all guild members (bulk operation)
   * Single Responsibility: Delegate to sync service
   */
  async syncGuildMembers(
    guildId: string,
    members: Array<{
      userId: string;
      username: string;
      roles: string[];
    }>,
  ) {
    return this.guildMemberSyncService.syncGuildMembers(guildId, members);
  }

  /**
   * Find member with guild settings included
   * Single Responsibility: Delegate to query service
   */
  async findMemberWithGuildSettings(userId: string, guildId: string) {
    return this.guildMemberQueryService.findMemberWithGuildSettings(
      userId,
      guildId,
    );
  }

  /**
   * Find all memberships for a user with guild data
   * Single Responsibility: Delegate to query service
   */
  async findMembersByUser(userId: string) {
    return this.guildMemberQueryService.findMembersByUser(userId);
  }

  /**
   * Update member roles only
   * Single Responsibility: Delegate to sync service
   */
  async updateMemberRoles(userId: string, guildId: string, roles: string[]) {
    return this.guildMemberSyncService.updateMemberRoles(userId, guildId, roles);
  }

  /**
   * Count members with specific roles
   * Single Responsibility: Delegate to statistics service
   */
  async countMembersWithRoles(guildId: string, roleIds: string[]): Promise<number> {
    return this.guildMemberStatisticsService.countMembersWithRoles(
      guildId,
      roleIds,
    );
  }

  /**
   * Search guild members by username
   * Single Responsibility: Delegate to query service
   */
  async searchMembers(guildId: string, query: string, page: number = 1, limit: number = 20) {
    return this.guildMemberQueryService.searchMembers(guildId, query, page, limit);
  }

  /**
   * Get guild member statistics
   * Single Responsibility: Delegate to statistics service
   */
  async getMemberStats(guildId: string) {
    return this.guildMemberStatisticsService.getMemberStats(guildId);
  }
}
