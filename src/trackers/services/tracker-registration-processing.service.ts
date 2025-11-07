import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TrackerRegistrationStatus } from '@prisma/client';
import { TrackerRegistrationJobData } from '../queues/tracker-registration.interfaces';
import { IdempotencyService } from '../../infrastructure/idempotency/services/idempotency.service';

export interface ProcessingResult {
  success: boolean;
  registrationId: string;
  message?: string;
  alreadyProcessed?: boolean;
  statusChanged?: boolean;
}

@Injectable()
export class TrackerRegistrationProcessingService {
  private readonly logger = new Logger(
    TrackerRegistrationProcessingService.name,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  /**
   * Process a registration job with idempotency checks and atomic status updates
   * @param jobData The job data containing registration information
   * @param messageId The unique message ID for idempotency checking
   * @returns Processing result with success status and details
   */
  async processRegistration(
    jobData: TrackerRegistrationJobData,
    messageId: string,
  ): Promise<ProcessingResult> {
    // Check if message was already processed (idempotency check)
    const isProcessed = await this.idempotencyService.isProcessed(messageId);

    if (isProcessed) {
      this.logger.warn(
        `Message ${messageId} already processed, skipping duplicate processing`,
      );
      return {
        success: true,
        registrationId: jobData.registrationId,
        message: 'Registration already processed (idempotent)',
        alreadyProcessed: true,
      };
    }

    // Use transaction for atomic state management
    return await this.prisma.$transaction(async (tx) => {
      // Atomic status update - only update if currently PENDING
      const registration = await tx.trackerRegistration.findUnique({
        where: { id: jobData.registrationId },
      });

      if (!registration) {
        throw new Error(
          `Registration ${jobData.registrationId} not found`,
        );
      }

      if (registration.status !== TrackerRegistrationStatus.PENDING) {
        this.logger.warn(
          `Registration ${jobData.registrationId} is not PENDING (current: ${registration.status}), skipping`,
        );
        return {
          success: true,
          registrationId: jobData.registrationId,
          message: `Registration already in ${registration.status} state`,
          alreadyProcessed: true,
          statusChanged: false,
        };
      }

      // Update status to PROCESSING atomically
      await tx.trackerRegistration.update({
        where: {
          id: jobData.registrationId,
          status: TrackerRegistrationStatus.PENDING, // Conditional update
        },
        data: {
          status: TrackerRegistrationStatus.PROCESSING,
          lastProcessedAt: new Date(),
        },
      });

      // Mark message as processed (idempotency)
      await this.idempotencyService.markProcessed(
        tx,
        messageId,
        'tracker_registration',
        jobData.registrationId,
        { jobId: jobData.jobId },
      );

      // Check if notification already sent (idempotent notification)
      if (!registration.notificationSentAt) {
        // Increment attempt count within transaction
        await tx.trackerRegistration.update({
          where: { id: jobData.registrationId },
          data: {
            notificationAttempts: {
              increment: 1,
            },
          },
        });
      }

      return {
        success: true,
        registrationId: jobData.registrationId,
        message: 'Registration status updated to PROCESSING',
        alreadyProcessed: false,
        statusChanged: true,
      };
    });
  }
}





