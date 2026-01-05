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
import { throttlerConfig } from './config/throttler.config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { FormulaValidationModule } from './formula-validation/formula-validation.module';

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
    PlayersModule,
    PlayerRatingsModule,
    LeagueMembersModule,
    OrganizationsModule,
    TeamsModule,
    LeaguesModule,
    PermissionsModule,
    TrackersModule,
    InfrastructureModule,
    TeamMembersModule,
    MatchesModule,
    PlayerStatsModule,
    TournamentsModule,
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
