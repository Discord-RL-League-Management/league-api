import {
  Injectable,
  InternalServerErrorException,
  Inject,
} from '@nestjs/common';
import type { ILoggingService } from '../../infrastructure/logging/interfaces/logging.interface';
import { GuildMemberRepository } from '../repositories/guild-member.repository';

/**
 * GuildMemberStatisticsService - Handles statistics and aggregations
 * Single Responsibility: Statistics and aggregations
 *
 * Separates statistics operations from CRUD operations.
 */
@Injectable()
export class GuildMemberStatisticsService {
  private readonly serviceName = GuildMemberStatisticsService.name;

  constructor(
    private guildMemberRepository: GuildMemberRepository,
    @Inject('ILoggingService')
    private readonly loggingService: ILoggingService,
  ) {}

  /**
   * Get guild member statistics
   * Single Responsibility: Member statistics aggregation
   */
  async getMemberStats(guildId: string): Promise<{
    totalMembers: number;
    activeMembers: number;
    newThisWeek: number;
  }> {
    try {
      return await this.guildMemberRepository.countStats(guildId);
    } catch (error) {
      this.loggingService.error(
        `Failed to get member stats for guild ${guildId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      throw new InternalServerErrorException('Failed to get member statistics');
    }
  }

  /**
   * Count members with specific roles
   * Single Responsibility: Role-based member counting for validation
   */
  async countMembersWithRoles(
    guildId: string,
    roleIds: string[],
  ): Promise<number> {
    try {
      return await this.guildMemberRepository.countMembersWithRoles(
        guildId,
        roleIds,
      );
    } catch (error) {
      this.loggingService.error(
        `Failed to count members with roles in guild ${guildId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      throw new InternalServerErrorException(
        'Failed to count members with roles',
      );
    }
  }

  /**
   * Get active members count
   * Single Responsibility: Active member counting
   */
  async getActiveMembersCount(guildId: string): Promise<number> {
    try {
      const stats = await this.guildMemberRepository.countStats(guildId);
      return stats.activeMembers;
    } catch (error) {
      this.loggingService.error(
        `Failed to get active members count for guild ${guildId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      throw new InternalServerErrorException(
        'Failed to get active members count',
      );
    }
  }
}
