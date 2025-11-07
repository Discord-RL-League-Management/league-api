import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TrackerRegistrationJobData } from './tracker-registration.interfaces';

export const TRACKER_REGISTRATION_QUEUE = 'tracker-registration-queue';

/**
 * Service for interacting with the tracker registration queue
 * This is a helper service - the actual queue is injected via @InjectQueue
 */
export class TrackerRegistrationQueueService {
  constructor(
    @InjectQueue(TRACKER_REGISTRATION_QUEUE)
    private readonly queue: Queue<TrackerRegistrationJobData>,
  ) {}

  /**
   * Add a job to the tracker registration queue
   */
  async addJob(data: TrackerRegistrationJobData): Promise<string> {
    const job = await this.queue.add('process-registration', data, {
      jobId: `registration-${data.registrationId}`,
    });
    return job.id!;
  }

  /**
   * Get the queue instance (for advanced operations)
   */
  getQueue(): Queue<TrackerRegistrationJobData> {
    return this.queue;
  }
}

