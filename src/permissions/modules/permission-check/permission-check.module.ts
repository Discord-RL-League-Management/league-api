import { Module } from '@nestjs/common';
import { PermissionCheckService } from './permission-check.service';
import { GuildMembersModule } from '../../../guild-members/guild-members.module';
import { DiscordModule } from '../../../discord/discord.module';
import { RoleParserModule } from '../role-parser/role-parser.module';
import { PermissionProviderAdapter } from '../../../permissions/adapters/permission-provider.adapter';
import { InfrastructureModule } from '../../../infrastructure/infrastructure.module';

@Module({
  imports: [
    GuildMembersModule,
    DiscordModule,
    RoleParserModule,
    InfrastructureModule,
  ],
  providers: [PermissionCheckService, PermissionProviderAdapter],
  exports: [PermissionCheckService, PermissionProviderAdapter],
})
export class PermissionCheckModule {}
