import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGuildDto } from '../dto/create-guild.dto';
import { SettingsDefaultsService } from './settings-defaults.service';
import { GuildErrorHandlerService } from './guild-error-handler.service';
import { UserRepository } from '../../users/repositories/user.repository';
import { SettingsService } from '../../infrastructure/settings/services/settings.service';
import { Guild } from '@prisma/client';
import { GuildSettings } from '../interfaces/settings.interface';

/**
 * GuildSyncService - Single Responsibility: Atomic guild and member synchronization
 *
 * Eliminates race conditions by combining guild upsert and member sync
 * in a single database transaction. Used during bot startup sync.
 *
 * Extracted from GuildsService to improve separation of concerns.
 */
@Injectable()
export class GuildSyncService {
  private readonly logger = new Logger(GuildSyncService.name);

  constructor(
    private prisma: PrismaService,
    private settingsDefaults: SettingsDefaultsService,
    private errorHandler: GuildErrorHandlerService,
    private userRepository: UserRepository,
    private settingsService: SettingsService,
  ) {}

  /**
   * Atomically sync guild with members in a single transaction
   * Single Responsibility: Atomic guild and member synchronization orchestration
   *
   * Eliminates race conditions by combining guild upsert and member sync
   * in a single database transaction. Used during bot startup sync.
   *
   * Architectural Note: This method uses direct Prisma transaction access
   * for guild and member operations because:
   * 1. It requires atomic operations across multiple entities (guild, settings, members)
   * 2. The transaction scope requires tight coordination between entities
   * 3. This is an exception to the repository pattern, justified by atomicity requirements
   *
   * @param guildId - Discord guild ID
   * @param guildData - Guild data to upsert
   * @param members - Array of member data to sync
   * @param rolesData - Optional admin roles data
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
      const result = await this.prisma.$transaction(async (tx) => {
        const guild = await this.upsertGuildInTransaction(guildData, tx);
        await this.upsertSettingsInTransaction(guild.id, rolesData, tx);
        await this.syncUsersInTransaction(members, tx);
        await this.syncMembersInTransaction(guildId, members, tx);

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
      this.handleSyncError(error, guildId, guildData, members.length);
    }
  }

  /**
   * Upsert guild in transaction
   * Single Responsibility: Guild upsert logic
   */
  private async upsertGuildInTransaction(
    guildData: CreateGuildDto,
    tx: Prisma.TransactionClient,
  ): Promise<Guild> {
    return await tx.guild.upsert({
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
  }

  /**
   * Upsert settings in transaction
   * Single Responsibility: Settings upsert logic with role handling
   */
  private async upsertSettingsInTransaction(
    guildId: string,
    rolesData: { admin: Array<{ id: string; name: string }> } | undefined,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const defaultSettings = this.settingsDefaults.getDefaults();

    const existingSettings = await tx.settings.findUnique({
      where: {
        ownerType_ownerId: {
          ownerType: 'guild',
          ownerId: guildId,
        },
      },
    });

    const settingsToSave = this.prepareSettingsToSave(
      defaultSettings,
      existingSettings,
      rolesData,
    );

    await tx.settings.upsert({
      where: {
        ownerType_ownerId: {
          ownerType: 'guild',
          ownerId: guildId,
        },
      },
      update: this.prepareSettingsUpdate(
        existingSettings,
        defaultSettings,
        rolesData,
      ),
      create: {
        ownerType: 'guild',
        ownerId: guildId,
        settings: JSON.parse(
          JSON.stringify(settingsToSave),
        ) as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Prepare settings to save
   * Single Responsibility: Settings data preparation
   */
  private prepareSettingsToSave(
    defaultSettings: GuildSettings,
    existingSettings: { settings: unknown } | null,
    rolesData?: { admin: Array<{ id: string; name: string }> },
  ): GuildSettings {
    if (rolesData?.admin && rolesData.admin.length > 0) {
      return {
        ...defaultSettings,
        roles: {
          ...defaultSettings.roles,
          admin: rolesData.admin,
        },
      };
    }
    return defaultSettings;
  }

  /**
   * Prepare settings update payload
   * Single Responsibility: Settings update payload preparation
   */
  private prepareSettingsUpdate(
    existingSettings: { settings: unknown } | null,
    defaultSettings: GuildSettings,
    rolesData?: { admin: Array<{ id: string; name: string }> },
  ): { settings: Prisma.InputJsonValue } | Record<string, never> {
    if (rolesData?.admin && rolesData.admin.length > 0) {
      return {
        settings: {
          ...((existingSettings?.settings as GuildSettings) || defaultSettings),
          roles: {
            ...((existingSettings?.settings as GuildSettings)?.roles || {}),
            admin: rolesData.admin,
          },
        } as unknown as Prisma.InputJsonValue,
      };
    }
    return {};
  }

  /**
   * Sync users in transaction
   * Single Responsibility: User upsert logic
   */
  private async syncUsersInTransaction(
    members: Array<{
      userId: string;
      username: string;
      globalName?: string;
      avatar?: string;
    }>,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    if (members.length === 0) {
      return;
    }

    const uniqueUsers = Array.from(
      new Map(members.map((m) => [m.userId, m])).values(),
    );

    for (const member of uniqueUsers) {
      await this.userRepository.upsert(
        {
          id: member.userId,
          username: member.username,
          globalName: member.globalName ?? null,
          avatar: member.avatar ?? null,
        },
        tx,
      );
    }
  }

  /**
   * Sync members in transaction
   * Single Responsibility: Member deletion and creation
   */
  private async syncMembersInTransaction(
    guildId: string,
    members: Array<{
      userId: string;
      username: string;
      nickname?: string;
      roles: string[];
    }>,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await tx.guildMember.deleteMany({
      where: { guildId },
    });

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
  }

  /**
   * Handle sync errors
   * Single Responsibility: Error handling and transformation
   */
  private handleSyncError(
    error: unknown,
    guildId: string,
    guildData: CreateGuildDto,
    memberCount: number,
  ): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2003'
    ) {
      return this.handleForeignKeyError(error, guildId);
    }

    const errorInfo = this.errorHandler.extractErrorInfo(error, guildId);

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
      memberCount,
    });

    throw new InternalServerErrorException({
      message: 'Failed to sync guild with members',
      code: errorInfo.code || 'GUILD_SYNC_ERROR',
      details: errorInfo.details,
    });
  }

  /**
   * Handle foreign key constraint errors
   * Single Responsibility: Foreign key error handling
   */
  private handleForeignKeyError(
    error: Prisma.PrismaClientKnownRequestError,
    guildId: string,
  ): never {
    this.logger.error(
      `Foreign key constraint error syncing guild ${guildId} with members:`,
      {
        message: error.message,
        meta: error.meta,
        cause: error.cause,
        guildId,
      },
    );

    const meta = error.meta as { field_name?: string } | undefined;
    if (meta?.field_name) {
      if (
        meta.field_name.includes('userId') ||
        meta.field_name.includes('user')
      ) {
        throw new NotFoundException(`User not found for one or more members`);
      } else if (
        meta.field_name.includes('guildId') ||
        meta.field_name.includes('guild')
      ) {
        throw new NotFoundException(`Guild ${guildId} not found`);
      }
    }

    throw new NotFoundException(
      `Foreign key constraint failed: required record not found`,
    );
  }
}
