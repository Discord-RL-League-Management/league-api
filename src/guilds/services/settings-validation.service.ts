import { Injectable, BadRequestException } from '@nestjs/common';
import { DiscordBotService } from '../../discord/discord-bot.service';
import { GuildSettingsDto } from '../dto/guild-settings.dto';
import {
  MAX_CHANNEL_NAME_LENGTH,
} from '../constants/settings.constants';

@Injectable()
export class SettingsValidationService {
  constructor(
    private discordValidation: DiscordBotService,
  ) {}

  /**
   * Validate settings structure and values with Discord API verification
   * Single Responsibility: Settings validation with Discord API integration
   */
  async validate(settings: GuildSettingsDto, guildId: string): Promise<void> {
    if (settings.bot_command_channels) {
      await this.validateBotCommandChannels(settings.bot_command_channels, guildId);
    }
    
    if (settings.register_command_channels) {
      await this.validateRegisterCommandChannels(settings.register_command_channels, guildId);
    }
  }

  /**
   * Validate bot command channels with Discord API verification
   * Single Responsibility: Channel validation with Discord API
   */
  private async validateBotCommandChannels(
    channels: any[],
    guildId: string,
  ): Promise<void> {
    // Check for duplicate channel IDs
    const seenIds = new Set<string>();
    
    for (const channel of channels) {
      if (!channel.id) {
        throw new BadRequestException('Channel ID is required');
      }

      if (typeof channel.id !== 'string') {
        throw new BadRequestException('Channel ID must be a string');
      }

      if (!/^\d{17,20}$/.test(channel.id)) {
        throw new BadRequestException(
          `Invalid Discord channel ID format: ${channel.id}`,
        );
      }

      if (seenIds.has(channel.id)) {
        throw new BadRequestException(`Duplicate channel ID: ${channel.id}`);
      }
      seenIds.add(channel.id);

      // Validate channel exists in Discord
      const isValidChannel = await this.discordValidation.validateChannelId(
        guildId,
        channel.id,
      );
      if (!isValidChannel) {
        throw new BadRequestException(
          `Channel ${channel.id} does not exist in Discord guild`,
        );
      }

      if (channel.name && typeof channel.name !== 'string') {
        throw new BadRequestException('Channel name must be a string');
      }

      if (channel.name && channel.name.length > MAX_CHANNEL_NAME_LENGTH) {
        throw new BadRequestException(
          `Channel name too long: max ${MAX_CHANNEL_NAME_LENGTH} characters`,
        );
      }
    }
  }

  /**
   * Validate register command channels with Discord API verification
   * Single Responsibility: Channel validation with Discord API
   */
  private async validateRegisterCommandChannels(
    channels: any[],
    guildId: string,
  ): Promise<void> {
    // Reuse the same validation logic as bot_command_channels
    await this.validateBotCommandChannels(channels, guildId);
  }

  /**
   * Validate configuration structure (runtime validation)
   * Single Responsibility: Structure validation after migration
   * 
   * Validates that config has correct structure, types, and required fields.
   * Used after migration to ensure integrity.
   * 
   * @param config Configuration object to validate
   * @throws BadRequestException if structure is invalid
   */
  validateStructure(config: any): void {
    // Validate that config is an object
    if (!config || typeof config !== 'object') {
      throw new BadRequestException('Configuration must be an object');
    }

    // Validate required top-level sections
    if (!('bot_command_channels' in config)) {
      throw new BadRequestException('Missing required section: bot_command_channels');
    }

    // Validate bot_command_channels structure
    if (config.bot_command_channels) {
      if (!Array.isArray(config.bot_command_channels)) {
        throw new BadRequestException('bot_command_channels must be an array');
      }

      for (const channel of config.bot_command_channels) {
        if (typeof channel !== 'object' || !channel.id || !channel.name) {
          throw new BadRequestException(
            'Each bot_command_channel must be an object with id and name',
          );
        }
      }
    }
  }
}
