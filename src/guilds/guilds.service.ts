import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
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
    private prisma: PrismaService,
  ) {}

  /**
   * Create a new guild with default settings using transaction
   * Single Responsibility: Guild creation and initialization with atomicity
   */
  async create(createGuildDto: CreateGuildDto): Promise<Guild> {
    try {
      // Check if guild already exists
      const existingGuild = await this.guildRepository.exists(
        createGuildDto.id,
      );

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
      if (
        error instanceof ConflictException ||
        error instanceof GuildAlreadyExistsException
      ) {
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
      // Extract error information for better debugging
      const errorInfo = this.extractErrorInfo(error, createGuildDto.id);

      // Enhanced error logging with context
      this.logger.error(
        `Failed to upsert guild ${createGuildDto.id} (${createGuildDto.name}):`,
        {
          error: errorInfo.message,
          code: errorInfo.code,
          details: errorInfo.details,
          stack: error instanceof Error ? error.stack : undefined,
          guildData: {
            id: createGuildDto.id,
            name: createGuildDto.name,
            ownerId: createGuildDto.ownerId,
            memberCount: createGuildDto.memberCount,
          },
        },
      );

      // Throw structured error with preserved details
      throw new InternalServerErrorException({
        message: 'Failed to upsert guild',
        code: errorInfo.code || 'GUILD_UPSERT_ERROR',
        details: errorInfo.details,
      });
    }
  }

  /**
   * Atomically sync guild with members in a single transaction
   * Single Responsibility: Atomic guild and member synchronization
   *
   * Eliminates race conditions by combining guild upsert and member sync
   * in a single database transaction. Used during bot startup sync.
   *
   * Architectural Note: This method uses direct Prisma transaction access
   * instead of repositories because:
   * 1. It requires atomic operations across multiple entities (guild, settings, members)
   * 2. Injecting GuildMemberRepository would create circular dependencies
   * 3. The transaction scope requires tight coordination between entities
   * 4. This is an exception to the repository pattern, justified by atomicity requirements
   *
   * @param guildId - Discord guild ID
   * @param guildData - Guild data to upsert
   * @param members - Array of member data to sync
   * @returns Guild and count of synced members
   */
  async syncGuildWithMembers(
    guildId: string,
    guildData: CreateGuildDto,
    members: Array<{
      userId: string;
      username: string;
      globalName?: string;
      avatar?: string;
      nickname?: string;
      roles: string[];
    }>,
    rolesData?: { admin: Array<{ id: string; name: string }> },
  ): Promise<{ guild: Guild; membersSynced: number }> {
    try {
      const defaultSettings = this.settingsDefaults.getDefaults();

      // Use single transaction to ensure atomicity
      const result = await this.prisma.$transaction(async (tx) => {
        // 1. Upsert guild with settings
        const guild = await tx.guild.upsert({
          where: { id: guildData.id },
          update: {
            name: guildData.name,
            icon: guildData.icon ?? null,
            ownerId: guildData.ownerId,
            memberCount: guildData.memberCount ?? 0,
            isActive: true,
            leftAt: null,
          },
          create: guildData,
        });

        // 2. Ensure settings exist and update with roles if provided
        const existingSettings = await tx.settings.findUnique({
          where: {
            ownerType_ownerId: {
              ownerType: 'guild',
              ownerId: guild.id,
            },
          },
        });

        const settingsToSave =
          rolesData?.admin && rolesData.admin.length > 0
            ? {
                ...defaultSettings,
                roles: {
                  ...defaultSettings.roles,
                  admin: rolesData.admin,
                },
              }
            : defaultSettings;

        await tx.settings.upsert({
          where: {
            ownerType_ownerId: {
              ownerType: 'guild',
              ownerId: guild.id,
            },
          },
          update:
            rolesData?.admin && rolesData.admin.length > 0
              ? {
                  settings: {
                    ...((existingSettings?.settings as any) || defaultSettings),
                    roles: {
                      ...((existingSettings?.settings as any)?.roles || {}),
                      admin: rolesData.admin,
                    },
                  },
                }
              : {},
          create: {
            ownerType: 'guild',
            ownerId: guild.id,
            settings: JSON.parse(JSON.stringify(settingsToSave)),
          },
        });

        // 3. Upsert all users first to ensure they exist
        if (members.length > 0) {
          const uniqueUsers = Array.from(
            new Map(members.map((m) => [m.userId, m])).values(),
          );

          for (const member of uniqueUsers) {
            await tx.user.upsert({
              where: { id: member.userId },
              update: {
                username: member.username,
                globalName: member.globalName ?? null,
                avatar: member.avatar ?? null,
              },
              create: {
                id: member.userId,
                username: member.username,
                globalName: member.globalName ?? null,
                avatar: member.avatar ?? null,
              },
            });
          }
        }

        // 4. Delete existing members
        await tx.guildMember.deleteMany({
          where: { guildId },
        });

        // 5. Create all members in bulk
        if (members.length > 0) {
          const memberData = members.map((member) => ({
            userId: member.userId,
            guildId,
            username: member.username,
            nickname: member.nickname || null,
            roles: member.roles,
          }));

          await tx.guildMember.createMany({
            data: memberData,
          });
        }

        return {
          guild,
          membersSynced: members.length,
        };
      });

      this.logger.log(
        `Atomically synced guild ${guildId} with ${result.membersSynced} members`,
      );

      return result;
    } catch (error) {
      // Handle Prisma foreign key constraint errors
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        this.logger.error(
          `Foreign key constraint error syncing guild ${guildId} with members:`,
          {
            message: error.message,
            meta: error.meta,
            cause: error.cause,
            guildId,
          },
        );

        // Check metadata to determine which FK failed
        const meta = error.meta as any;
        if (meta?.field_name) {
          if (
            meta.field_name.includes('userId') ||
            meta.field_name.includes('user')
          ) {
            throw new NotFoundException(
              `User not found for one or more members`,
            );
          } else if (
            meta.field_name.includes('guildId') ||
            meta.field_name.includes('guild')
          ) {
            throw new NotFoundException(`Guild ${guildId} not found`);
          }
        }

        // Fallback if metadata unavailable
        throw new NotFoundException(
          `Foreign key constraint failed: required record not found`,
        );
      }

      // Extract error information for better debugging
      const errorInfo = this.extractErrorInfo(error, guildId);

      // Enhanced error logging with context
      this.logger.error(`Failed to sync guild ${guildId} with members:`, {
        error: errorInfo.message,
        code: errorInfo.code,
        details: errorInfo.details,
        stack: error instanceof Error ? error.stack : undefined,
        guildData: {
          id: guildData.id,
          name: guildData.name,
          ownerId: guildData.ownerId,
          memberCount: guildData.memberCount,
        },
        memberCount: members.length,
      });

      // Throw structured error with preserved details
      throw new InternalServerErrorException({
        message: 'Failed to sync guild with members',
        code: errorInfo.code || 'GUILD_SYNC_ERROR',
        details: errorInfo.details,
      });
    }
  }

  /**
   * Extract error information from various error types
   * Single Responsibility: Error information extraction and normalization
   *
   * Handles Prisma errors and other error types to provide consistent error structure.
   */
  private extractErrorInfo(
    error: unknown,
    guildId: string,
  ): { message: string; code?: string; details?: Record<string, any> } {
    // Handle Prisma known request errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return {
        message: error.message,
        code: `PRISMA_${error.code}`,
        details: {
          prismaCode: error.code,
          meta: error.meta,
          cause: error.cause,
        },
      };
    }

    // Handle Prisma validation errors
    if (error instanceof Prisma.PrismaClientValidationError) {
      return {
        message: error.message,
        code: 'PRISMA_VALIDATION_ERROR',
        details: {
          cause: error.cause,
        },
      };
    }

    // Handle Prisma client initialization errors
    if (error instanceof Prisma.PrismaClientInitializationError) {
      return {
        message: error.message,
        code: 'PRISMA_INITIALIZATION_ERROR',
        details: {
          errorCode: error.errorCode,
          clientVersion: error.clientVersion,
        },
      };
    }

    // Handle Prisma rust panic errors
    if (error instanceof Prisma.PrismaClientRustPanicError) {
      return {
        message: error.message,
        code: 'PRISMA_RUST_PANIC_ERROR',
        details: {
          cause: error.cause,
        },
      };
    }

    // Handle generic errors
    if (error instanceof Error) {
      return {
        message: error.message,
        code: 'UNKNOWN_ERROR',
        details: {
          name: error.name,
          stack: error.stack,
        },
      };
    }

    // Handle unknown error types
    return {
      message: 'Unknown error occurred during guild upsert',
      code: 'UNKNOWN_ERROR',
      details: {
        errorType: typeof error,
        error: String(error),
      },
    };
  }
}
