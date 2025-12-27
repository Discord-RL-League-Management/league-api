import { Injectable } from '@nestjs/common';
import { IDiscordProvider } from '../../common/interfaces/discord-provider.interface';
import { DiscordApiService } from '../discord-api.service';

/**
 * DiscordProviderAdapter - Adapter implementing IDiscordProvider
 *
 * Implements the IDiscordProvider interface using DiscordApiService.
 * This adapter enables dependency inversion by allowing CommonModule to depend
 * on the interface rather than concrete services.
 */
@Injectable()
export class DiscordProviderAdapter implements IDiscordProvider {
  constructor(private readonly discordApiService: DiscordApiService) {}

  /**
   * Check user's permissions in a Discord guild
   * Delegates to DiscordApiService.checkGuildPermissions()
   */
  async checkGuildPermissions(
    accessToken: string,
    guildId: string,
  ): Promise<
    import('../../common/interfaces/discord-provider.interface').GuildPermissions
  > {
    return this.discordApiService.checkGuildPermissions(accessToken, guildId);
  }
}
