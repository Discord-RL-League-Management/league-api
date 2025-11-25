import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PlayersModule } from '../players/players.module';
import { LeaguesModule } from '../leagues/leagues.module';
import { TrackersModule } from '../trackers/trackers.module';
import { GuildMembersModule } from '../guild-members/guild-members.module';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { PlayerRatingsModule } from '../player-ratings/player-ratings.module';

// Controllers
import { LeagueMembersController } from './league-members.controller';
import { InternalLeagueMembersController } from './internal-league-members.controller';

// Services
import { LeagueMemberService } from './services/league-member.service';
import { LeagueJoinValidationService } from './services/league-join-validation.service';

// Repositories
import { LeagueMemberRepository } from './repositories/league-member.repository';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    PlayersModule,
    forwardRef(() => LeaguesModule), // For LeagueSettingsService dependency (circular dependency resolved)
    TrackersModule,
    GuildMembersModule,
    InfrastructureModule,
    PlayerRatingsModule,
  ],
  controllers: [
    LeagueMembersController,
    InternalLeagueMembersController,
  ],
  providers: [
    LeagueMemberService,
    LeagueJoinValidationService,
    LeagueMemberRepository,
  ],
  exports: [
    LeagueMemberService,
    LeagueJoinValidationService,
    LeagueMemberRepository,
  ],
})
export class LeagueMembersModule {}

