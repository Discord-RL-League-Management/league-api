import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { TeamsModule } from '../teams/teams.module';
import { TeamMemberService } from './services/team-member.service';
import { TeamMemberRepository } from './repositories/team-member.repository';
import { TeamMembersController } from './team-members.controller';
import { InternalTeamMembersController } from './internal-team-members.controller';

@Module({
  imports: [PrismaModule, InfrastructureModule, TeamsModule],
  controllers: [TeamMembersController, InternalTeamMembersController],
  providers: [TeamMemberService, TeamMemberRepository],
  exports: [TeamMemberService, TeamMemberRepository],
})
export class TeamMembersModule {}
