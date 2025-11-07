import { Module } from '@nestjs/common';
import { PermissionCheckService } from './permission-check.service';
import { GuildMembersModule } from '../../../guild-members/guild-members.module';
import { DiscordModule } from '../../../discord/discord.module';
import { RoleParserModule } from '../role-parser/role-parser.module';

@Module({
  imports: [
    GuildMembersModule,
    DiscordModule,
    RoleParserModule,
  ],
  providers: [PermissionCheckService],
  exports: [PermissionCheckService],
})
export class PermissionCheckModule {}
