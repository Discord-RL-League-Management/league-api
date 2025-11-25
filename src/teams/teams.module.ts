import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TeamService } from './services/team.service';
import { TeamRepository } from './repositories/team.repository';
import { TeamsController } from './teams.controller';
import { InternalTeamsController } from './internal-teams.controller';

@Module({
  imports: [PrismaModule],
  controllers: [TeamsController, InternalTeamsController],
  providers: [TeamService, TeamRepository],
  exports: [TeamService, TeamRepository],
})
export class TeamsModule {}

