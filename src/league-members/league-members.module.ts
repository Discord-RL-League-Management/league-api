import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PlayersModule } from '../players/players.module';
import { TrackersModule } from '../trackers/trackers.module';
import { GuildMembersModule } from '../guild-members/guild-members.module';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { PlayerRatingsModule } from '../player-ratings/player-ratings.module';
import { LeaguesModule } from '../leagues/leagues.module';

import { LeagueMembersController } from './league-members.controller';
import { InternalLeagueMembersController } from './internal-league-members.controller';

import { LeagueMemberService } from './services/league-member.service';
import { LeagueJoinValidationService } from './services/league-join-validation.service';

import { LeagueMemberRepository } from './repositories/league-member.repository';

import { LeagueMemberAccessAdapter } from './adapters/league-member-access.adapter';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    PlayersModule,
    TrackersModule,
    GuildMembersModule,
    InfrastructureModule,
    PlayerRatingsModule,
    forwardRef(() => LeaguesModule),
  ],
  controllers: [LeagueMembersController, InternalLeagueMembersController],
  providers: [
    LeagueMemberService,
    LeagueJoinValidationService,
    LeagueMemberRepository,
    {
      provide: 'ILeagueMemberAccess',
      useClass: LeagueMemberAccessAdapter,
    },
  ],
  exports: [
    LeagueMemberService,
    LeagueJoinValidationService,
    LeagueMemberRepository,
    'ILeagueMemberAccess',
  ],
})
export class LeagueMembersModule {}
