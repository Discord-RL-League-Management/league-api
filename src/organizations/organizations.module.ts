import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrganizationRepository } from './repositories/organization.repository';
import { OrganizationService } from './services/organization.service';
import { OrganizationMemberService } from './services/organization-member.service';
import { OrganizationValidationService } from './services/organization-validation.service';
import { OrganizationsController } from './organizations.controller';
import { InternalOrganizationsController } from './internal-organizations.controller';
import { OrganizationGmGuard } from './guards/organization-gm.guard';
import { LeaguesModule } from '../leagues/leagues.module';
import { PlayersModule } from '../players/players.module';
import { TeamsModule } from '../teams/teams.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => LeaguesModule),
    forwardRef(() => PlayersModule),
    forwardRef(() => TeamsModule),
  ],
  controllers: [OrganizationsController, InternalOrganizationsController],
  providers: [
    OrganizationRepository,
    OrganizationService,
    OrganizationMemberService,
    OrganizationValidationService,
    OrganizationGmGuard,
  ],
  exports: [
    OrganizationRepository,
    OrganizationService,
    OrganizationMemberService,
    OrganizationValidationService,
    OrganizationGmGuard,
  ],
})
export class OrganizationsModule {}

