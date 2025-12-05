import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { GuildMemberRepository } from '../repositories/guild-member.repository';

/**
 * GuildMemberSyncService - Handles bulk operations and synchronization
 * Single Responsibility: Bulk operations and synchronization
 *
 * Separates sync operations from CRUD operations.
 */
@Injectable()
export class GuildMemberSyncService {
  private readonly logger = new Logger(GuildMemberSyncService.name);

  constructor(private guildMemberRepository: GuildMemberRepository) {}

  /**
   * Sync all guild members (bulk operation)
   * Single Responsibility: Bulk member synchronization with transaction
   */
  async syncGuildMembers(
    guildId: string,
    members: Array<{
      userId: string;
      username: string;
      nickname?: string;
      roles: string[];
    }>,
  ): Promise<{ synced: number }> {
    try {
      const result = await this.guildMemberRepository.syncMembers(
        guildId,
        members,
      );

      this.logger.log(`Synced ${result.synced} members for guild ${guildId}`);
      return result;
    } catch (error) {
      // Handle Prisma foreign key constraint errors
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        const meta = error.meta as { field_name?: string } | undefined;
        if (
          meta?.field_name?.includes('userId') ||
          meta?.field_name?.includes('user')
        ) {
          throw new NotFoundException(
            `One or more users not found for guild ${guildId}`,
          );
        } else if (
          meta?.field_name?.includes('guildId') ||
          meta?.field_name?.includes('guild')
        ) {
          throw new NotFoundException(`Guild ${guildId} not found`);
        }
        throw new NotFoundException('Foreign key constraint failed');
      }
      this.logger.error(`Failed to sync members for guild ${guildId}:`, error);
      throw new InternalServerErrorException('Failed to sync guild members');
    }
  }

  /**
   * Update member roles only
   * Single Responsibility: Role updates for permission synchronization
   */
  async updateMemberRoles(
    userId: string,
    guildId: string,
    roles: string[],
  ): Promise<{ count: number }> {
    try {
      return await this.guildMemberRepository.updateRoles(
        userId,
        guildId,
        roles,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update roles for member ${userId} in guild ${guildId}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to update member roles');
    }
  }

  /**
   * Batch update member roles
   * Single Responsibility: Bulk role updates
   */
  async batchUpdateRoles(
    updates: Array<{ userId: string; guildId: string; roles: string[] }>,
  ): Promise<{ updated: number }> {
    try {
      const results = await Promise.all(
        updates.map((update) =>
          this.guildMemberRepository.updateRoles(
            update.userId,
            update.guildId,
            update.roles,
          ),
        ),
      );

      const totalUpdated = results.reduce(
        (sum, result) => sum + result.count,
        0,
      );

      this.logger.log(`Batch updated roles for ${totalUpdated} members`);
      return { updated: totalUpdated };
    } catch (error) {
      this.logger.error(`Failed to batch update roles:`, error);
      throw new InternalServerErrorException('Failed to batch update roles');
    }
  }
}
