import {
  Module,
  NestModule,
  MiddlewareConsumer,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_PIPE, APP_FILTER } from '@nestjs/core';
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
import { MmrCalculationModule } from './mmr-calculation/mmr-calculation.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthLoggerMiddleware } from './common/middleware/auth-logger.middleware';
import { RequestContextInterceptor } from './common/interceptors/request-context.interceptor';
import { throttlerConfig } from './config/throttler.config';
// Required for SchedulerRegistry dependency injection used by TrackerRefreshSchedulerService
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

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
    MmrCalculationModule,
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
      provide: APP_PIPE,
      useFactory: (configService: ConfigService) => {
        return new ValidationPipe({
          // Strip properties that don't have decorators to prevent injection attacks
          whitelist: true,
          // Reject requests with non-whitelisted properties to catch typos and malicious input
          forbidNonWhitelisted: true,
          // Automatically transform payloads to match DTO types for type safety
          transform: true,
          // Enable automatic type conversion to reduce manual parsing and improve developer experience
          transformOptions: {
            enableImplicitConversion: true,
          },
          // Format validation errors consistently for better API consumer experience
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
          // Stop validation on first error to improve performance for invalid requests
          stopAtFirstError: true,
          // Explicitly require all properties to prevent silent failures from missing data
          skipMissingProperties: false,
          // Validate null values to ensure data integrity
          skipNullProperties: false,
          // Validate undefined values to catch missing required fields
          skipUndefinedProperties: false,
          // Hide detailed error messages in production to avoid exposing internal structure
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
