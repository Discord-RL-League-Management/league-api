import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TrackerRegistrationQueueService } from '../queues/tracker-registration.queue';
import { Job } from 'bullmq';

@ApiTags('Tracker Queue Admin')
@Controller('api/admin/queue')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TrackerQueueAdminController {
  private readonly logger = new Logger(TrackerQueueAdminController.name);

  constructor(
    private readonly queueService: TrackerRegistrationQueueService,
  ) {}

  @Get('failed')
  @ApiOperation({ summary: 'Get all failed jobs from the queue' })
  @ApiResponse({ status: 200, description: 'List of failed jobs' })
  async getFailedJobs() {
    try {
      const queue = this.queueService.getQueue();
      const failedJobs = await queue.getFailed(0, 100);

      return {
        total: failedJobs.length,
        jobs: failedJobs.map((job) => ({
          id: job.id,
          name: job.name,
          data: job.data,
          failedReason: job.failedReason,
          attemptsMade: job.attemptsMade,
          timestamp: job.timestamp,
          processedOn: job.processedOn,
          finishedOn: job.finishedOn,
        })),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get failed jobs: ${errorMessage}`);
      throw new BadRequestException('Failed to retrieve failed jobs');
    }
  }

  @Post('retry/:jobId')
  @ApiOperation({ summary: 'Retry a failed job' })
  @ApiParam({ name: 'jobId', description: 'Job ID to retry' })
  @ApiResponse({ status: 200, description: 'Job retried successfully' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async retryJob(@Param('jobId') jobId: string) {
    try {
      const queue = this.queueService.getQueue();
      const job = await queue.getJob(jobId);

      if (!job) {
        throw new NotFoundException(`Job ${jobId} not found`);
      }

      // Check if job is in failed state
      const state = await job.getState();
      if (state !== 'failed') {
        throw new BadRequestException(
          `Job ${jobId} is not in failed state (current: ${state})`,
        );
      }

      // Retry the job
      await job.retry();

      this.logger.log(`Retried failed job ${jobId}`);

      return {
        success: true,
        jobId,
        message: 'Job retried successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to retry job ${jobId}: ${errorMessage}`);
      throw new BadRequestException('Failed to retry job');
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get queue statistics' })
  @ApiResponse({ status: 200, description: 'Queue statistics' })
  async getQueueStats() {
    try {
      const queue = this.queueService.getQueue();
      const [waiting, active, completed, failed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
      ]);

      return {
        waiting,
        active,
        completed,
        failed,
        total: waiting + active + completed + failed,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get queue stats: ${errorMessage}`);
      throw new BadRequestException('Failed to retrieve queue statistics');
    }
  }
}





