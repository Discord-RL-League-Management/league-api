import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Inject,
} from '@nestjs/common';
import type { ILoggingService } from '../../infrastructure/logging/interfaces/logging.interface';
import { Prisma, PlayerStatus, Player } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  ITransactionService,
  ITransactionClient,
} from '../../infrastructure/transactions/interfaces/transaction.interface';
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
  private readonly serviceName = PlayerService.name;

  constructor(
    private playerRepository: PlayerRepository,
    private validationService: PlayerValidationService,
    private prisma: PrismaService,
    private activityLogService: ActivityLogService,
    @Inject('ITransactionService')
    private transactionService: ITransactionService,
    @Inject('ILoggingService')
    private readonly loggingService: ILoggingService,
  ) {}

  /**
   * Find player by ID
   */
  async findOne(id: string, options?: PlayerQueryOptions): Promise<Player> {
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
  ): Promise<Player | null> {
    return this.playerRepository.findByUserIdAndGuildId(
      userId,
      guildId,
      options,
    );
  }

  /**
   * Find all players in a guild
   */
  async findByGuildId(
    guildId: string,
    options?: PlayerQueryOptions,
  ): Promise<{ data: Player[]; total: number; page: number; limit: number }> {
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
  async findAll(options?: {
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    return this.playerRepository.findAll(options);
  }

  /**
   * Create a new player with validation
   * Single Responsibility: Player creation with validation
   */
  async create(createPlayerDto: CreatePlayerDto): Promise<any> {
    try {
      await this.validationService.validateGuildMembership(
        createPlayerDto.userId,
        createPlayerDto.guildId,
      );

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

      return await this.transactionService.executeTransaction(
        async (tx: ITransactionClient) => {
          const player = await (tx as Prisma.TransactionClient).player.create({
            data: {
              userId: createPlayerDto.userId,
              guildId: createPlayerDto.guildId,
              status: createPlayerDto.status || 'ACTIVE',
            },
          });

          await this.activityLogService.logActivity(
            tx as Prisma.TransactionClient,
            'player',
            player.id,
            'PLAYER_CREATED',
            'create',
            createPlayerDto.userId,
            createPlayerDto.guildId,
            { status: player.status },
          );

          return player;
        },
      );
    } catch (error) {
      if (
        error instanceof PlayerAlreadyExistsException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new PlayerAlreadyExistsException(
          createPlayerDto.userId,
          createPlayerDto.guildId,
        );
      }

      this.loggingService.error(
        `Failed to create player: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      throw new InternalServerErrorException('Failed to create player');
    }
  }

  /**
   * Auto-create player on first league join attempt
   * Single Responsibility: Auto-creation with transaction
   */
  async ensurePlayerExists(userId: string, guildId: string): Promise<any> {
    const player = await this.playerRepository.findByUserIdAndGuildId(
      userId,
      guildId,
    );

    if (player) {
      return player;
    }

    await this.validationService.validateGuildMembership(userId, guildId);

    return await this.transactionService.executeTransaction(
      async (tx: ITransactionClient) => {
        // Double-check in transaction
        const existing = await (
          tx as Prisma.TransactionClient
        ).player.findUnique({
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

        const player = await (tx as Prisma.TransactionClient).player.create({
          data: {
            userId,
            guildId,
            status: PlayerStatus.ACTIVE,
          },
        });

        await this.activityLogService.logActivity(
          tx as Prisma.TransactionClient,
          'player',
          player.id,
          'PLAYER_AUTO_CREATED',
          'create',
          userId,
          guildId,
          { status: player.status },
          { autoCreated: true },
        );

        return player;
      },
    );
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

      if (updatePlayerDto.status && updatePlayerDto.status !== player.status) {
        this.validationService.validatePlayerStatus(updatePlayerDto.status);
      }

      return await this.transactionService.executeTransaction(
        async (tx: ITransactionClient) => {
          const updated = await (tx as Prisma.TransactionClient).player.update({
            where: { id },
            data: {
              ...(updatePlayerDto.status !== undefined && {
                status: updatePlayerDto.status,
              }),
            },
          });

          await this.activityLogService.logActivity(
            tx as Prisma.TransactionClient,
            'player',
            id,
            'PLAYER_UPDATED',
            'update',
            player.userId,
            player.guildId,
            updatePlayerDto as unknown as Prisma.InputJsonValue,
          );

          return updated;
        },
      );
    } catch (error) {
      if (
        error instanceof PlayerNotFoundException ||
        error instanceof InvalidPlayerStatusException
      ) {
        throw error;
      }
      this.loggingService.error(
        `Failed to update player ${id}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
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
