import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { ConfigModule as AppConfigModule } from './config/config.module';
import { LoggingModule } from './logging/logging.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { InternalModule } from './internal/internal.module';
import { UsersModule } from './users/users.module';
import { ProfileModule } from './profile/profile.module';
import { HealthModule } from './health/health.module';
import { GuildsModule } from './guilds/guilds.module';
import { GuildMembersModule } from './guild-members/guild-members.module';
import { PermissionsModule } from './permissions/permissions.module';
import { AuditModule } from './audit/audit.module';
import { TrackersModule } from './trackers/trackers.module';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { AuthLoggerMiddleware } from './common/middleware/auth-logger.middleware';
import { throttlerConfig } from './config/throttler.config';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    AppConfigModule,
    LoggingModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: throttlerConfig,
      inject: [ConfigService],
    }),
    PrismaModule,
    AuthModule,
    InternalModule,
    UsersModule,
    ProfileModule,
    HealthModule,
    GuildsModule,
    GuildMembersModule,
    PermissionsModule,
    AuditModule,
    TrackersModule,
    InfrastructureModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthLoggerMiddleware).forRoutes('*');
  }
}
