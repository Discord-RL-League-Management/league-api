import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  OnApplicationShutdown,
  Inject,
} from '@nestjs/common';
import { ILoggingService } from '../../logging/interfaces/logging.interface';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { OutboxStatus } from '@prisma/client';
import { OutboxService } from './outbox.service';
import { OutboxEventDispatcher } from './outbox-event-dispatcher.service';

/**
 * OutboxProcessorService - Single Responsibility: Background processing
 *
 * Polls for pending outbox events and processes them.
 * Handles retry logic and error recovery.
 * Implements OnApplicationShutdown to gracefully stop polling and wait for in-flight processing during application termination.
 */
@Injectable()
export class OutboxProcessorService
  implements OnModuleInit, OnModuleDestroy, OnApplicationShutdown
{
  private readonly serviceName = OutboxProcessorService.name;
  private pollInterval: NodeJS.Timeout | null = null;
  private readonly pollIntervalMs: number;
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxService,
    private readonly eventDispatcher: OutboxEventDispatcher,
    private readonly configService: ConfigService,
    @Inject(ILoggingService)
    private readonly loggingService: ILoggingService,
  ) {
    this.pollIntervalMs =
      this.configService.get<number>('outbox.pollIntervalMs') || 5000;
  }

  onModuleInit() {
    this.loggingService.log(
      `Starting outbox processor with interval ${this.pollIntervalMs}ms`,
      this.serviceName,
    );
    this.startPolling();
  }

  onModuleDestroy() {
    this.stopPolling();
  }

  async onApplicationShutdown(signal?: string) {
    this.loggingService.log(
      `Application shutting down: ${signal || 'unknown signal'}`,
      this.serviceName,
    );
    this.stopPolling();

    // Wait for in-flight processing with timeout to prevent shutdown from hanging indefinitely
    const maxWaitTime = 5000;
    const startTime = Date.now();
    while (this.isProcessing && Date.now() - startTime < maxWaitTime) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (this.isProcessing) {
      this.loggingService.warn(
        'Shutdown timeout reached, forcing stop of outbox processor',
        this.serviceName,
      );
      this.isProcessing = false;
    }

    this.loggingService.log('✅ Outbox processor stopped', this.serviceName);
  }

  private startPolling() {
    if (this.pollInterval) {
      return;
    }

    this.pollInterval = setInterval(() => {
      if (!this.isProcessing) {
        void this.processOutboxEvents().catch((error) => {
          this.loggingService.error(
            `Error in outbox processing loop: ${error instanceof Error ? error.message : String(error)}`,
            error instanceof Error ? error.stack : undefined,
            this.serviceName,
          );
        });
      }
    }, this.pollIntervalMs);
  }

  private stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Process pending outbox events
   */
  async processOutboxEvents(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      // Limit to 10 events per batch to prevent overload
      const pendingEvents = await this.outboxService.findPendingEvents(
        undefined,
        10,
      );

      if (pendingEvents.length === 0) {
        return;
      }

      this.loggingService.debug(
        `Processing ${pendingEvents.length} outbox events`,
        this.serviceName,
      );

      for (const event of pendingEvents) {
        try {
          await this.outboxService.updateStatus(
            event.id,
            OutboxStatus.PROCESSING,
          );

          await this.eventDispatcher.dispatchEvent(event);

          await this.outboxService.updateStatus(
            event.id,
            OutboxStatus.COMPLETED,
          );

          this.loggingService.debug(
            `Successfully processed outbox event ${event.id}`,
            this.serviceName,
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          const retryCount = event.retryCount + 1;

          this.loggingService.error(
            `Failed to process outbox event ${event.id}: ${errorMessage}`,
            error instanceof Error ? error.stack : undefined,
            this.serviceName,
          );

          // Mark as failed after 3 retries to prevent infinite retry loops
          const maxRetries = 3;
          const newStatus =
            retryCount >= maxRetries
              ? OutboxStatus.FAILED
              : OutboxStatus.PENDING;

          await this.outboxService.updateStatus(
            event.id,
            newStatus,
            errorMessage,
          );

          if (newStatus === OutboxStatus.FAILED) {
            this.loggingService.error(
              `Outbox event ${event.id} failed after ${retryCount} retries`,
              undefined,
              this.serviceName,
            );
          }
        }
      }
    } catch (error) {
      this.loggingService.error(
        `Error processing outbox events: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Manually trigger outbox processing (useful for testing or manual intervention)
   */
  async processOutboxEventsNow(): Promise<void> {
    await this.processOutboxEvents();
  }
}
