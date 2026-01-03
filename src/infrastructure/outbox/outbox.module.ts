import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { OutboxService } from './services/outbox.service';
import { OutboxProcessorService } from './services/outbox-processor.service';
import { OutboxEventDispatcher } from './services/outbox-event-dispatcher.service';
import { OutboxRepository } from './repositories/outbox.repository';

/**
 * OutboxModule - Infrastructure module for transactional outbox pattern
 *
 * Provides outbox functionality for any domain that needs reliable event publishing.
 * This module is domain-agnostic and can be used by any module.
 *
 * Note: TrackersModule import removed - OutboxEventDispatcher doesn't use it.
 * Infrastructure modules should not depend on domain modules.
 */
@Module({
  imports: [PrismaModule, ConfigModule],
  providers: [
    OutboxService,
    OutboxProcessorService,
    OutboxEventDispatcher,
    OutboxRepository,
  ],
  exports: [OutboxService, OutboxProcessorService],
})
export class OutboxModule {}
