import { Module } from '@nestjs/common';
import { GuildsController } from './guilds.controller';
import { InternalGuildsController } from './internal-guilds.controller';
import { GuildsService } from './guilds.service';
import { GuildFilteringService } from './services/guild-filtering.service';
import { GuildMembersModule } from '../guild-members/guild-members.module';
import { DiscordModule } from '../discord/discord.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [GuildMembersModule, DiscordModule, CommonModule],
  controllers: [GuildsController, InternalGuildsController],
  providers: [GuildsService, GuildFilteringService],
  exports: [GuildsService, GuildFilteringService],
})
export class GuildsModule {}
