import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { TRACKER_REGISTRATION_QUEUE } from './queues/tracker-registration.queue';
import { TrackerRegistrationProcessor } from './queues/tracker-registration.processor';
import { TrackerRegistrationQueueService } from './queues/tracker-registration.queue';
import { TrackerRegistrationService } from './services/tracker-registration.service';
import { TrackerService } from './services/tracker.service';
import { TrackerSnapshotService } from './services/tracker-snapshot.service';
import { TrackerNotificationService } from './services/tracker-notification.service';
import { TrackerRepository } from './repositories/tracker.repository';
import { TrackerSnapshotRepository } from './repositories/tracker-snapshot.repository';
import { TrackerRegistrationRepository } from './repositories/tracker-registration.repository';
import { TrackerRegistrationController } from './controllers/tracker-registration.controller';
import { TrackerController } from './controllers/tracker.controller';
import { TrackerQueueAdminController } from './controllers/tracker-queue-admin.controller';
import { TrackerQueueHealthController } from './controllers/tracker-queue-health.controller';
import { TrackerRegistrationProcessingService } from './services/tracker-registration-processing.service';
import { DiscordMessageService } from './services/discord-message.service';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { NotificationBuilderService } from './services/notification-builder.service';
import { TrackerValidationService } from './services/tracker-validation.service';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => InfrastructureModule),
    HttpModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisConfig = configService.get('redis');
        return {
          connection: {
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password,
            db: redisConfig.db,
          },
        };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueueAsync({
      name: TRACKER_REGISTRATION_QUEUE,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const queueConfig = configService.get('queue');
        return {
          defaultJobOptions: queueConfig.defaultJobOptions || {
            removeOnComplete: 100,
            removeOnFail: false, // Keep failed jobs for DLQ inspection
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [
    TrackerRegistrationController,
    TrackerController,
    TrackerQueueAdminController,
    TrackerQueueHealthController,
  ],
  providers: [
    TrackerRegistrationProcessor,
    TrackerRegistrationQueueService,
    TrackerRegistrationService,
    TrackerService,
    TrackerSnapshotService,
    TrackerNotificationService,
    TrackerValidationService,
    TrackerRepository,
    TrackerSnapshotRepository,
    TrackerRegistrationRepository,
    TrackerRegistrationProcessingService,
    DiscordMessageService,
    NotificationBuilderService,
  ],
  exports: [
    TrackerRegistrationService,
    TrackerService,
    TrackerSnapshotService,
    TrackerRegistrationQueueService,
  ],
})
export class TrackersModule {}

