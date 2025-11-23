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
   * DEPRECATED: Send a notification to the staff channel about a new tracker registration
   * This method is kept for backward compatibility during migration period
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

  /**
   * Send a DM to the user when scraping completes successfully
   * @param trackerId - Tracker ID
   * @param userId - User ID
   * @param seasonsScraped - Number of seasons successfully scraped
   * @param seasonsFailed - Number of seasons that failed to scrape
   */
  async sendScrapingCompleteNotification(
    trackerId: string,
    userId: string,
    seasonsScraped?: number,
    seasonsFailed?: number,
  ): Promise<void> {
    try {
      // Get user info
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        this.logger.warn(`User ${userId} not found, cannot send notification`);
        return;
      }

      // Get tracker info
      const tracker = await this.prisma.tracker.findUnique({
        where: { id: trackerId },
        include: {
          seasons: {
            orderBy: { seasonNumber: 'desc' },
            take: 1, // Get latest season for info
          },
        },
      });

      if (!tracker) {
        this.logger.warn(`Tracker ${trackerId} not found, cannot send notification`);
        return;
      }

      // Build success embed
      const embed = this.notificationBuilderService.buildScrapingCompleteEmbed(
        tracker,
        user,
        this.frontendUrl,
        seasonsScraped || 0,
        seasonsFailed || 0,
      );

      // Send DM to user via Discord API
      await this.discordMessageService.sendDirectMessage(userId, {
        embeds: [embed],
      });

      this.logger.log(
        `Sent scraping complete notification to user ${userId} for tracker ${trackerId}`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send scraping complete notification: ${errorMessage}`,
        error,
      );
      // Don't throw - notification failures shouldn't break the scraping process
    }
  }

  /**
   * Send a DM to the user when scraping fails
   */
  async sendScrapingFailedNotification(
    trackerId: string,
    userId: string,
    error: string,
  ): Promise<void> {
    try {
      // Get user info
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        this.logger.warn(`User ${userId} not found, cannot send notification`);
        return;
      }

      // Get tracker info
      const tracker = await this.prisma.tracker.findUnique({
        where: { id: trackerId },
      });

      if (!tracker) {
        this.logger.warn(`Tracker ${trackerId} not found, cannot send notification`);
        return;
      }

      // Build error embed
      const embed = this.notificationBuilderService.buildScrapingFailedEmbed(
        tracker,
        user,
        error,
        this.frontendUrl,
      );

      // Send DM to user via Discord API
      await this.discordMessageService.sendDirectMessage(userId, {
        embeds: [embed],
      });

      this.logger.log(
        `Sent scraping failed notification to user ${userId} for tracker ${trackerId}`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send scraping failed notification: ${errorMessage}`,
        error,
      );
      // Don't throw - notification failures shouldn't break the scraping process
    }
  }

  /**
   * Send a progress notification during multi-season scraping
   */
  async sendScrapingProgressNotification(
    trackerId: string,
    userId: string,
    progress: { current: number; total: number },
  ): Promise<void> {
    try {
      // For now, we'll just log progress
      // In a full implementation, you could send periodic updates
      this.logger.debug(
        `Scraping progress for tracker ${trackerId}: ${progress.current}/${progress.total} seasons`,
      );
      // TODO: Implement progress notifications if needed
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send scraping progress notification: ${errorMessage}`,
        error,
      );
    }
  }
}

