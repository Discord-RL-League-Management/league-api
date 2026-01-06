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
    forwardRef(() => LeaguesModule),
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
    OrganizationRepository,
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
