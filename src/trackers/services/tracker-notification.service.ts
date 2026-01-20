import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { TrackerRepository } from '../repositories/tracker.repository';
import { UserRepository } from '../../users/repositories/user.repository';
import { Tracker } from '@prisma/client';

@Injectable()
export class TrackerNotificationService {
  private readonly logger = new Logger(TrackerNotificationService.name);
  private readonly frontendUrl: string;
  private readonly botWebhookUrl: string;
  private readonly botApiKey: string;
  // In-memory Map to store interactionToken -> applicationId mapping
  // Clears on restart, which is acceptable since it's only needed during async processing window
  private readonly applicationIdMap = new Map<string, string>();

  constructor(
    private readonly configService: ConfigService,
    private readonly trackerRepository: TrackerRepository,
    private readonly userRepository: UserRepository,
    private readonly httpService: HttpService,
  ) {
    this.frontendUrl = this.configService.get<string>('frontend.url') || '';
    this.botWebhookUrl = this.configService.get<string>('bot.webhookUrl') || '';
    this.botApiKey = this.configService.get<string>('auth.botApiKey') || '';
  }

  /**
   * Send webhook notification to bot when scraping completes successfully
   * Bot service will construct and send Discord messages
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
      const user = await this.userRepository.findById(userId);

      if (!user) {
        this.logger.warn(`User ${userId} not found, cannot send notification`);
        return;
      }

      const tracker = await this.trackerRepository.findById(trackerId);

      if (!tracker) {
        this.logger.warn(
          `Tracker ${trackerId} not found, cannot send notification`,
        );
        return;
      }

      // If botWebhookUrl is not configured, log warning and skip
      if (!this.botWebhookUrl) {
        this.logger.warn(
          `Bot webhook URL not configured, skipping scraping complete notification for tracker ${trackerId}`,
        );
        return;
      }

      // Build webhook payload with structured data
      const webhookUrl = this.botWebhookUrl.includes(
        '/webhooks/tracker-scraping-complete',
      )
        ? this.botWebhookUrl
        : `${this.botWebhookUrl}/webhooks/tracker-scraping-complete`;

      const payload = {
        type: 'tracker_scraping_complete',
        userId,
        trackerId,
        tracker: {
          url: tracker.url,
          platform: tracker.platform,
          game: tracker.game,
          username: tracker.username,
        },
        user: {
          id: user.id,
          username: user.username,
          globalName: user.globalName,
        },
        seasonsScraped: seasonsScraped || 0,
        seasonsFailed: seasonsFailed || 0,
        frontendUrl: this.frontendUrl,
      };

      await firstValueFrom(
        this.httpService.post(webhookUrl, payload, {
          headers: {
            Authorization: `Bearer ${this.botApiKey}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      this.logger.log(
        `Sent scraping complete webhook notification for tracker ${trackerId} to user ${userId}`,
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
   * Send webhook notification to bot when scraping fails
   * Bot service will construct and send Discord messages
   */
  async sendScrapingFailedNotification(
    trackerId: string,
    userId: string,
    error: string,
  ): Promise<void> {
    try {
      // Get tracker info including channel context
      const tracker = await this.trackerRepository.findById(trackerId);

      if (!tracker) {
        this.logger.warn(
          `Tracker ${trackerId} not found, cannot send notification`,
        );
        return;
      }

      const user = await this.userRepository.findById(userId);

      if (!user) {
        this.logger.warn(`User ${userId} not found, cannot send notification`);
        return;
      }

      // If botWebhookUrl is not configured, log warning and skip
      if (!this.botWebhookUrl) {
        this.logger.warn(
          `Bot webhook URL not configured, skipping scraping failed notification for tracker ${trackerId}`,
        );
        return;
      }

      // Build webhook payload with structured data
      const webhookUrl = this.botWebhookUrl.includes(
        '/webhooks/tracker-scraping-failed',
      )
        ? this.botWebhookUrl
        : `${this.botWebhookUrl}/webhooks/tracker-scraping-failed`;

      const payload = {
        type: 'tracker_scraping_failed',
        userId,
        trackerId,
        tracker: {
          url: tracker.url,
          platform: tracker.platform,
          game: tracker.game,
          username: tracker.username,
          registrationInteractionToken: tracker.registrationInteractionToken,
          registrationChannelId: tracker.registrationChannelId,
        },
        user: {
          id: user.id,
          username: user.username,
          globalName: user.globalName,
        },
        error,
        frontendUrl: this.frontendUrl,
      };

      await firstValueFrom(
        this.httpService.post(webhookUrl, payload, {
          headers: {
            Authorization: `Bearer ${this.botApiKey}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      this.logger.log(
        `Sent scraping failed webhook notification for tracker ${trackerId} to user ${userId}`,
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
  sendScrapingProgressNotification(
    trackerId: string,
    userId: string,
    progress: { current: number; total: number },
  ): void {
    try {
      this.logger.debug(
        `Scraping progress for tracker ${trackerId}: ${progress.current}/${progress.total} seasons`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send scraping progress notification: ${errorMessage}`,
        error,
      );
    }
  }

  /**
   * Register applicationId for a given interactionToken
   * Used to map interaction tokens to application IDs for webhook notifications
   *
   * @param interactionToken - Discord interaction token
   * @param applicationId - Discord application ID
   */
  registerApplicationId(interactionToken: string, applicationId: string): void {
    this.applicationIdMap.set(interactionToken, applicationId);
    this.logger.debug(
      `Registered applicationId for token ${interactionToken.substring(0, 10)}...`,
    );
  }

  /**
   * Get applicationId for a given interactionToken
   *
   * @param interactionToken - Discord interaction token
   * @returns applicationId if found, undefined otherwise
   */
  getApplicationId(interactionToken: string): string | undefined {
    return this.applicationIdMap.get(interactionToken);
  }

  /**
   * Send registration summary when all trackers from a force-processed registration complete
   * Sends webhook to bot service only - bot handles all Discord message delivery
   *
   * @param interactionToken - Discord interaction token
   * @param trackers - All trackers from the registration
   * @param applicationId - Optional applicationId (will be looked up from map if not provided)
   */
  async sendRegistrationSummary(
    interactionToken: string,
    trackers: Tracker[],
    applicationId?: string,
  ): Promise<void> {
    try {
      if (!interactionToken || trackers.length === 0) {
        this.logger.warn(
          'Cannot send registration summary: missing interaction token or no trackers',
        );
        return;
      }

      // If botWebhookUrl is not configured, log warning and skip
      if (!this.botWebhookUrl) {
        this.logger.warn(
          `Bot webhook URL not configured, skipping registration summary for token ${interactionToken.substring(0, 10)}...`,
        );
        return;
      }

      // Look up applicationId from map if not provided
      const resolvedApplicationId =
        applicationId || this.getApplicationId(interactionToken);

      // Build summary data (structured, not formatted)
      const summaryData = this.buildRegistrationSummaryData(trackers);

      // Handle both base URL (http://localhost:3001) and full URL (http://localhost:3001/webhooks/registration-summary)
      const webhookUrl = this.botWebhookUrl.includes(
        '/webhooks/registration-summary',
      )
        ? this.botWebhookUrl
        : `${this.botWebhookUrl}/webhooks/registration-summary`;
      const payload = {
        interactionToken,
        applicationId: resolvedApplicationId || '',
        summary: summaryData,
      };

      await firstValueFrom(
        this.httpService.post(webhookUrl, payload, {
          headers: {
            Authorization: `Bearer ${this.botApiKey}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      this.logger.log(
        `Sent registration summary webhook for ${trackers.length} tracker(s) with token ${interactionToken.substring(0, 10)}...`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send registration summary: ${errorMessage}`,
        error,
      );
      // Don't throw - notification failures shouldn't break the scraping process
    }
  }

  /**
   * Build registration summary data (structured, not formatted)
   * Single Responsibility: Aggregate tracker results into structured data
   *
   * @param trackers - All trackers from the registration
   * @returns Structured data object with summary information
   */
  private buildRegistrationSummaryData(trackers: Tracker[]): {
    total: number;
    successful: number;
    failed: number;
    trackers: Array<{
      url: string;
      platform: string;
      status: 'COMPLETED' | 'FAILED';
      error?: string;
    }>;
  } {
    const successful = trackers.filter(
      (t) => t.scrapingStatus === 'COMPLETED',
    ).length;
    const failed = trackers.filter((t) => t.scrapingStatus === 'FAILED').length;

    return {
      total: trackers.length,
      successful,
      failed,
      trackers: trackers.map((tracker) => ({
        url: tracker.url,
        platform: tracker.platform,
        status: tracker.scrapingStatus as 'COMPLETED' | 'FAILED',
        ...(tracker.scrapingError && { error: tracker.scrapingError }),
      })),
    };
  }
}
