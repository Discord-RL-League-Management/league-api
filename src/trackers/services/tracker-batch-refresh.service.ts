import { Injectable, Inject } from '@nestjs/common';
import { TrackerScrapingQueueService } from '../queues/tracker-scraping.queue';
import type { IConfigurationService } from '../../infrastructure/configuration/interfaces/configuration.interface';
import type { ILoggingService } from '../../infrastructure/logging/interfaces/logging.interface';

@Injectable()
export class TrackerBatchRefreshService {
  private readonly serviceName = TrackerBatchRefreshService.name;
  private readonly rateLimitDelay: number;

  constructor(
    private readonly scrapingQueueService: TrackerScrapingQueueService,
    @Inject('IConfigurationService')
    private readonly configService: IConfigurationService,
    @Inject('ILoggingService')
    private readonly loggingService: ILoggingService,
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
    this.loggingService.log(
      `Refreshing ${trackerIds.length} trackers`,
      this.serviceName,
    );

    const jobIds =
      await this.scrapingQueueService.addBatchScrapingJobs(trackerIds);

    this.loggingService.log(
      `Enqueued ${jobIds.length} scraping jobs for trackers`,
      this.serviceName,
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
    this.loggingService.log(
      `Processing ${trackerIds.length} trackers in ${totalBatches} batches of ${batchSize}`,
      this.serviceName,
    );

    for (let i = 0; i < trackerIds.length; i += batchSize) {
      const batch = trackerIds.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;

      this.loggingService.log(
        `Processing batch ${batchNumber}/${totalBatches} (${batch.length} trackers)`,
        this.serviceName,
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
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.loggingService.error(
          `Error processing batch ${batchNumber}: ${errorMessage}`,
          error instanceof Error ? error.stack : undefined,
          this.serviceName,
        );
        // Continue with next batch even if this one fails
      }
    }

    this.loggingService.log(
      `Completed batch refresh for ${trackerIds.length} trackers`,
      this.serviceName,
    );
  }
}
