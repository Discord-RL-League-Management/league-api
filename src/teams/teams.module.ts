import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LeaguesModule } from '../leagues/leagues.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { TeamService } from './services/team.service';
import { TeamRepository } from './repositories/team.repository';
import { TeamValidationService } from './services/team-validation.service';
import { TeamsController } from './teams.controller';
import { InternalTeamsController } from './internal-teams.controller';
import { TeamProviderAdapter } from './adapters/team-provider.adapter';
import { OrganizationTeamProviderAdapter } from './adapters/organization-team-provider.adapter';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => LeaguesModule),
    forwardRef(() => OrganizationsModule),
  ],
  controllers: [TeamsController, InternalTeamsController],
  providers: [
    TeamService,
    TeamRepository,
    TeamValidationService,
    {
      provide: 'ITeamProvider',
      useClass: TeamProviderAdapter,
    },
    {
      provide: 'IOrganizationTeamProvider',
      useClass: OrganizationTeamProviderAdapter,
    },
  ],
  exports: [
    TeamService,
    TeamRepository,
    'ITeamProvider',
    'IOrganizationTeamProvider',
  ],
})
export class TeamsModule {}
