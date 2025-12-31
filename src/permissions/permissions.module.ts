import { Module } from '@nestjs/common';
import { RoleParserModule } from './modules/role-parser/role-parser.module';
import { PermissionCheckModule } from './modules/permission-check/permission-check.module';
import { PermissionsController } from './permissions.controller';
import { GuildMembersModule } from '../guild-members/guild-members.module';
import { GuildsModule } from '../guilds/guilds.module';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';

@Module({
  imports: [
    RoleParserModule,
    PermissionCheckModule,
    GuildMembersModule,
    GuildsModule,
    InfrastructureModule,
  ],
  controllers: [PermissionsController],
  exports: [RoleParserModule, PermissionCheckModule],
})
export class PermissionsModule {}
