import { Module } from '@nestjs/common';
import { PermissionSyncService } from './permission-sync.service';
import { GuildMembersModule } from '../../../guild-members/guild-members.module';
import { DiscordModule } from '../../../discord/discord.module';
import { TokenManagementModule } from '../../../auth/services/token-management.module';

@Module({
  imports: [GuildMembersModule, DiscordModule, TokenManagementModule],
  providers: [PermissionSyncService],
  exports: [PermissionSyncService],
})
export class PermissionSyncModule {}
