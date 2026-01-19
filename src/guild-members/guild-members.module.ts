import { Module, forwardRef } from '@nestjs/common';
import { GuildMembersService } from './guild-members.service';
import { GuildMembersController } from './guild-members.controller';
import { InternalGuildMembersController } from './internal-guild-members.controller';
import { GuildMemberRepository } from './repositories/guild-member.repository';
import { GuildMemberQueryService } from './services/guild-member-query.service';
import { GuildMemberStatisticsService } from './services/guild-member-statistics.service';
import { GuildMemberSyncService } from './services/guild-member-sync.service';
import { UsersModule } from '../users/users.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TrackersModule } from '../trackers/trackers.module';
import { PlayersModule } from '../players/players.module';

@Module({
  imports: [
    // INTENTIONAL: Circular dependency with UsersModule is properly handled.
    // - GuildMembersModule needs UsersService for user existence checks in GuildMembersService
    // - UsersModule is part of a cycle (UsersModule -> GuildsModule -> TokenManagementModule -> UsersModule)
    // - GuildsModule imports GuildMembersModule, creating indirect cycle: GuildsModule -> GuildMembersModule -> UsersModule -> GuildsModule
    // - Using forwardRef() is the NestJS-recommended pattern for module-level circular dependencies
    // Reference: https://docs.nestjs.com/fundamentals/circular-dependency
    // eslint-disable-next-line @trilon/detect-circular-reference
    forwardRef(() => UsersModule),
    PrismaModule,
    // INTENTIONAL: Circular dependency with TrackersModule is properly handled.
    // - GuildMembersModule needs TrackerService to check if user has trackers for player creation
    // - TrackersModule needs GuildMembersService to find user's guild memberships for player creation
    // - Using forwardRef() is the NestJS-recommended pattern for module-level circular dependencies
    // Reference: https://docs.nestjs.com/fundamentals/circular-dependency
    // eslint-disable-next-line @trilon/detect-circular-reference
    forwardRef(() => TrackersModule),
    // INTENTIONAL: Circular dependency with PlayersModule is properly handled.
    // - GuildMembersModule needs PlayerService for guild member operations
    // - PlayersModule needs GuildMembersService for player operations (PlayerValidationService)
    // - Using forwardRef() is the NestJS-recommended pattern for module-level circular dependencies
    // Reference: https://docs.nestjs.com/fundamentals/circular-dependency
    // eslint-disable-next-line @trilon/detect-circular-reference
    forwardRef(() => PlayersModule),
  ],
  controllers: [GuildMembersController, InternalGuildMembersController],
  providers: [
    GuildMembersService,
    GuildMemberRepository,
    GuildMemberQueryService,
    GuildMemberStatisticsService,
    GuildMemberSyncService,
  ],
  exports: [
    GuildMembersService,
    GuildMemberQueryService,
    GuildMemberStatisticsService,
    GuildMemberSyncService,
    GuildMemberRepository,
  ],
})
export class GuildMembersModule {}
