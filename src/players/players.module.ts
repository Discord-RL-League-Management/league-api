import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { TrackersModule } from '../trackers/trackers.module';
import { GuildMembersModule } from '../guild-members/guild-members.module';
import { GuildsModule } from '../guilds/guilds.module';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { PlayersController } from './players.controller';
import { InternalPlayersController } from './internal-players.controller';
import { PlayerService } from './player.service';
import { PlayerValidationService } from './services/player-validation.service';
import { PlayerOwnershipService } from './services/player-ownership.service';
import { PlayerRepository } from './repositories/player.repository';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    // INTENTIONAL: Circular dependency with TrackersModule is properly handled.
    // - PlayersModule needs TrackersModule for player validation (checking if user has trackers)
    // - TrackersModule needs PlayersModule for automatic player creation after tracker scraping
    // - Using forwardRef() is the NestJS-recommended pattern for module-level circular dependencies
    // Reference: https://docs.nestjs.com/fundamentals/circular-dependency
    // eslint-disable-next-line @trilon/detect-circular-reference
    forwardRef(() => TrackersModule),
    GuildMembersModule,
    GuildsModule,
    InfrastructureModule,
  ],
  controllers: [PlayersController, InternalPlayersController],
  providers: [
    PlayerService,
    PlayerValidationService,
    PlayerOwnershipService,
    PlayerRepository,
  ],
  exports: [
    PlayerService,
    PlayerValidationService,
    PlayerOwnershipService,
    PlayerRepository,
  ],
})
export class PlayersModule {}
