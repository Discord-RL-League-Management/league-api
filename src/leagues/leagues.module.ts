import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { CacheModule } from '@nestjs/cache-manager';
import { AuthModule } from '../auth/auth.module';
import { GuildsModule } from '../guilds/guilds.module';
import { PlayersModule } from '../players/players.module';
import { LeagueMembersModule } from '../league-members/league-members.module';
import { PermissionCheckModule } from '../permissions/modules/permission-check/permission-check.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { TeamsModule } from '../teams/teams.module';

import { LeaguesController } from './leagues.controller';
import { InternalLeaguesController } from './internal-leagues.controller';
import { LeagueSettingsController } from './league-settings.controller';

import { LeaguesService } from './leagues.service';
import { LeagueSettingsService } from './league-settings.service';
import { LeagueSettingsDefaultsService } from './services/league-settings-defaults.service';
import { SettingsValidationService } from './services/settings-validation.service';
import { ConfigMigrationService } from './services/config-migration.service';

import { LeagueRepository } from './repositories/league.repository';

import { LeagueSettingsProviderAdapter } from './adapters/league-settings-provider.adapter';

@Module({
  imports: [
    PrismaModule,
    InfrastructureModule,
    CacheModule.register(),
    AuthModule,
    GuildsModule,
    PlayersModule,
    PermissionCheckModule,
    forwardRef(() => LeagueMembersModule),
    forwardRef(() => OrganizationsModule),
    forwardRef(() => TeamsModule),
  ],
  controllers: [
    LeaguesController,
    InternalLeaguesController,
    LeagueSettingsController,
  ],
  providers: [
    LeaguesService,
    LeagueSettingsService,
    LeagueSettingsDefaultsService,
    SettingsValidationService,
    ConfigMigrationService,
    LeagueRepository,
    {
      provide: 'ILeagueSettingsProvider',
      useClass: LeagueSettingsProviderAdapter,
    },
  ],
  exports: [
    LeaguesService,
    LeagueSettingsService,
    LeagueSettingsDefaultsService,
    LeagueRepository,
    'ILeagueSettingsProvider',
  ],
})
export class LeaguesModule {}
