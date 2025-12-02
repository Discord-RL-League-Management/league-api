import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { TRACKER_SCRAPING_QUEUE } from './queues/tracker-scraping.queue';
import { TrackerScrapingQueueService } from './queues/tracker-scraping.queue';
import { TrackerScrapingProcessor } from './queues/tracker-scraping.processor';
import { TrackerService } from './services/tracker.service';
import { TrackerSnapshotService } from './services/tracker-snapshot.service';
import { TrackerNotificationService } from './services/tracker-notification.service';
import { TrackerRepository } from './repositories/tracker.repository';
import { TrackerSnapshotRepository } from './repositories/tracker-snapshot.repository';
import { TrackerController } from './controllers/tracker.controller';
import { TrackerAdminController } from './controllers/tracker-admin.controller';
import { DiscordMessageService } from './services/discord-message.service';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { NotificationBuilderService } from './services/notification-builder.service';
import { TrackerValidationService } from './services/tracker-validation.service';
import { TrackerUrlConverterService } from './services/tracker-url-converter.service';
import { TrackerScraperService } from './services/tracker-scraper.service';
import { TrackerSeasonService } from './services/tracker-season.service';
import { TrackerRefreshSchedulerService } from './services/tracker-refresh-scheduler.service';
import { TrackerBatchRefreshService } from './services/tracker-batch-refresh.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => InfrastructureModule),
    forwardRef(() => AuditModule),
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
      name: TRACKER_SCRAPING_QUEUE,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const queueConfig = configService.get('queue');
        return {
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 50,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
            timeout: 300000, // 5 minutes for scraping jobs
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [TrackerController, TrackerAdminController],
  providers: [
    TrackerService,
    TrackerSnapshotService,
    TrackerNotificationService,
    TrackerValidationService,
    TrackerUrlConverterService,
    TrackerScraperService,
    TrackerSeasonService,
    TrackerScrapingQueueService,
    TrackerScrapingProcessor,
    TrackerRefreshSchedulerService,
    TrackerBatchRefreshService,
    TrackerRepository,
    TrackerSnapshotRepository,
    DiscordMessageService,
    NotificationBuilderService,
  ],
  exports: [
    TrackerService,
    TrackerSnapshotService,
    TrackerScrapingQueueService,
    TrackerSeasonService,
  ],
})
export class TrackersModule {}
