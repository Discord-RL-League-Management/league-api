import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TrackerRegistrationRepository } from '../repositories/tracker-registration.repository';
import { TrackerRegistrationQueueService } from '../queues/tracker-registration.queue';
import { TrackerRegistrationStatus, GamePlatform, Game, Prisma } from '@prisma/client';
import { TrackerValidationService } from './tracker-validation.service';
import { OutboxService } from '../../infrastructure/outbox/services/outbox.service';

@Injectable()
export class TrackerRegistrationService {
  private readonly logger = new Logger(TrackerRegistrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registrationRepository: TrackerRegistrationRepository,
    private readonly queueService: TrackerRegistrationQueueService,
    private readonly validationService: TrackerValidationService,
    private readonly outboxService: OutboxService,
  ) {}

  /**
   * Register a new tracker URL
   * Validates URL uniqueness and adds to queue for admin processing
   * Uses transaction to ensure atomicity and prevent race conditions
   */
  async registerTracker(
    userId: string,
    guildId: string,
    url: string,
  ): Promise<{ registrationId: string; status: string; message: string }> {
    // Validate and parse URL
    const validated = await this.validationService.validateTrackerUrl(url);

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          // Create registration record atomically
          const registration = await tx.trackerRegistration.create({
            data: {
              userId,
              guildId,
              url,
              game: validated.game,
              platform: validated.platform,
              username: validated.username,
            },
            include: {
              user: true,
              guild: true,
            },
          });

          // Write to outbox within the same transaction (Outbox Pattern)
          await this.outboxService.createEvent(
            tx,
            'tracker_registration',
            registration.id,
            'TRACKER_REGISTRATION_CREATED',
            {
              registrationId: registration.id,
              userId,
              guildId,
              url,
              submittedAt: new Date().toISOString(),
            },
          );

          this.logger.log(
            `Created tracker registration ${registration.id} with outbox event`,
          );

          return {
            registrationId: registration.id,
            status: 'PENDING',
            message:
              'You are registered. Your tracker is pending admin approval.',
          };
        },
        {
          maxWait: 5000,
          timeout: 10000,
        },
      );
    } catch (error) {
      // Handle Prisma unique constraint violations
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          // Unique constraint violation
          const field = (error.meta?.target as string[])?.[0] || 'field';
          if (field === 'url') {
            throw new BadRequestException(
              'That url has already been registered or is pending approval.',
            );
          }
          throw new BadRequestException(
            `Duplicate entry detected: ${field}`,
          );
        }
      }

      // Re-throw BadRequestException as-is
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Log unexpected errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Unexpected error during tracker registration: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException('Failed to register tracker');
    }
  }

  /**
   * Get the next pending registration for a guild
   */
  async getNextRegistration(guildId: string) {
    return this.registrationRepository.findNextPendingByGuild(guildId);
  }

  /**
   * Get registration by username for a guild
   */
  async getRegistrationByUser(guildId: string, username: string) {
    return this.registrationRepository.findByGuildAndUser(guildId, username);
  }

  /**
   * Get registration by ID
   */
  async getRegistrationById(registrationId: string) {
    const registration =
      await this.registrationRepository.findById(registrationId);
    if (!registration) {
      throw new NotFoundException('Registration not found');
    }
    return registration;
  }

  /**
   * Process a registration - create tracker from registration
   * Uses transaction to ensure atomicity between tracker creation and registration update
   */
  async processRegistration(
    registrationId: string,
    displayName: string | undefined,
    processedBy: string,
  ) {
    const registration = await this.getRegistrationById(registrationId);

    if (registration.status !== 'PENDING' && registration.status !== 'PROCESSING') {
      throw new BadRequestException(
        `Cannot process registration with status ${registration.status}`,
      );
    }

    if (!registration.platform || !registration.username) {
      throw new BadRequestException(
        'Registration is missing platform or username information.',
      );
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          // Create tracker atomically
          // platform and username are guaranteed non-null by validation check above
          const tracker = await tx.tracker.create({
            data: {
              url: registration.url,
              game: registration.game,
              platform: registration.platform!,
              username: registration.username!,
              userId: registration.userId,
              displayName,
            },
          });

          // Update registration with all fields atomically
          const updated = await tx.trackerRegistration.update({
            where: { id: registrationId },
            data: {
              status: 'COMPLETED',
              processedBy,
              processedAt: new Date(),
              trackerId: tracker.id,
            },
            include: {
              user: true,
              guild: true,
              processedByUser: true,
              tracker: true,
            },
          });

          this.logger.log(
            `Processed registration ${registrationId}, created tracker ${tracker.id}`,
          );

          return {
            tracker,
            registration: updated,
          };
        },
        {
          maxWait: 5000,
          timeout: 10000,
        },
      );
    } catch (error) {
      // Handle Prisma unique constraint violations
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const field = (error.meta?.target as string[])?.[0] || 'field';
          if (field === 'url') {
            throw new BadRequestException(
              'That url has already been registered.',
            );
          }
          throw new BadRequestException(
            `Duplicate entry detected: ${field}`,
          );
        }
      }

      // Log unexpected errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Unexpected error during registration processing: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException('Failed to process registration');
    }
  }

  /**
   * Reject a registration
   */
  async rejectRegistration(
    registrationId: string,
    reason: string,
    processedBy: string,
  ) {
    const registration = await this.getRegistrationById(registrationId);

    if (registration.status !== 'PENDING' && registration.status !== 'PROCESSING') {
      throw new BadRequestException(
        `Cannot reject registration with status ${registration.status}`,
      );
    }

    const updated = await this.registrationRepository.updateStatus(
      registrationId,
      'REJECTED',
      processedBy,
      reason,
    );

    this.logger.log(`Rejected registration ${registrationId}: ${reason}`);

    return updated;
  }

  /**
   * Get queue statistics for a guild
   */
  async getQueueStats(guildId: string) {
    return this.registrationRepository.getStatsByGuild(guildId);
  }
}

