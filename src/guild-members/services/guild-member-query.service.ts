import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { GuildMemberRepository } from '../repositories/guild-member.repository';

/**
 * GuildMemberQueryService - Handles complex queries and search operations
 * Single Responsibility: Complex queries, search, and pagination
 * 
 * Separates query operations from CRUD operations.
 */
@Injectable()
export class GuildMemberQueryService {
  private readonly logger = new Logger(GuildMemberQueryService.name);

  constructor(private guildMemberRepository: GuildMemberRepository) {}

  /**
   * Find all members in a guild with pagination
   * Single Responsibility: Member list retrieval with pagination
   */
  async findAll(
    guildId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{
    members: any[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    try {
      return await this.guildMemberRepository.findByGuildId(guildId, {
        page,
        limit,
        includeUser: true,
      });
    } catch (error) {
      this.logger.error(`Failed to fetch members for guild ${guildId}:`, error);
      throw new InternalServerErrorException('Failed to fetch guild members');
    }
  }

  /**
   * Search guild members by username
   * Single Responsibility: Member search with pagination
   */
  async searchMembers(
    guildId: string,
    query: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    members: any[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    try {
      return await this.guildMemberRepository.searchByUsername(guildId, query, {
        page,
        limit,
        includeUser: true,
      });
    } catch (error) {
      this.logger.error(`Failed to search members for guild ${guildId}:`, error);
      throw new InternalServerErrorException('Failed to search guild members');
    }
  }

  /**
   * Get user's guild memberships
   * Single Responsibility: User-guild relationship retrieval
   */
  async getUserGuilds(userId: string): Promise<any[]> {
    try {
      return await this.guildMemberRepository.findByUserId(userId, {
        guild: {
          include: { settings: true },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to get guilds for user ${userId}:`, error);
      throw new InternalServerErrorException('Failed to get user guilds');
    }
  }

  /**
   * Find all memberships for a user with guild data
   * Single Responsibility: User membership retrieval with guild information
   */
  async findMembersByUser(userId: string): Promise<any[]> {
    try {
      return await this.guildMemberRepository.findByUserId(userId, {
        guild: {
          include: { settings: true },
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to fetch memberships for user ${userId}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to get user memberships');
    }
  }

  /**
   * Find member with guild settings included
   * Single Responsibility: Member retrieval with guild settings for permission checks
   */
  async findMemberWithGuildSettings(
    userId: string,
    guildId: string,
  ): Promise<any | null> {
    try {
      return await this.guildMemberRepository.findWithGuildSettings(
        userId,
        guildId,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch member with guild settings for user ${userId} in guild ${guildId}:`,
        error,
      );
      return null;
    }
  }
}


