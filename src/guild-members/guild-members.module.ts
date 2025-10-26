import { Module } from '@nestjs/common';
import { GuildMembersService } from './guild-members.service';
import { GuildMembersController } from './guild-members.controller';

@Module({
  controllers: [GuildMembersController],
  providers: [GuildMembersService],
  exports: [GuildMembersService],
})
export class GuildMembersModule {}
