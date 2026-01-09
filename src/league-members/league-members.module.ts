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
import { ILEAGUE_MEMBER_ACCESS } from '../common/tokens/injection.tokens';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    PlayersModule,
    TrackersModule,
    GuildMembersModule,
    InfrastructureModule,
    PlayerRatingsModule,
    // INTENTIONAL: Circular dependency with LeaguesModule is properly handled.
    // - Both modules legitimately need each other for validation/access checks
    // - Using forwardRef() is the NestJS-recommended pattern for module-level circular dependencies
    // - Service-level circular dependencies are broken using ModuleRef lazy injection
    // Reference: https://docs.nestjs.com/fundamentals/circular-dependency
    // eslint-disable-next-line @trilon/detect-circular-reference
    forwardRef(() => LeaguesModule),
  ],
  controllers: [LeagueMembersController, InternalLeagueMembersController],
  providers: [
    LeagueMemberService,
    LeagueJoinValidationService,
    LeagueMemberRepository,
    {
      provide: ILEAGUE_MEMBER_ACCESS,
      useClass: LeagueMemberAccessAdapter,
    },
  ],
  exports: [
    LeagueMemberService,
    LeagueJoinValidationService,
    ILEAGUE_MEMBER_ACCESS,
  ],
})
export class LeagueMembersModule {}
