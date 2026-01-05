import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { TRACKER_SCRAPING_QUEUE } from './queues/tracker-scraping.queue';
import { TrackerScrapingQueueService } from './queues/tracker-scraping.queue';
import { TrackerScrapingProcessor } from './queues/tracker-scraping.processor';
import { TrackerService } from './services/tracker.service';
import { TrackerProcessingService } from './services/tracker-processing.service';
import { TrackerSnapshotService } from './services/tracker-snapshot.service';
import { TrackerNotificationService } from './services/tracker-notification.service';
import { TrackerRepository } from './repositories/tracker.repository';
import { TrackerSnapshotRepository } from './repositories/tracker-snapshot.repository';
import { TrackerSeasonRepository } from './repositories/tracker-season.repository';
import { TrackerScrapingLogRepository } from './repositories/tracker-scraping-log.repository';
import { ScheduledTrackerProcessingRepository } from './repositories/scheduled-tracker-processing.repository';
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
import { MmrCalculationModule } from '../mmr-calculation/mmr-calculation.module';
import { GuildsModule } from '../guilds/guilds.module';
import { TrackerProcessingGuardService } from './services/tracker-processing-guard.service';
import { TrackerUserOrchestratorService } from './services/tracker-user-orchestrator.service';
import { TrackerQueueOrchestratorService } from './services/tracker-queue-orchestrator.service';
import { TrackerBatchProcessorService } from './services/tracker-batch-processor.service';
import { TrackerResponseMapperService } from './services/tracker-response-mapper.service';
import { TrackerAuthorizationService } from './services/tracker-authorization.service';
import { TrackerAccessGuard } from './guards/tracker-access.guard';
import { GuildMembersModule } from '../guild-members/guild-members.module';
import { PermissionCheckModule } from '../permissions/modules/permission-check/permission-check.module';
import { AuthorizationModule } from '../common/authorization/authorization.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    PrismaModule,
    InfrastructureModule,
    MmrCalculationModule,
    GuildsModule,
    GuildMembersModule, // Required for TrackerProcessingGuardService (GuildMemberRepository)
    PermissionCheckModule,
    AuthorizationModule, // Required for SystemAdminGuard (AuthorizationService)
    UsersModule, // Required for TrackerUserOrchestratorService and TrackerNotificationService (UserRepository)
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
        const connectionConfig = {
          host: redisConfig?.host || 'localhost',
          port: redisConfig?.port || 6379,
          password: redisConfig?.password,
          db: redisConfig?.db || 0,
        };
        return {
          connection: connectionConfig,
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
    TrackerProcessingService,
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
    TrackerRepository,
    TrackerSnapshotRepository,
    TrackerSeasonRepository,
    TrackerScrapingLogRepository,
    ScheduledTrackerProcessingRepository,
    DiscordMessageService,
    NotificationBuilderService,
    TrackerResponseMapperService,
    TrackerAuthorizationService,
    TrackerAccessGuard,
  ],
  exports: [
    TrackerService,
    TrackerProcessingService,
    TrackerSnapshotService,
    TrackerScrapingQueueService,
    TrackerSeasonService,
    ScheduledTrackerProcessingService,
    TrackerAuthorizationService,
    TrackerAccessGuard,
  ],
})
export class TrackersModule {}
