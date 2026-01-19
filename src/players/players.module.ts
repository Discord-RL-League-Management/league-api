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
    // INTENTIONAL: Circular dependency with AuthModule is properly handled.
    // - PlayersModule needs AuthModule for authentication guards
    // - AuthModule imports UsersModule which is part of a cycle, causing initialization issues
    // - Using forwardRef() is the NestJS-recommended pattern for module-level circular dependencies
    // Reference: https://docs.nestjs.com/fundamentals/circular-dependency
    // eslint-disable-next-line @trilon/detect-circular-reference
    forwardRef(() => AuthModule),
    // INTENTIONAL: Circular dependency with TrackersModule is properly handled.
    // - PlayersModule needs TrackersModule for player validation (checking if user has trackers)
    // - TrackersModule needs PlayersModule for automatic player creation after tracker scraping
    // - Using forwardRef() is the NestJS-recommended pattern for module-level circular dependencies
    // Reference: https://docs.nestjs.com/fundamentals/circular-dependency
    // eslint-disable-next-line @trilon/detect-circular-reference
    forwardRef(() => TrackersModule),
    // INTENTIONAL: Circular dependency with GuildMembersModule is properly handled.
    // - PlayersModule needs GuildMembersService for player operations
    // - GuildMembersModule is part of cycles involving UsersModule and TrackersModule
    // - Using forwardRef() is the NestJS-recommended pattern for module-level circular dependencies
    // Reference: https://docs.nestjs.com/fundamentals/circular-dependency
    // eslint-disable-next-line @trilon/detect-circular-reference
    forwardRef(() => GuildMembersModule),
    // INTENTIONAL: Circular dependency with GuildsModule is properly handled.
    // - PlayersModule needs GuildsService for player operations
    // - GuildsModule is part of a cycle: TokenManagementModule → UsersModule → GuildsModule → TokenManagementModule
    // - Using forwardRef() is the NestJS-recommended pattern for module-level circular dependencies
    // Reference: https://docs.nestjs.com/fundamentals/circular-dependency
    // eslint-disable-next-line @trilon/detect-circular-reference
    forwardRef(() => GuildsModule),
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
