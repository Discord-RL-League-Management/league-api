import { Injectable } from '@nestjs/common';
import { IGuildService } from '../interfaces/guild-service.interface';
import { GuildsService } from '../guilds.service';
import { CreateGuildDto } from '../dto/create-guild.dto';
import { UpdateGuildDto } from '../dto/update-guild.dto';
import { GuildQueryOptions } from '../interfaces/guild-query.options';
import { Guild } from '@prisma/client';

/**
 * GuildServiceAdapter - Adapter implementing IGuildService
 *
 * Implements the IGuildService interface using GuildsService.
 * This adapter enables dependency inversion by allowing other modules to depend
 * on the interface rather than concrete services.
 */
@Injectable()
export class GuildServiceAdapter implements IGuildService {
  constructor(private readonly guildsService: GuildsService) {}

  /**
   * Create a new guild with default settings using transaction
   * Delegates to GuildsService.create()
   */
  async create(createGuildDto: CreateGuildDto): Promise<Guild> {
    return this.guildsService.create(createGuildDto);
  }

  /**
   * Find all active guilds with pagination
   * Delegates to GuildsService.findAll()
   */
  async findAll(
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
  }> {
    return this.guildsService.findAll(page, limit);
  }

  /**
   * Find guild by ID with optional related data
   * Delegates to GuildsService.findOne()
   */
  async findOne(id: string, options?: GuildQueryOptions): Promise<Guild> {
    return this.guildsService.findOne(id, options);
  }

  /**
   * Update guild information with validation
   * Delegates to GuildsService.update()
   */
  async update(id: string, updateGuildDto: UpdateGuildDto): Promise<Guild> {
    return this.guildsService.update(id, updateGuildDto);
  }

  /**
   * Soft delete guild (mark as inactive) with cascade handling
   * Delegates to GuildsService.remove()
   */
  async remove(id: string): Promise<Guild> {
    return this.guildsService.remove(id);
  }

  /**
   * Get list of active guild IDs
   * Delegates to GuildsService.findActiveGuildIds()
   */
  async findActiveGuildIds(): Promise<string[]> {
    return this.guildsService.findActiveGuildIds();
  }

  /**
   * Check if guild exists
   * Delegates to GuildsService.exists()
   */
  async exists(guildId: string): Promise<boolean> {
    return this.guildsService.exists(guildId);
  }

  /**
   * Upsert guild (create or update) with default settings
   * Delegates to GuildsService.upsert()
   */
  async upsert(createGuildDto: CreateGuildDto): Promise<Guild> {
    return this.guildsService.upsert(createGuildDto);
  }
}
