import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
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
 */
@Injectable()
export class OutboxProcessorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxProcessorService.name);
  private pollInterval: NodeJS.Timeout | null = null;
  private readonly pollIntervalMs: number;
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxService,
    private readonly eventDispatcher: OutboxEventDispatcher,
    private readonly configService: ConfigService,
  ) {
    this.pollIntervalMs =
      this.configService.get<number>('outbox.pollIntervalMs') || 5000;
  }

  onModuleInit() {
    this.logger.log(
      `Starting outbox processor with interval ${this.pollIntervalMs}ms`,
    );
    this.startPolling();
  }

  onModuleDestroy() {
    this.stopPolling();
  }

  private startPolling() {
    if (this.pollInterval) {
      return;
    }

    this.pollInterval = setInterval(() => {
      if (!this.isProcessing) {
        this.processOutboxEvents().catch((error) => {
          this.logger.error('Error in outbox processing loop:', error);
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
      // Get pending outbox events (limit to prevent overload)
      const pendingEvents = await this.outboxService.findPendingEvents(
        undefined,
        10,
      );

      if (pendingEvents.length === 0) {
        return;
      }

      this.logger.debug(`Processing ${pendingEvents.length} outbox events`);

      for (const event of pendingEvents) {
        try {
          // Mark as processing
          await this.outboxService.updateStatus(
            event.id,
            OutboxStatus.PROCESSING,
          );

          // Dispatch event to appropriate queue
          await this.eventDispatcher.dispatchEvent(event);

          // Mark as completed
          await this.outboxService.updateStatus(
            event.id,
            OutboxStatus.COMPLETED,
          );

          this.logger.debug(`Successfully processed outbox event ${event.id}`);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          const retryCount = event.retryCount + 1;

          this.logger.error(
            `Failed to process outbox event ${event.id}: ${errorMessage}`,
          );

          // Mark as failed after max retries
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
            this.logger.error(
              `Outbox event ${event.id} failed after ${retryCount} retries`,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error('Error processing outbox events:', error);
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
