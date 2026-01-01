import { Injectable } from '@nestjs/common';
import { ILeagueService } from '../interfaces/league-service.interface';
import { LeaguesService } from '../leagues.service';
import { CreateLeagueDto } from '../dto/create-league.dto';
import { UpdateLeagueDto } from '../dto/update-league.dto';
import { LeagueQueryOptions } from '../interfaces/league-query.options';
import { League, LeagueStatus } from '@prisma/client';

/**
 * LeagueServiceAdapter - Adapter implementing ILeagueService
 *
 * Implements the ILeagueService interface using LeaguesService.
 * This adapter enables dependency inversion by allowing other modules to depend
 * on the interface rather than concrete services.
 */
@Injectable()
export class LeagueServiceAdapter implements ILeagueService {
  constructor(private readonly leaguesService: LeaguesService) {}

  /**
   * Create a new league with default settings using transaction
   * Delegates to LeaguesService.create()
   */
  async create(
    createLeagueDto: CreateLeagueDto,
    createdBy: string,
  ): Promise<League> {
    return this.leaguesService.create(createLeagueDto, createdBy);
  }

  /**
   * Find all leagues with pagination and optional filters
   * Delegates to LeaguesService.findAll()
   */
  async findAll(options?: {
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
  }> {
    return this.leaguesService.findAll(options);
  }

  /**
   * Find leagues by guild ID
   * Delegates to LeaguesService.findByGuild()
   */
  async findByGuild(
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
  }> {
    return this.leaguesService.findByGuild(guildId, options);
  }

  /**
   * Find leagues by game within a guild
   * Delegates to LeaguesService.findByGame()
   */
  async findByGame(
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
  }> {
    return this.leaguesService.findByGame(guildId, game, options);
  }

  /**
   * Find league by ID with optional related data
   * Delegates to LeaguesService.findOne()
   */
  async findOne(id: string, options?: LeagueQueryOptions): Promise<League> {
    return this.leaguesService.findOne(id, options);
  }

  /**
   * Update league information with validation
   * Delegates to LeaguesService.update()
   */
  async update(id: string, updateLeagueDto: UpdateLeagueDto): Promise<League> {
    return this.leaguesService.update(id, updateLeagueDto);
  }

  /**
   * Update league status with validation
   * Delegates to LeaguesService.updateStatus()
   */
  async updateStatus(id: string, status: LeagueStatus): Promise<League> {
    return this.leaguesService.updateStatus(id, status);
  }

  /**
   * Delete league (hard delete)
   * Delegates to LeaguesService.remove()
   */
  async remove(id: string): Promise<League> {
    return this.leaguesService.remove(id);
  }

  /**
   * Check if league exists
   * Delegates to LeaguesService.exists()
   */
  async exists(leagueId: string): Promise<boolean> {
    return this.leaguesService.exists(leagueId);
  }
}
