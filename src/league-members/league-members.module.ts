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
import { SkillValidationService } from './services/skill-validation.service';
import { RegistrationWindowValidator } from './services/registration-window-validator';
import { CapacityValidator } from './services/capacity-validator';

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
    forwardRef(() => LeaguesModule), // Required for ILeagueSettingsProvider
  ],
  controllers: [LeagueMembersController, InternalLeagueMembersController],
  providers: [
    LeagueMemberService,
    LeagueJoinValidationService,
    SkillValidationService,
    RegistrationWindowValidator,
    CapacityValidator,
    LeagueMemberRepository,
    // Provide adapter with injection token for LeaguesModule
    {
      provide: 'ILeagueMemberAccess',
      useClass: LeagueMemberAccessAdapter,
    },
  ],
  exports: [
    LeagueMemberService,
    LeagueJoinValidationService,
    LeagueMemberRepository,
    'ILeagueMemberAccess', // Export token for LeaguesModule
  ],
})
export class LeagueMembersModule {}
