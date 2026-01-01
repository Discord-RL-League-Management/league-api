import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { League, LeagueStatus } from '@prisma/client';
import { CreateLeagueDto } from './dto/create-league.dto';
import { UpdateLeagueDto } from './dto/update-league.dto';
import { LeagueSettingsDefaultsService } from './services/league-settings-defaults.service';
import { LeagueQueryOptions } from './interfaces/league-query.options';
import {
  LeagueNotFoundException,
  LeagueAlreadyExistsException,
  InvalidLeagueStatusException,
} from './exceptions/league.exceptions';
import { ConflictException } from '../common/exceptions/base.exception';
import { LeagueRepository } from './repositories/league.repository';
import { PrismaService } from '../prisma/prisma.service';

/**
 * LeaguesService - Business logic layer for League operations
 * Single Responsibility: Orchestrates league-related business logic
 *
 * Uses LeagueRepository for data access, keeping concerns separated.
 * This service handles business rules and validation logic.
 */
@Injectable()
export class LeaguesService {
  private readonly logger = new Logger(LeaguesService.name);

  constructor(
    private settingsDefaults: LeagueSettingsDefaultsService,
    private leagueRepository: LeagueRepository,
    private prisma: PrismaService,
  ) {}

  /**
   * Create a new league with default settings using transaction
   * Single Responsibility: League creation and initialization with atomicity
   */
  async create(
    createLeagueDto: CreateLeagueDto,
    createdBy: string,
  ): Promise<League> {
    try {
      // Note: We can't check for duplicate league by ID since ID is generated (cuid)
      // Instead, we'll check for duplicate name within the same guild if needed
      // For now, we'll allow multiple leagues with the same name in a guild

      // Create league with settings in transaction (handled by repository)
      // Ensure createdBy is included in the data
      const leagueData: CreateLeagueDto & { createdBy: string } = {
        ...createLeagueDto,
        createdBy,
        status: createLeagueDto.status || LeagueStatus.ACTIVE,
      };

      const league = await this.leagueRepository.createWithSettings(
        leagueData,
        this.settingsDefaults.getDefaults() as unknown as Prisma.InputJsonValue,
      );

      this.logger.log(`Created league ${league.id} with default settings`);
      return league;
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof LeagueAlreadyExistsException
      ) {
        throw error;
      }
      this.logger.error(`Failed to create league:`, error);
      throw new InternalServerErrorException('Failed to create league');
    }
  }

  /**
   * Find all leagues with pagination and optional filters
   * Single Responsibility: League retrieval with performance optimization
   */
  async findAll(options?: {
    page?: number;
    limit?: number;
    guildId?: string;
    status?: string | string[];
    game?: string | string[];
  }) {
    try {
      const result = await this.leagueRepository.findAll(options);

      return {
        leagues: result.data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: Math.ceil(result.total / result.limit),
        },
      };
    } catch (error) {
      this.logger.error('Failed to fetch leagues:', error);
      throw new InternalServerErrorException('Failed to fetch leagues');
    }
  }

  /**
   * Find leagues by guild ID
   * Single Responsibility: Guild-scoped league retrieval
   */
  async findByGuild(guildId: string, options?: LeagueQueryOptions) {
    try {
      const result = await this.leagueRepository.findByGuild(guildId, options);

      return {
        leagues: result.data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: Math.ceil(result.total / result.limit),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to fetch leagues for guild ${guildId}:`, error);
      throw new InternalServerErrorException('Failed to fetch leagues');
    }
  }

  /**
   * Find leagues by game within a guild
   * Single Responsibility: Game-filtered league retrieval
   */
  async findByGame(
    guildId: string,
    game: string,
    options?: LeagueQueryOptions,
  ) {
    try {
      const result = await this.leagueRepository.findByGame(
        guildId,
        game,
        options,
      );

      return {
        leagues: result.data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: Math.ceil(result.total / result.limit),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch leagues for guild ${guildId} and game ${game}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to fetch leagues');
    }
  }

  /**
   * Find league by ID with optional related data
   * Single Responsibility: Single league retrieval with flexible query options
   *
   * @param id - League ID
   * @param options - Optional query options to control what relations to include
   */
  async findOne(id: string, options?: LeagueQueryOptions): Promise<League> {
    try {
      const league = await this.leagueRepository.findOne(id, options);

      if (!league) {
        throw new LeagueNotFoundException(id);
      }

      return league;
    } catch (error) {
      if (error instanceof LeagueNotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to fetch league ${id}:`, error);
      throw new InternalServerErrorException('Failed to fetch league');
    }
  }

  /**
   * Update league information with validation
   * Single Responsibility: League data updates with error handling
   *
   * Ensures atomicity when updating both status and other fields by using
   * explicit transactions, following the same pattern as GuildSettingsService.
   */
  async update(id: string, updateLeagueDto: UpdateLeagueDto): Promise<League> {
    try {
      const league = await this.findOne(id);

      // Prevent modifications to leagues in terminal states
      if (
        league.status === LeagueStatus.ARCHIVED ||
        league.status === LeagueStatus.CANCELLED
      ) {
        throw new InvalidLeagueStatusException(
          `Cannot modify league in ${league.status} state`,
        );
      }

      // If status is being updated, validate transition and use transaction for atomicity
      if (
        updateLeagueDto.status !== undefined &&
        updateLeagueDto.status !== league.status
      ) {
        // Validate status transition before starting transaction
        this.validateStatusTransition(league.status, updateLeagueDto.status);

        // Use transaction to ensure atomicity when updating both status and other fields
        return await this.prisma.$transaction(async (tx) => {
          const { status, ...updateData } = updateLeagueDto;

          // Update status first within transaction
          await this.leagueRepository.update(id, { status }, tx);

          // If there are other fields, update them in the same transaction
          if (Object.keys(updateData).length > 0) {
            await this.leagueRepository.update(id, updateData, tx);
          }

          // Always return the complete entity after all updates
          return await this.leagueRepository.findOne(id, undefined, tx);
        });
      }

      return await this.leagueRepository.update(id, updateLeagueDto);
    } catch (error) {
      if (
        error instanceof LeagueNotFoundException ||
        error instanceof InvalidLeagueStatusException
      ) {
        throw error;
      }
      this.logger.error(`Failed to update league ${id}:`, error);
      throw new InternalServerErrorException('Failed to update league');
    }
  }

  /**
   * Update league status with validation
   * Single Responsibility: Status updates with transition validation
   */
  async updateStatus(id: string, status: LeagueStatus): Promise<League> {
    try {
      const league = await this.findOne(id);

      // Validate status transition (can be enhanced with specific rules later)
      this.validateStatusTransition(league.status, status);

      return await this.leagueRepository.update(id, { status });
    } catch (error) {
      if (
        error instanceof LeagueNotFoundException ||
        error instanceof InvalidLeagueStatusException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to update league ${id} status to ${status}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to update league status');
    }
  }

  /**
   * Delete league (hard delete)
   * Single Responsibility: League deletion
   *
   * Note: Consider soft delete or archive if you need to preserve historical data
   */
  async remove(id: string): Promise<League> {
    try {
      const exists = await this.leagueRepository.exists(id);

      if (!exists) {
        throw new LeagueNotFoundException(id);
      }

      // Hard delete league (cascade will handle related records)
      const deletedLeague = await this.leagueRepository.delete(id);

      this.logger.log(`Deleted league ${id}`);
      return deletedLeague;
    } catch (error) {
      if (error instanceof LeagueNotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to delete league ${id}:`, error);
      throw new InternalServerErrorException('Failed to delete league');
    }
  }

  /**
   * Check if league exists
   * Single Responsibility: League existence validation
   */
  async exists(leagueId: string): Promise<boolean> {
    return this.leagueRepository.exists(leagueId);
  }

  /**
   * Validate status transition
   * Single Responsibility: Status transition validation
   *
   * @param currentStatus - Current league status
   * @param newStatus - New league status
   * @throws InvalidLeagueStatusException if transition is invalid
   */
  private validateStatusTransition(
    currentStatus: LeagueStatus,
    newStatus: LeagueStatus,
  ): void {
    const validTransitions: Record<LeagueStatus, LeagueStatus[]> = {
      [LeagueStatus.ACTIVE]: [
        LeagueStatus.PAUSED,
        LeagueStatus.ARCHIVED,
        LeagueStatus.CANCELLED,
      ],
      [LeagueStatus.PAUSED]: [
        LeagueStatus.ACTIVE,
        LeagueStatus.ARCHIVED,
        LeagueStatus.CANCELLED,
      ],
      [LeagueStatus.ARCHIVED]: [], // Archived leagues cannot transition
      [LeagueStatus.CANCELLED]: [], // Cancelled leagues cannot transition
    };

    const allowedTransitions = validTransitions[currentStatus] || [];
    if (
      !allowedTransitions.includes(newStatus) &&
      currentStatus !== newStatus
    ) {
      throw new InvalidLeagueStatusException(
        `Cannot transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }
}
