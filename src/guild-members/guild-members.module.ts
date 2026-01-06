import { Module } from '@nestjs/common';
import { GuildMembersService } from './guild-members.service';
import { GuildMembersController } from './guild-members.controller';
import { InternalGuildMembersController } from './internal-guild-members.controller';
import { GuildMemberRepository } from './repositories/guild-member.repository';
import { GuildMemberQueryService } from './services/guild-member-query.service';
import { GuildMemberStatisticsService } from './services/guild-member-statistics.service';
import { GuildMemberSyncService } from './services/guild-member-sync.service';
import { UsersModule } from '../users/users.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [UsersModule, PrismaModule],
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
