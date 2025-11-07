import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { GuildSettings } from '../../guilds/interfaces/settings.interface';
import { DiscordMessageService } from './discord-message.service';
import { NotificationBuilderService } from './notification-builder.service';
import { SettingsService } from '../../infrastructure/settings/services/settings.service';

@Injectable()
export class TrackerNotificationService {
  private readonly logger = new Logger(TrackerNotificationService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
    private readonly discordMessageService: DiscordMessageService,
    private readonly notificationBuilderService: NotificationBuilderService,
  ) {
    this.frontendUrl = this.configService.get<string>('frontend.url') || '';
  }

  /**
   * Send a notification to the staff channel about a new tracker registration
   */
  async sendRegistrationNotification(
    registrationId: string,
    guildId: string,
    userId: string,
    url: string,
  ): Promise<void> {
    try {
      // Get guild settings to find staff channel
      const guildSettings = await this.settingsService.getSettings('guild', guildId);

      if (!guildSettings) {
        this.logger.warn(
          `No guild settings found for guild ${guildId}, cannot send notification`,
        );
        return;
      }

      const settings = guildSettings.settings as unknown as GuildSettings;
      const staffChannelId = this.getStaffChannelId(settings);

      if (!staffChannelId) {
        this.logger.warn(
          `No staff channel configured for guild ${guildId}, cannot send notification`,
        );
        return;
      }

      // Get user info
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        this.logger.warn(`User ${userId} not found, cannot send notification`);
        return;
      }

      // Build embed message using builder service
      const embed = this.notificationBuilderService.buildRegistrationNotificationEmbed(
        registrationId,
        user,
        url,
        this.frontendUrl,
      );

      // Send message to Discord channel using Discord service
      await this.discordMessageService.sendMessage(staffChannelId, {
        embeds: [embed],
      });

      this.logger.log(
        `Successfully sent registration notification for ${registrationId} to guild ${guildId}`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to send registration notification for ${registrationId}: ${errorMessage}`,
        errorStack,
      );
      // Throw error to trigger job retry
      throw error;
    }
  }

  /**
   * Get staff channel ID from guild settings
   * For now, we'll use the first bot_command_channel or look for a staff/admin channel
   */
  private getStaffChannelId(settings: GuildSettings): string | null {
    // Check if there's a specific staff channel in settings
    // For now, use the first bot_command_channel if available
    if (settings.bot_command_channels && settings.bot_command_channels.length > 0) {
      return settings.bot_command_channels[0].id;
    }

    // TODO: Add a specific staff_channel or admin_channel field to settings
    return null;
  }
}

