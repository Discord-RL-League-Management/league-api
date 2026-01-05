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
import { LeagueRepositoryAccessAdapter } from './adapters/league-repository-access.adapter';
import { LeagueAccessValidationService } from './services/league-access-validation.service';
import { LeaguePermissionService } from './services/league-permission.service';
import { LeagueAccessGuard } from './guards/league-access.guard';
import { LeagueAdminGuard } from './guards/league-admin.guard';
import { LeagueAdminOrModeratorGuard } from './guards/league-admin-or-moderator.guard';
import {
  ILEAGUE_SETTINGS_PROVIDER,
  ILEAGUE_REPOSITORY_ACCESS,
} from '../common/tokens/injection.tokens';

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
    LeagueAccessValidationService,
    LeaguePermissionService,
    LeagueAccessGuard,
    LeagueAdminGuard,
    LeagueAdminOrModeratorGuard,
    {
      provide: ILEAGUE_SETTINGS_PROVIDER,
      useFactory: (settingsService: LeagueSettingsService) => {
        return new LeagueSettingsProviderAdapter(settingsService);
      },
      inject: [LeagueSettingsService],
    },
    {
      provide: ILEAGUE_REPOSITORY_ACCESS,
      useFactory: (leagueRepository: LeagueRepository) => {
        return new LeagueRepositoryAccessAdapter(leagueRepository);
      },
      inject: [LeagueRepository],
    },
  ],
  exports: [
    LeaguesService,
    LeagueSettingsService,
    LeagueSettingsDefaultsService,
    LeagueRepository,
    ILEAGUE_SETTINGS_PROVIDER,
    ILEAGUE_REPOSITORY_ACCESS,
    LeagueAccessValidationService,
    LeaguePermissionService,
    LeagueAccessGuard,
    LeagueAdminGuard,
    LeagueAdminOrModeratorGuard,
  ],
})
export class LeaguesModule {}
