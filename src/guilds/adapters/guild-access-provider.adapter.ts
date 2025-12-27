import { Injectable, NotFoundException } from '@nestjs/common';
import { IGuildAccessProvider } from '../../common/interfaces/guild-access-provider.interface';
import { GuildSettingsService } from '../guild-settings.service';
import { GuildMembersService } from '../../guild-members/guild-members.service';

/**
 * GuildAccessProviderAdapter - Adapter implementing IGuildAccessProvider
 *
 * Implements the IGuildAccessProvider interface using GuildSettingsService
 * and GuildMembersService. This adapter enables dependency inversion by
 * allowing CommonModule to depend on the interface rather than concrete services.
 */
@Injectable()
export class GuildAccessProviderAdapter implements IGuildAccessProvider {
  constructor(
    private readonly guildSettingsService: GuildSettingsService,
    private readonly guildMembersService: GuildMembersService,
  ) {}

  /**
   * Get guild settings with caching and defaults
   * Delegates to GuildSettingsService.getSettings()
   */
  async getSettings(guildId: string) {
    return this.guildSettingsService.getSettings(guildId);
  }

  /**
   * Find a specific guild member by user ID and guild ID
   * Returns null if not found (converts NotFoundException to null)
   */
  async findOne(userId: string, guildId: string) {
    try {
      const member = await this.guildMembersService.findOne(userId, guildId);
      // Map to interface-compatible format
      return {
        id: member.id,
        userId: member.userId,
        guildId: member.guildId,
        roles: member.roles || [],
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return null;
      }
      throw error;
    }
  }
}
