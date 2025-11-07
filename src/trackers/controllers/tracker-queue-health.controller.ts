import {
  Controller,
  Get,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { TrackerRegistrationQueueService } from '../queues/tracker-registration.queue';

@ApiTags('Queue Health')
@Controller('api/health/queue')
export class TrackerQueueHealthController {
  private readonly logger = new Logger(TrackerQueueHealthController.name);

  constructor(
    private readonly queueService: TrackerRegistrationQueueService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get queue health metrics' })
  @ApiResponse({ status: 200, description: 'Queue health status' })
  async getQueueHealth() {
    try {
      const queue = this.queueService.getQueue();
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);

      const total = waiting + active + completed + failed + delayed;
      const health = {
        status: failed > 100 ? 'degraded' : 'healthy',
        metrics: {
          waiting,
          active,
          completed,
          failed,
          delayed,
          total,
        },
        timestamp: new Date().toISOString(),
      };

      return health;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get queue health: ${errorMessage}`);
      
      return {
        status: 'unhealthy',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get detailed queue metrics for monitoring' })
  @ApiResponse({ status: 200, description: 'Detailed queue metrics' })
  async getQueueMetrics() {
    try {
      const queue = this.queueService.getQueue();
      
      const [
        waiting,
        active,
        completed,
        failed,
        delayed,
        waitingJobs,
        activeJobs,
      ] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
        queue.getWaiting(0, 10),
        queue.getActive(0, 10),
      ]);

      // Calculate processing times for recent completed jobs
      const recentCompleted = await queue.getCompleted(0, 100);
      const processingTimes = recentCompleted
        .filter((job) => job.processedOn && job.finishedOn)
        .map(
          (job) =>
            (job.finishedOn || 0) - (job.processedOn || 0),
        );

      const avgProcessingTime =
        processingTimes.length > 0
          ? processingTimes.reduce((a, b) => a + b, 0) /
            processingTimes.length
          : 0;

      const metrics = {
        counts: {
          waiting,
          active,
          completed,
          failed,
          delayed,
          total: waiting + active + completed + failed + delayed,
        },
        performance: {
          averageProcessingTimeMs: Math.round(avgProcessingTime),
          sampleSize: processingTimes.length,
        },
        jobs: {
          waiting: waitingJobs.map((job) => ({
            id: job.id,
            name: job.name,
            timestamp: job.timestamp,
          })),
          active: activeJobs.map((job) => ({
            id: job.id,
            name: job.name,
            processedOn: job.processedOn,
          })),
        },
        timestamp: new Date().toISOString(),
      };

      return metrics;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get queue metrics: ${errorMessage}`);
      throw error;
    }
  }
}





