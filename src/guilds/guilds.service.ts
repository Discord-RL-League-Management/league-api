import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { CreateGuildDto } from './dto/create-guild.dto';
import { UpdateGuildDto } from './dto/update-guild.dto';
import { SettingsDefaultsService } from './services/settings-defaults.service';
import {
  GuildQueryOptions,
  defaultGuildQueryOptions,
} from './interfaces/guild-query.options';
import {
  GuildNotFoundException,
  GuildAlreadyExistsException,
} from './exceptions/guild.exceptions';
import { ConflictException } from '../common/exceptions/base.exception';
import { GuildRepository } from './repositories/guild.repository';
import { Guild } from '@prisma/client';

/**
 * GuildsService - Business logic layer for Guild operations
 * Single Responsibility: Orchestrates guild-related business logic
 * 
 * Uses GuildRepository for data access, keeping concerns separated.
 * This service handles business rules and validation logic.
 */
@Injectable()
export class GuildsService {
  private readonly logger = new Logger(GuildsService.name);

  constructor(
    private settingsDefaults: SettingsDefaultsService,
    private guildRepository: GuildRepository,
  ) {}

  /**
   * Create a new guild with default settings using transaction
   * Single Responsibility: Guild creation and initialization with atomicity
   */
  async create(createGuildDto: CreateGuildDto): Promise<Guild> {
    try {
      // Check if guild already exists
      const existingGuild = await this.guildRepository.exists(createGuildDto.id);

      if (existingGuild) {
        throw new GuildAlreadyExistsException(createGuildDto.id);
      }

      // Create guild with settings in transaction (handled by repository)
      const guild = await this.guildRepository.createWithSettings(
        createGuildDto,
        this.settingsDefaults.getDefaults(),
      );

      this.logger.log(`Created guild ${guild.id} with default settings`);
      return guild;
    } catch (error) {
      if (error instanceof ConflictException || error instanceof GuildAlreadyExistsException) {
        throw error;
      }
      this.logger.error(`Failed to create guild ${createGuildDto.id}:`, error);
      throw new InternalServerErrorException('Failed to create guild');
    }
  }

  /**
   * Find all active guilds with pagination
   * Single Responsibility: Guild retrieval with performance optimization
   */
  async findAll(page: number = 1, limit: number = 50) {
    try {
      const result = await this.guildRepository.findAll({ page, limit });

      return {
        guilds: result.data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: Math.ceil(result.total / result.limit),
        },
      };
    } catch (error) {
      this.logger.error('Failed to fetch guilds:', error);
      throw new InternalServerErrorException('Failed to fetch guilds');
    }
  }

  /**
   * Find guild by ID with optional related data
   * Single Responsibility: Single guild retrieval with flexible query options
   * 
   * @param id - Guild ID
   * @param options - Optional query options to control what relations to include
   */
  async findOne(id: string, options?: GuildQueryOptions): Promise<Guild> {
    try {
      const guild = await this.guildRepository.findOne(id, options);

      if (!guild) {
        throw new GuildNotFoundException(id);
      }

      return guild;
    } catch (error) {
      if (error instanceof GuildNotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to fetch guild ${id}:`, error);
      throw new InternalServerErrorException('Failed to fetch guild');
    }
  }

  /**
   * Update guild information with validation
   * Single Responsibility: Guild data updates with error handling
   */
  async update(id: string, updateGuildDto: UpdateGuildDto): Promise<Guild> {
    try {
      // Check if guild exists
      const exists = await this.guildRepository.exists(id);

      if (!exists) {
        throw new GuildNotFoundException(id);
      }

      return await this.guildRepository.update(id, updateGuildDto);
    } catch (error) {
      if (error instanceof GuildNotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update guild ${id}:`, error);
      throw new InternalServerErrorException('Failed to update guild');
    }
  }

  /**
   * Soft delete guild (mark as inactive) with cascade handling
   * Single Responsibility: Guild deactivation with proper cleanup
   */
  async remove(id: string): Promise<Guild> {
    try {
      // Check if guild exists
      const exists = await this.guildRepository.exists(id);

      if (!exists) {
        throw new GuildNotFoundException(id);
      }

      // Soft delete guild with cleanup (transaction handled by repository)
      const updatedGuild = await this.guildRepository.removeWithCleanup(id);

      this.logger.log(`Soft deleted guild ${id}`);
      return updatedGuild;
    } catch (error) {
      if (error instanceof GuildNotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to remove guild ${id}:`, error);
      throw new InternalServerErrorException('Failed to remove guild');
    }
  }

  /**
   * Get list of active guild IDs
   * Single Responsibility: Retrieval of active guild IDs for filtering
   */
  async findActiveGuildIds(): Promise<string[]> {
    try {
      return await this.guildRepository.findActiveGuildIds();
    } catch (error) {
      this.logger.error('Failed to fetch active guild IDs:', error);
      throw new InternalServerErrorException(
        'Failed to fetch active guild IDs',
      );
    }
  }

  /**
   * Check if guild exists
   * Single Responsibility: Guild existence validation
   */
  async exists(guildId: string): Promise<boolean> {
    return this.guildRepository.exists(guildId);
  }

  /**
   * Upsert guild (create or update) with default settings
   * Single Responsibility: Guild existence check and create/update decision
   * 
   * Idempotent operation: creates if not exists, updates if exists.
   * Returns the guild regardless of whether it was created or updated.
   */
  async upsert(createGuildDto: CreateGuildDto): Promise<Guild> {
    try {
      // Upsert guild with settings in transaction (handled by repository)
      const guild = await this.guildRepository.upsertWithSettings(
        createGuildDto,
        this.settingsDefaults.getDefaults(),
      );

      this.logger.log(`Upserted guild ${guild.id} (created or updated)`);
      return guild;
    } catch (error) {
      this.logger.error(`Failed to upsert guild ${createGuildDto.id}:`, error);
      throw new InternalServerErrorException('Failed to upsert guild');
    }
  }
}
