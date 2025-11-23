import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TrackerScrapingQueueService } from '../queues/tracker-scraping.queue';

@Injectable()
export class TrackerBatchRefreshService {
  private readonly logger = new Logger(TrackerBatchRefreshService.name);
  private readonly rateLimitDelay: number;

  constructor(
    private readonly scrapingQueueService: TrackerScrapingQueueService,
    private readonly configService: ConfigService,
  ) {
    // Delay between batches to respect rate limits
    // Default: 1 second delay between batches
    this.rateLimitDelay = 1000;
  }

  /**
   * Refresh multiple trackers
   * @param trackerIds - Array of tracker IDs to refresh
   */
  async refreshTrackers(trackerIds: string[]): Promise<void> {
    this.logger.log(`Refreshing ${trackerIds.length} trackers`);

    const jobIds = await this.scrapingQueueService.addBatchScrapingJobs(
      trackerIds,
    );

    this.logger.log(
      `Enqueued ${jobIds.length} scraping jobs for trackers`,
    );
  }

  /**
   * Refresh trackers in batches with rate limiting
   * @param trackerIds - Array of tracker IDs to refresh
   * @param batchSize - Number of trackers to process per batch
   */
  async refreshTrackersInBatches(
    trackerIds: string[],
    batchSize: number,
  ): Promise<void> {
    const totalBatches = Math.ceil(trackerIds.length / batchSize);
    this.logger.log(
      `Processing ${trackerIds.length} trackers in ${totalBatches} batches of ${batchSize}`,
    );

    for (let i = 0; i < trackerIds.length; i += batchSize) {
      const batch = trackerIds.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;

      this.logger.log(
        `Processing batch ${batchNumber}/${totalBatches} (${batch.length} trackers)`,
      );

      try {
        await this.refreshTrackers(batch);

        // Delay between batches to respect rate limits
        if (i + batchSize < trackerIds.length) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.rateLimitDelay),
          );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Error processing batch ${batchNumber}: ${errorMessage}`,
        );
        // Continue with next batch even if this one fails
      }
    }

    this.logger.log(`Completed batch refresh for ${trackerIds.length} trackers`);
  }
}

