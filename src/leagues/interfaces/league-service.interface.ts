import { CreateLeagueDto } from '../dto/create-league.dto';
import { UpdateLeagueDto } from '../dto/update-league.dto';
import { LeagueQueryOptions } from './league-query.options';
import { League, LeagueStatus } from '@prisma/client';

/**
 * ILeagueService - Interface for core league operations
 *
 * Abstracts league business logic to enable dependency inversion.
 * This interface allows other modules to depend on abstractions rather than
 * concrete implementations, reducing coupling and improving testability.
 */
export interface ILeagueService {
  /**
   * Create a new league with default settings using transaction
   * @param createLeagueDto - League creation data
   * @param createdBy - User ID who created the league
   * @returns Created league
   */
  create(createLeagueDto: CreateLeagueDto, createdBy: string): Promise<League>;

  /**
   * Find all leagues with pagination and optional filters
   * @param options - Optional query options including pagination and filters
   * @returns Paginated leagues with pagination metadata
   */
  findAll(options?: {
    page?: number;
    limit?: number;
    guildId?: string;
    status?: string | string[];
    game?: string | string[];
  }): Promise<{
    leagues: League[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }>;

  /**
   * Find leagues by guild ID
   * @param guildId - Guild ID
   * @param options - Optional query options to control what relations to include
   * @returns Paginated leagues with pagination metadata
   */
  findByGuild(
    guildId: string,
    options?: LeagueQueryOptions,
  ): Promise<{
    leagues: League[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }>;

  /**
   * Find leagues by game within a guild
   * @param guildId - Guild ID
   * @param game - Game type
   * @param options - Optional query options to control what relations to include
   * @returns Paginated leagues with pagination metadata
   */
  findByGame(
    guildId: string,
    game: string,
    options?: LeagueQueryOptions,
  ): Promise<{
    leagues: League[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }>;

  /**
   * Find league by ID with optional related data
   * @param id - League ID
   * @param options - Optional query options to control what relations to include
   * @returns League entity
   */
  findOne(id: string, options?: LeagueQueryOptions): Promise<League>;

  /**
   * Update league information with validation
   * @param id - League ID
   * @param updateLeagueDto - League update data
   * @returns Updated league
   */
  update(id: string, updateLeagueDto: UpdateLeagueDto): Promise<League>;

  /**
   * Update league status with validation
   * @param id - League ID
   * @param status - New league status
   * @returns Updated league
   */
  updateStatus(id: string, status: LeagueStatus): Promise<League>;

  /**
   * Delete league (hard delete)
   * @param id - League ID
   * @returns Deleted league
   */
  remove(id: string): Promise<League>;

  /**
   * Check if league exists
   * @param leagueId - League ID to check
   * @returns True if league exists, false otherwise
   */
  exists(leagueId: string): Promise<boolean>;
}
