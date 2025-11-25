import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { CommonModule } from '../common/common.module';
import { CacheModule } from '@nestjs/cache-manager';
import { AuthModule } from '../auth/auth.module';
import { GuildsModule } from '../guilds/guilds.module';
import { PlayersModule } from '../players/players.module';
import { LeagueMembersModule } from '../league-members/league-members.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { TeamsModule } from '../teams/teams.module';

// Controllers
import { LeaguesController } from './leagues.controller';
import { InternalLeaguesController } from './internal-leagues.controller';
import { LeagueSettingsController } from './league-settings.controller';

// Services
import { LeaguesService } from './leagues.service';
import { LeagueSettingsService } from './league-settings.service';
import { LeagueSettingsDefaultsService } from './services/league-settings-defaults.service';
import { SettingsValidationService } from './services/settings-validation.service';
import { ConfigMigrationService } from './services/config-migration.service';
import { LeagueAccessValidationService } from './services/league-access-validation.service';

// Repositories
import { LeagueRepository } from './repositories/league.repository';

@Module({
  imports: [
    PrismaModule,
    InfrastructureModule,
    CommonModule,
    CacheModule.register(),
    AuthModule,
    GuildsModule, // For GuildsService dependency
    PlayersModule, // For PlayerService dependency
    forwardRef(() => LeagueMembersModule), // For LeagueMemberRepository dependency (circular dependency resolved)
    forwardRef(() => OrganizationsModule), // For OrganizationService dependency (circular dependency resolved)
    forwardRef(() => TeamsModule), // For TeamRepository dependency (circular dependency resolved)
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
    LeagueAccessValidationService,
    LeagueRepository,
  ],
  exports: [
    LeaguesService,
    LeagueSettingsService,
    LeagueSettingsDefaultsService,
    LeagueRepository,
  ],
})
export class LeaguesModule {}


