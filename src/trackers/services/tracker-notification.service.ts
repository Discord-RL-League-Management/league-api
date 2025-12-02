import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { DiscordMessageService } from './discord-message.service';
import { NotificationBuilderService } from './notification-builder.service';

@Injectable()
export class TrackerNotificationService {
  private readonly logger = new Logger(TrackerNotificationService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly discordMessageService: DiscordMessageService,
    private readonly notificationBuilderService: NotificationBuilderService,
  ) {
    this.frontendUrl = this.configService.get<string>('frontend.url') || '';
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
        this.logger.warn(
          `Tracker ${trackerId} not found, cannot send notification`,
        );
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
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send scraping complete notification: ${errorMessage}`,
        error,
      );
      // Don't throw - notification failures shouldn't break the scraping process
    }
  }

  /**
   * Send an ephemeral follow-up message when scraping fails
   * Replaces DM notifications with channel-based ephemeral messages
   */
  async sendScrapingFailedNotification(
    trackerId: string,
    userId: string,
    error: string,
  ): Promise<void> {
    try {
      // Get tracker info including channel context
      const tracker = await this.prisma.tracker.findUnique({
        where: { id: trackerId },
      });

      if (!tracker) {
        this.logger.warn(
          `Tracker ${trackerId} not found, cannot send notification`,
        );
        return;
      }

      // Only send ephemeral follow-up if we have an interaction token
      if (!tracker.registrationInteractionToken) {
        this.logger.debug(
          `No interaction token for tracker ${trackerId}, skipping notification`,
        );
        return;
      }

      // Get user info for embed
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        this.logger.warn(`User ${userId} not found, cannot send notification`);
        return;
      }

      // Build error embed (user-friendly, no backend details)
      const embed = this.notificationBuilderService.buildScrapingFailedEmbed(
        tracker,
        user,
        error,
        this.frontendUrl,
      );

      // Send ephemeral follow-up via Discord API
      await this.discordMessageService.sendEphemeralFollowUp(
        tracker.registrationInteractionToken,
        {
          embeds: [embed],
        },
      );

      this.logger.log(
        `Sent scraping failed ephemeral follow-up for tracker ${trackerId}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
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
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send scraping progress notification: ${errorMessage}`,
        error,
      );
    }
  }
}
