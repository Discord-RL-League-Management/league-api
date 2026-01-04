import {
  Module,
  NestModule,
  MiddlewareConsumer,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_PIPE, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
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
import { CommonModule } from './common/common.module';
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
import { MmrCalculationModule } from './mmr-calculation/mmr-calculation.module';
import { AuthLoggerMiddleware } from './common/middleware/auth-logger.middleware';
import { RequestContextInterceptor } from './common/interceptors/request-context.interceptor';
import { AuthorizationAuditInterceptor } from './common/interceptors/authorization-audit.interceptor';
import { AuthorizationAuditExceptionFilter } from './common/filters/authorization-audit.filter';
import { throttlerConfig } from './config/throttler.config';
// Required for SchedulerRegistry dependency injection used by TrackerRefreshSchedulerService
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { FormulaValidationModule } from './formula-validation/formula-validation.module';

// Standard validation error message exported for consistent API responses across the application
export const VALIDATION_FAILED_MESSAGE = 'Validation failed';

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
    CommonModule,
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
    MmrCalculationModule,
    FormulaValidationModule,
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
    {
      provide: APP_INTERCEPTOR,
      useClass: AuthorizationAuditInterceptor,
    },
    {
      provide: APP_PIPE,
      useFactory: (configService: ConfigService) => {
        return new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
          transformOptions: {
            enableImplicitConversion: true,
          },
          exceptionFactory: (errors) => {
            const formattedErrors: Array<{
              property: string;
              constraints?: Record<string, string>;
              value: unknown;
            }> = errors.map((error) => ({
              property: error.property,
              constraints: error.constraints as
                | Record<string, string>
                | undefined,
              value: error.value as unknown,
            }));
            return new BadRequestException({
              message: VALIDATION_FAILED_MESSAGE,
              errors: formattedErrors as Array<{
                property: string;
                constraints?: Record<string, string>;
                value: unknown;
              }>,
            });
          },
          stopAtFirstError: true,
          skipMissingProperties: false,
          skipNullProperties: false,
          skipUndefinedProperties: false,
          disableErrorMessages:
            configService.get<string>('app.nodeEnv') === 'production',
        });
      },
      inject: [ConfigService],
    },
    // PrismaExceptionFilter must run first to catch database errors before the catch-all GlobalExceptionFilter
    {
      provide: APP_FILTER,
      useClass: PrismaExceptionFilter,
    },
    // AuthorizationAuditExceptionFilter runs after PrismaExceptionFilter but before GlobalExceptionFilter
    // to log authorization denials while still allowing GlobalExceptionFilter to handle the response
    {
      provide: APP_FILTER,
      useClass: AuthorizationAuditExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthLoggerMiddleware).forRoutes('*');
  }
}
