import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ScrapingJobData } from './tracker-scraping.interfaces';

export const TRACKER_SCRAPING_QUEUE = 'tracker-scraping-queue';

/**
 * Service for interacting with the tracker scraping queue
 * Handles enqueueing scraping jobs for trackers
 */
export class TrackerScrapingQueueService {
  constructor(
    @InjectQueue(TRACKER_SCRAPING_QUEUE)
    private readonly queue: Queue<ScrapingJobData>,
  ) {}

  /**
   * Add a scraping job to the queue
   * @param trackerId - Tracker ID to scrape
   * @param priority - Optional job priority (higher = more priority)
   * @returns Job ID
   */
  async addScrapingJob(trackerId: string, priority?: number): Promise<string> {
    const job = await this.queue.add(
      'scrape-tracker',
      { trackerId },
      {
        jobId: `scraping-${trackerId}-${Date.now()}`,
        priority: priority || 0,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );
    return job.id!;
  }

  /**
   * Add multiple scraping jobs in batch
   * @param trackerIds - Array of tracker IDs to scrape
   * @returns Array of job IDs
   */
  async addBatchScrapingJobs(trackerIds: string[]): Promise<string[]> {
    const jobs = await Promise.all(
      trackerIds.map((trackerId) => this.addScrapingJob(trackerId)),
    );
    return jobs;
  }

  /**
   * Get the queue instance (for advanced operations)
   */
  getQueue(): Queue<ScrapingJobData> {
    return this.queue;
  }
}
