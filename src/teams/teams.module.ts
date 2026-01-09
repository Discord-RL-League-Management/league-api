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
import {
  ITEAM_PROVIDER,
  IORGANIZATION_TEAM_PROVIDER,
} from '../common/tokens/injection.tokens';

@Module({
  imports: [
    PrismaModule,

    // INTENTIONAL: Circular dependency with LeaguesModule is properly handled.
    // - TeamsModule needs ILEAGUE_SETTINGS_PROVIDER (provided via ModuleRef lazy injection in TeamValidationService)
    // - LeaguesModule needs ITeamProvider (provided via ModuleRef lazy injection)
    // - Using forwardRef() is the NestJS-recommended pattern for module-level circular dependencies
    // Reference: https://docs.nestjs.com/fundamentals/circular-dependency
    // eslint-disable-next-line @trilon/detect-circular-reference
    forwardRef(() => LeaguesModule),
    // INTENTIONAL: Circular dependency with OrganizationsModule is properly handled.
    // - TeamsModule needs IORGANIZATION_VALIDATION_PROVIDER (constructor injection, one-way dependency)
    // - OrganizationsModule needs IORGANIZATION_TEAM_PROVIDER (provided via ModuleRef lazy injection)
    // - Using forwardRef() is the NestJS-recommended pattern for module-level circular dependencies
    // Reference: https://docs.nestjs.com/fundamentals/circular-dependency
    // eslint-disable-next-line @trilon/detect-circular-reference
    forwardRef(() => OrganizationsModule),
  ],
  controllers: [TeamsController, InternalTeamsController],
  providers: [
    TeamService,
    TeamRepository,
    TeamValidationService,
    {
      provide: ITEAM_PROVIDER,
      useClass: TeamProviderAdapter,
    },
    {
      provide: IORGANIZATION_TEAM_PROVIDER,
      useClass: OrganizationTeamProviderAdapter,
    },
  ],
  exports: [TeamService, ITEAM_PROVIDER, IORGANIZATION_TEAM_PROVIDER],
})
export class TeamsModule {}
