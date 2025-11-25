import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma, PlayerStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePlayerDto } from '../dto/create-player.dto';
import { UpdatePlayerDto } from '../dto/update-player.dto';
import { PlayerRepository } from '../repositories/player.repository';
import { PlayerValidationService } from './player-validation.service';
import { ActivityLogService } from '../../infrastructure/activity-log/services/activity-log.service';
import {
  PlayerNotFoundException,
  PlayerAlreadyExistsException,
  InvalidPlayerStatusException,
} from '../exceptions/player.exceptions';
import { PlayerQueryOptions } from '../interfaces/player.interface';

/**
 * PlayerService - Business logic layer for Player operations
 * Single Responsibility: Orchestrates player-related business logic
 * 
 * Uses PlayerRepository for data access, keeping concerns separated.
 * This service handles business rules and validation logic.
 */
@Injectable()
export class PlayerService {
  private readonly logger = new Logger(PlayerService.name);

  constructor(
    private playerRepository: PlayerRepository,
    private validationService: PlayerValidationService,
    private prisma: PrismaService,
    private activityLogService: ActivityLogService,
  ) {}

  /**
   * Find player by ID
   */
  async findOne(id: string, options?: PlayerQueryOptions): Promise<any> {
    const player = await this.playerRepository.findById(id, options);
    if (!player) {
      throw new PlayerNotFoundException(id);
    }
    return player;
  }

  /**
   * Find player by userId and guildId (composite key)
   */
  async findByUserIdAndGuildId(
    userId: string,
    guildId: string,
    options?: PlayerQueryOptions,
  ): Promise<any | null> {
    return this.playerRepository.findByUserIdAndGuildId(userId, guildId, options);
  }

  /**
   * Find all players in a guild
   */
  async findByGuildId(
    guildId: string,
    options?: PlayerQueryOptions,
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    return this.playerRepository.findByGuildId(guildId, options);
  }

  /**
   * Find all players for a user
   */
  async findByUserId(
    userId: string,
    options?: PlayerQueryOptions,
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    return this.playerRepository.findByUserId(userId, options);
  }

  /**
   * Find all players (for internal use)
   */
  async findAll(options?: { page?: number; limit?: number }): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    return this.playerRepository.findAll(options);
  }

  /**
   * Create a new player with validation
   * Single Responsibility: Player creation with validation
   */
  async create(createPlayerDto: CreatePlayerDto): Promise<any> {
    try {
      // Validate guild membership
      await this.validationService.validateGuildMembership(
        createPlayerDto.userId,
        createPlayerDto.guildId,
      );

      // Validate tracker if provided
      if (createPlayerDto.primaryTrackerId) {
        await this.validationService.validateTrackerLink(
          createPlayerDto.primaryTrackerId,
          createPlayerDto.userId,
        );
      }

      // Check if player already exists
      const existing = await this.playerRepository.findByUserIdAndGuildId(
        createPlayerDto.userId,
        createPlayerDto.guildId,
      );

      if (existing) {
        throw new PlayerAlreadyExistsException(
          createPlayerDto.userId,
          createPlayerDto.guildId,
        );
      }

      // Create player with activity logging in transaction
      return await this.prisma.$transaction(async (tx) => {
        const player = await tx.player.create({
          data: {
            userId: createPlayerDto.userId,
            guildId: createPlayerDto.guildId,
            status: createPlayerDto.status || 'ACTIVE',
            primaryTrackerId: createPlayerDto.primaryTrackerId,
          },
        });

        // Log activity
        await this.activityLogService.logActivity(
          tx,
          'player',
          player.id,
          'PLAYER_CREATED',
          'create',
          createPlayerDto.userId,
          createPlayerDto.guildId,
          { status: player.status, primaryTrackerId: player.primaryTrackerId },
        );

        return player;
      });
    } catch (error) {
      if (
        error instanceof PlayerAlreadyExistsException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      // Handle Prisma unique constraint errors
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new PlayerAlreadyExistsException(
          createPlayerDto.userId,
          createPlayerDto.guildId,
        );
      }

      this.logger.error('Failed to create player:', error);
      throw new InternalServerErrorException('Failed to create player');
    }
  }

  /**
   * Auto-create player on first league join attempt
   * Single Responsibility: Auto-creation with transaction
   */
  async ensurePlayerExists(
    userId: string,
    guildId: string,
    primaryTrackerId?: string,
  ): Promise<any> {
    // Check if player exists
    let player = await this.playerRepository.findByUserIdAndGuildId(userId, guildId);

    if (player) {
      return player;
    }

    // Validate guild membership
    await this.validationService.validateGuildMembership(userId, guildId);

      // Validate tracker if provided
      if (primaryTrackerId) {
        await this.validationService.validateTrackerLink(primaryTrackerId, userId);
      }

      // Create player in transaction with activity logging
      return await this.prisma.$transaction(async (tx) => {
        // Double-check in transaction
        const existing = await tx.player.findUnique({
          where: {
            userId_guildId: {
              userId,
              guildId,
            },
          },
        });

        if (existing) {
          return existing;
        }

        const player = await tx.player.create({
          data: {
            userId,
            guildId,
            status: PlayerStatus.ACTIVE,
            primaryTrackerId,
          },
        });

        // Log activity
        await this.activityLogService.logActivity(
          tx,
          'player',
          player.id,
          'PLAYER_AUTO_CREATED',
          'create',
          userId,
          guildId,
          { status: player.status, primaryTrackerId: player.primaryTrackerId },
          { autoCreated: true },
        );

        return player;
      });
  }

  /**
   * Update player with validation
   * Single Responsibility: Player updates with validation
   */
  async update(id: string, updatePlayerDto: UpdatePlayerDto): Promise<any> {
    try {
      const player = await this.playerRepository.findById(id);
      if (!player) {
        throw new PlayerNotFoundException(id);
      }

      // Validate status transition if status is being updated
      if (updatePlayerDto.status && updatePlayerDto.status !== player.status) {
        this.validationService.validatePlayerStatus(updatePlayerDto.status);
      }

      // Validate tracker if being updated
      if (updatePlayerDto.primaryTrackerId !== undefined) {
        await this.validationService.validateTrackerLink(
          updatePlayerDto.primaryTrackerId,
          player.userId,
        );
      }

      // Update with activity logging in transaction
      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.player.update({
          where: { id },
          data: {
            ...(updatePlayerDto.status !== undefined && { status: updatePlayerDto.status }),
            ...(updatePlayerDto.primaryTrackerId !== undefined && { primaryTrackerId: updatePlayerDto.primaryTrackerId }),
          },
        });

        // Log activity
        await this.activityLogService.logActivity(
          tx,
          'player',
          id,
          'PLAYER_UPDATED',
          'update',
          player.userId,
          player.guildId,
          updatePlayerDto as Record<string, any>,
        );

        return updated;
      });
    } catch (error) {
      if (
        error instanceof PlayerNotFoundException ||
        error instanceof InvalidPlayerStatusException
      ) {
        throw error;
      }
      this.logger.error(`Failed to update player ${id}:`, error);
      throw new InternalServerErrorException('Failed to update player');
    }
  }

  /**
   * Update cooldown tracking
   * Single Responsibility: Cooldown tracking
   */
  async updateCooldown(
    playerId: string,
    lastLeftLeagueId: string,
  ): Promise<any> {
    const player = await this.playerRepository.findById(playerId);
    if (!player) {
      throw new PlayerNotFoundException(playerId);
    }

    return await this.playerRepository.updateCooldown(
      playerId,
      new Date(),
      lastLeftLeagueId,
    );
  }

  /**
   * Delete player
   */
  async delete(id: string): Promise<any> {
    const player = await this.playerRepository.findById(id);
    if (!player) {
      throw new PlayerNotFoundException(id);
    }

    return await this.playerRepository.delete(id);
  }

  /**
   * Check if player exists
   */
  async exists(id: string): Promise<boolean> {
    return this.playerRepository.exists(id);
  }
}

