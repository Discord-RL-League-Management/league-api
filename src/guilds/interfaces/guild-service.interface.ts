import { CreateGuildDto } from '../dto/create-guild.dto';
import { UpdateGuildDto } from '../dto/update-guild.dto';
import { GuildQueryOptions } from './guild-query.options';
import { Guild } from '@prisma/client';

/**
 * IGuildService - Interface for core guild operations
 *
 * Abstracts guild business logic to enable dependency inversion.
 * This interface allows other modules to depend on abstractions rather than
 * concrete implementations, reducing coupling and improving testability.
 */
export interface IGuildService {
  /**
   * Create a new guild with default settings using transaction
   * @param createGuildDto - Guild creation data
   * @returns Created guild
   */
  create(createGuildDto: CreateGuildDto): Promise<Guild>;

  /**
   * Find all active guilds with pagination
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 50)
   * @returns Paginated guilds with pagination metadata
   */
  findAll(
    page?: number,
    limit?: number,
  ): Promise<{
    guilds: Guild[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }>;

  /**
   * Find guild by ID with optional related data
   * @param id - Guild ID
   * @param options - Optional query options to control what relations to include
   * @returns Guild entity
   */
  findOne(id: string, options?: GuildQueryOptions): Promise<Guild>;

  /**
   * Update guild information with validation
   * @param id - Guild ID
   * @param updateGuildDto - Guild update data
   * @returns Updated guild
   */
  update(id: string, updateGuildDto: UpdateGuildDto): Promise<Guild>;

  /**
   * Soft delete guild (mark as inactive) with cascade handling
   * @param id - Guild ID
   * @returns Updated guild (soft deleted)
   */
  remove(id: string): Promise<Guild>;

  /**
   * Get list of active guild IDs
   * @returns Array of active guild IDs
   */
  findActiveGuildIds(): Promise<string[]>;

  /**
   * Check if guild exists
   * @param guildId - Guild ID to check
   * @returns True if guild exists, false otherwise
   */
  exists(guildId: string): Promise<boolean>;

  /**
   * Upsert guild (create or update) with default settings
   * Idempotent operation: creates if not exists, updates if exists.
   * @param createGuildDto - Guild creation data
   * @returns Guild entity (created or updated)
   */
  upsert(createGuildDto: CreateGuildDto): Promise<Guild>;
}
