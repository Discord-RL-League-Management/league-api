import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { TRACKER_SCRAPING_QUEUE } from './queues/tracker-scraping.queue';
import { TrackerScrapingQueueService } from './queues/tracker-scraping.queue';
import { TrackerScrapingProcessor } from './queues/tracker-scraping.processor';
import { TrackerService } from './tracker.service';
import { TrackerProcessingService } from './services/tracker-processing.service';
import { TrackerSnapshotService } from './services/tracker-snapshot.service';
import { TrackerNotificationService } from './services/tracker-notification.service';
import { TrackerRepository } from './repositories/tracker.repository';
import { TrackerSnapshotRepository } from './repositories/tracker-snapshot.repository';
import { TrackerSeasonRepository } from './repositories/tracker-season.repository';
import { TrackerScrapingLogRepository } from './repositories/tracker-scraping-log.repository';
import { ScheduledTrackerProcessingRepository } from './repositories/scheduled-tracker-processing.repository';
import { TrackerController } from './tracker.controller';
import { TrackerAdminController } from './tracker-admin.controller';
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
import { PlayersModule } from '../players/players.module';
import { PermissionCheckModule } from '../permissions/modules/permission-check/permission-check.module';
import { AuthorizationModule } from '../common/authorization/authorization.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    PrismaModule,
    InfrastructureModule,
    MmrCalculationModule,
    // INTENTIONAL: Circular dependency with GuildsModule is properly handled.
    // - TrackersModule needs GuildsService for tracker operations
    // - GuildsModule is part of a cycle: TokenManagementModule → UsersModule → GuildsModule → TokenManagementModule
    // - Using forwardRef() is the NestJS-recommended pattern for module-level circular dependencies
    // Reference: https://docs.nestjs.com/fundamentals/circular-dependency
    // eslint-disable-next-line @trilon/detect-circular-reference
    forwardRef(() => GuildsModule),
    // INTENTIONAL: Circular dependency with GuildMembersModule is properly handled.
    // - TrackersModule needs GuildMembersService to find user's guild memberships for player creation
    // - GuildMembersModule needs TrackerService to check if user has trackers for player creation
    // - Using forwardRef() is the NestJS-recommended pattern for module-level circular dependencies
    // Reference: https://docs.nestjs.com/fundamentals/circular-dependency
    // eslint-disable-next-line @trilon/detect-circular-reference
    forwardRef(() => GuildMembersModule),
    // INTENTIONAL: Circular dependency with PlayersModule is properly handled.
    // - TrackersModule needs PlayerService for automatic player creation after tracker scraping
    // - PlayersModule needs TrackersModule for player validation (checking if user has trackers)
    // - Using forwardRef() is the NestJS-recommended pattern for module-level circular dependencies
    // Reference: https://docs.nestjs.com/fundamentals/circular-dependency
    // eslint-disable-next-line @trilon/detect-circular-reference
    forwardRef(() => PlayersModule),
    PermissionCheckModule,
    AuthorizationModule,
    // INTENTIONAL: Circular dependency with UsersModule is properly handled.
    // - TrackersModule needs UsersService for tracker user operations (via TrackerUserOrchestratorService)
    // - UsersModule needs TrackerProcessingService for registerByStaff endpoint in InternalUsersController
    // - Using forwardRef() is the NestJS-recommended pattern for module-level circular dependencies
    // Reference: https://docs.nestjs.com/fundamentals/circular-dependency
    // eslint-disable-next-line @trilon/detect-circular-reference
    forwardRef(() => UsersModule),
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
      useFactory: () => {
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
