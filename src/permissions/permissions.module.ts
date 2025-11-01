import { Module } from '@nestjs/common';
import { RoleParserModule } from './modules/role-parser/role-parser.module';
import { PermissionSyncModule } from './modules/permission-sync/permission-sync.module';
import { PermissionCheckModule } from './modules/permission-check/permission-check.module';
import { PermissionsController } from './permissions.controller';
import { GuildMembersModule } from '../guild-members/guild-members.module';

@Module({
  imports: [RoleParserModule, PermissionSyncModule, PermissionCheckModule, GuildMembersModule],
  controllers: [PermissionsController],
  exports: [
    RoleParserModule,
    PermissionSyncModule,
    PermissionCheckModule,
  ],
})
export class PermissionsModule {}
