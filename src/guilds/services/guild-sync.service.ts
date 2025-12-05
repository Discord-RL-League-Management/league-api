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
   * Single Responsibility: Atomic guild and member synchronization
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
      const defaultSettings = this.settingsDefaults.getDefaults();

      const result = await this.prisma.$transaction(async (tx) => {
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
                    ...((existingSettings?.settings as unknown as GuildSettings) ||
                      defaultSettings),
                    roles: {
                      ...((
                        existingSettings?.settings as unknown as GuildSettings
                      )?.roles || {}),
                      admin: rolesData.admin,
                    },
                  } as unknown as Prisma.InputJsonValue,
                }
              : {},
          create: {
            ownerType: 'guild',
            ownerId: guild.id,
            settings: JSON.parse(
              JSON.stringify(settingsToSave),
            ) as Prisma.InputJsonValue,
          },
        });

        if (members.length > 0) {
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

        const meta = error.meta as { field_name?: string } | undefined;
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

        throw new NotFoundException(
          `Foreign key constraint failed: required record not found`,
        );
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
        memberCount: members.length,
      });

      throw new InternalServerErrorException({
        message: 'Failed to sync guild with members',
        code: errorInfo.code || 'GUILD_SYNC_ERROR',
        details: errorInfo.details,
      });
    }
  }
}

