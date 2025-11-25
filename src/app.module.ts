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
import { LeaguesModule } from './leagues/leagues.module';
import { PermissionsModule } from './permissions/permissions.module';
import { AuditModule } from './audit/audit.module';
import { TrackersModule } from './trackers/trackers.module';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { PlayersModule } from './players/players.module';
import { LeagueMembersModule } from './league-members/league-members.module';
import { TeamsModule } from './teams/teams.module';
import { TeamMembersModule } from './team-members/team-members.module';
import { MatchesModule } from './matches/matches.module';
import { PlayerStatsModule } from './player-stats/player-stats.module';
import { PlayerRatingsModule } from './player-ratings/player-ratings.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthLoggerMiddleware } from './common/middleware/auth-logger.middleware';
import { RequestContextInterceptor } from './common/interceptors/request-context.interceptor';
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
    LeaguesModule,
    PermissionsModule,
    AuditModule,
    TrackersModule,
    InfrastructureModule,
    PlayersModule,
    LeagueMembersModule,
    TeamsModule,
    TeamMembersModule,
    MatchesModule,
    PlayerStatsModule,
    PlayerRatingsModule,
    TournamentsModule,
    OrganizationsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestContextInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // RequestContextInterceptor handles context setup via APP_INTERCEPTOR
    consumer.apply(AuthLoggerMiddleware).forRoutes('*');
  }
}
