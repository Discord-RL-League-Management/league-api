import { Module } from '@nestjs/common';
import { GuildsController } from './guilds.controller';
import { InternalGuildsController } from './internal-guilds.controller';
import { GuildsService } from './guilds.service';
import { GuildMembersModule } from '../guild-members/guild-members.module';

@Module({
  imports: [GuildMembersModule],
  controllers: [GuildsController, InternalGuildsController],
  providers: [GuildsService],
  exports: [GuildsService],
})
export class GuildsModule {}
