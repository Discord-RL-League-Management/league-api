import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrganizationRepository } from './repositories/organization.repository';
import { OrganizationService } from './organization.service';
import { OrganizationMemberService } from './services/organization-member.service';
import { OrganizationValidationService } from './services/organization-validation.service';
import { OrganizationsController } from './organizations.controller';
import { InternalOrganizationsController } from './internal-organizations.controller';
import { PlayersModule } from '../players/players.module';
import { LeaguesModule } from '../leagues/leagues.module';
import { TeamsModule } from '../teams/teams.module';
import { OrganizationValidationProviderAdapter } from './adapters/organization-validation-provider.adapter';
import { OrganizationProviderAdapter } from './adapters/organization-provider.adapter';
import { OrganizationAuthorizationService } from './services/organization-authorization.service';
import { OrganizationGmGuard } from './guards/organization-gm.guard';
import {
  IORGANIZATION_PROVIDER,
  IORGANIZATION_VALIDATION_PROVIDER,
} from '../common/tokens/injection.tokens';

@Module({
  imports: [
    PrismaModule,
    PlayersModule,

    // INTENTIONAL: Circular dependency with LeaguesModule is properly handled.
    // - OrganizationsModule needs ILEAGUE_REPOSITORY_ACCESS and ILEAGUE_SETTINGS_PROVIDER (provided via ModuleRef lazy injection)
    // - LeaguesModule needs IOrganizationProvider (provided via ModuleRef lazy injection)
    // - Using forwardRef() is the NestJS-recommended pattern for module-level circular dependencies
    // Reference: https://docs.nestjs.com/fundamentals/circular-dependency
    // eslint-disable-next-line @trilon/detect-circular-reference
    forwardRef(() => LeaguesModule),
    // INTENTIONAL: Circular dependency with TeamsModule is properly handled.
    // - OrganizationsModule needs IORGANIZATION_TEAM_PROVIDER (provided via ModuleRef lazy injection in OrganizationService)
    // - TeamsModule needs IORGANIZATION_VALIDATION_PROVIDER (constructor injection, one-way dependency)
    // - Using forwardRef() is the NestJS-recommended pattern for module-level circular dependencies
    // Reference: https://docs.nestjs.com/fundamentals/circular-dependency
    // eslint-disable-next-line @trilon/detect-circular-reference
    forwardRef(() => TeamsModule),
  ],
  controllers: [OrganizationsController, InternalOrganizationsController],
  providers: [
    OrganizationRepository,
    OrganizationService,
    OrganizationMemberService,
    OrganizationValidationService,
    OrganizationAuthorizationService,
    OrganizationGmGuard,
    {
      provide: IORGANIZATION_PROVIDER,
      useClass: OrganizationProviderAdapter,
    },
    {
      provide: IORGANIZATION_VALIDATION_PROVIDER,
      useClass: OrganizationValidationProviderAdapter,
    },
  ],
  exports: [
    OrganizationService,
    OrganizationMemberService,
    OrganizationValidationService,
    OrganizationAuthorizationService,
    OrganizationGmGuard,
    IORGANIZATION_PROVIDER,
    IORGANIZATION_VALIDATION_PROVIDER,
  ],
})
export class OrganizationsModule {}
