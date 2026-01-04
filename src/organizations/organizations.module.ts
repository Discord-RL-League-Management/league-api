import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrganizationRepository } from './repositories/organization.repository';
import { OrganizationService } from './services/organization.service';
import { OrganizationMemberService } from './services/organization-member.service';
import { OrganizationValidationService } from './services/organization-validation.service';
import { OrganizationsController } from './organizations.controller';
import { InternalOrganizationsController } from './internal-organizations.controller';
import { LeaguesModule } from '../leagues/leagues.module';
import { PlayersModule } from '../players/players.module';
import { TeamsModule } from '../teams/teams.module';
import { OrganizationProviderAdapter } from './adapters/organization-provider.adapter';
import { OrganizationAuthorizationService } from './services/organization-authorization.service';
import { OrganizationGmGuard } from './guards/organization-gm.guard';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => LeaguesModule),
    PlayersModule,
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
      provide: 'IOrganizationProvider',
      useClass: OrganizationProviderAdapter,
    },
  ],
  exports: [
    OrganizationRepository,
    OrganizationService,
    OrganizationMemberService,
    OrganizationValidationService,
    OrganizationAuthorizationService,
    OrganizationGmGuard,
    'IOrganizationProvider',
  ],
})
export class OrganizationsModule {}
