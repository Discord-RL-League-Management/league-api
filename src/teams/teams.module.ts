import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { TeamService } from './services/team.service';
import { TeamRepository } from './repositories/team.repository';
import { TeamValidationService } from './services/team-validation.service';
import { TeamsController } from './teams.controller';
import { InternalTeamsController } from './internal-teams.controller';
import { LeaguesModule } from '../leagues/leagues.module';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [
    PrismaModule,
    InfrastructureModule,
    forwardRef(() => LeaguesModule),
    forwardRef(() => OrganizationsModule),
  ],
  controllers: [TeamsController, InternalTeamsController],
  providers: [TeamService, TeamRepository, TeamValidationService],
  exports: [TeamService, TeamRepository],
})
export class TeamsModule {}
