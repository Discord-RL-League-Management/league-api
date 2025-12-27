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
import { ScheduledTrackerProcessingService } from './services/scheduled-tracker-processing.service';
import { ScheduledTrackerProcessingRepository } from './repositories/scheduled-tracker-processing.repository';
import { CronJobSchedulerService } from './services/cron-job-scheduler.service';
import { ScheduledJobLifecycleManager } from './services/scheduled-job-lifecycle-manager.service';
import { AuditModule } from '../audit/audit.module';
import { MmrCalculationModule } from '../mmr-calculation/mmr-calculation.module';
import { GuildsModule } from '../guilds/guilds.module';
import { TrackerProcessingGuardService } from './services/tracker-processing-guard.service';
import { TrackerUserOrchestratorService } from './services/tracker-user-orchestrator.service';
import { TrackerQueueOrchestratorService } from './services/tracker-queue-orchestrator.service';
import { TrackerBatchProcessorService } from './services/tracker-batch-processor.service';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => InfrastructureModule),
    forwardRef(() => AuditModule),
    MmrCalculationModule,
    forwardRef(() => GuildsModule),
    HttpModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisConfig = configService.get<{
          host?: string;
          port?: number;
          password?: string;
          db?: number;
        }>('redis');
        return {
          connection: {
            host: redisConfig?.host || 'localhost',
            port: redisConfig?.port || 6379,
            password: redisConfig?.password,
            db: redisConfig?.db || 0,
          },
        };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueueAsync({
      name: TRACKER_SCRAPING_QUEUE,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _queueConfig =
          configService.get<Record<string, unknown>>('queue');
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
    TrackerProcessingGuardService,
    TrackerUserOrchestratorService,
    TrackerQueueOrchestratorService,
    TrackerBatchProcessorService,
    ScheduledTrackerProcessingService,
    ScheduledTrackerProcessingRepository,
    CronJobSchedulerService,
    ScheduledJobLifecycleManager,
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
    ScheduledTrackerProcessingService,
  ],
})
export class TrackersModule {}
