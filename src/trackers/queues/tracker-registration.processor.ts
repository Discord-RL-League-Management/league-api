import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import {
  TrackerRegistrationJobData,
  TrackerRegistrationJobResult,
} from './tracker-registration.interfaces';
import { TRACKER_REGISTRATION_QUEUE } from './tracker-registration.queue';
import { TrackerNotificationService } from '../services/tracker-notification.service';
import { TrackerRegistrationProcessingService } from '../services/tracker-registration-processing.service';
import { TrackerRegistrationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Processor(TRACKER_REGISTRATION_QUEUE)
export class TrackerRegistrationProcessor extends WorkerHost {
  private readonly logger = new Logger(TrackerRegistrationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly processingService: TrackerRegistrationProcessingService,
    private readonly notificationService: TrackerNotificationService,
  ) {
    super();
  }

  async process(
    job: Job<TrackerRegistrationJobData, TrackerRegistrationJobResult>,
  ): Promise<TrackerRegistrationJobResult> {
    const messageId = `job-${job.id}`;
    this.logger.log(
      `Processing tracker registration job ${job.id} for registration ${job.data.registrationId}`,
    );

    try {
      // Process registration with idempotency checks and atomic status updates
      const processingResult = await this.processingService.processRegistration(
        job.data,
        messageId,
      );

      // If already processed, return early
      if (processingResult.alreadyProcessed) {
        return {
          success: true,
          registrationId: job.data.registrationId,
          message: processingResult.message,
        };
      }

      // After transaction commits, send notification (idempotent)
      const currentRegistration = await this.prisma.trackerRegistration.findUnique({
        where: { id: job.data.registrationId },
      });

      if (!currentRegistration?.notificationSentAt) {
        try {
          await this.notificationService.sendRegistrationNotification(
            job.data.registrationId,
            job.data.guildId,
            job.data.userId,
            job.data.url,
          );

          // Mark notification as sent
          await this.prisma.trackerRegistration.update({
            where: { id: job.data.registrationId },
            data: {
              notificationSentAt: new Date(),
            },
          });
        } catch (notificationError) {
          // Re-throw to trigger job retry for notification
          throw notificationError;
        }
      } else {
        this.logger.debug(
          `Notification already sent for registration ${job.data.registrationId}, skipping`,
        );
      }

      this.logger.log(
        `Successfully processed registration ${job.data.registrationId}`,
      );

      return {
        success: true,
        registrationId: job.data.registrationId,
        message: 'Registration notification sent successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Error processing registration ${job.data.registrationId}: ${errorMessage}`,
        errorStack,
      );

      // Try to update status to FAILED (non-blocking if it fails)
      try {
        await this.prisma.trackerRegistration.update({
          where: { id: job.data.registrationId },
          data: { status: TrackerRegistrationStatus.FAILED },
        });
      } catch (updateError) {
        this.logger.error(
          `Failed to update registration status to FAILED: ${updateError}`,
        );
      }

      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<TrackerRegistrationJobData, TrackerRegistrationJobResult>) {
    this.logger.log(`Job ${job.id} completed successfully`);
  }

  @OnWorkerEvent('failed')
  onFailed(
    job: Job<TrackerRegistrationJobData, TrackerRegistrationJobResult>,
    error: Error,
  ) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`, error.stack);
  }
}

