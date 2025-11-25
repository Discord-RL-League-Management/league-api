import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { TrackersModule } from '../trackers/trackers.module';
import { GuildMembersModule } from '../guild-members/guild-members.module';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';

// Controllers
import { PlayersController } from './players.controller';
import { InternalPlayersController } from './internal-players.controller';

// Services
import { PlayerService } from './services/player.service';
import { PlayerValidationService } from './services/player-validation.service';

// Repositories
import { PlayerRepository } from './repositories/player.repository';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    TrackersModule,
    GuildMembersModule,
    InfrastructureModule,
  ],
  controllers: [
    PlayersController,
    InternalPlayersController,
  ],
  providers: [
    PlayerService,
    PlayerValidationService,
    PlayerRepository,
  ],
  exports: [
    PlayerService,
    PlayerValidationService,
    PlayerRepository,
  ],
})
export class PlayersModule {}

