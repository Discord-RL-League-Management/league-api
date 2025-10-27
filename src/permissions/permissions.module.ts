import { Module } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { RoleParserModule } from './modules/role-parser/role-parser.module';
import { PermissionSyncModule } from './modules/permission-sync/permission-sync.module';
import { PermissionCheckModule } from './modules/permission-check/permission-check.module';

@Module({
  imports: [
    RoleParserModule,
    PermissionSyncModule,
    PermissionCheckModule,
  ],
  providers: [PermissionService], // Kept for backward compatibility
  exports: [
    PermissionService, // Facade for backward compatibility
    RoleParserModule,
    PermissionSyncModule,
    PermissionCheckModule,
  ],
})
export class PermissionsModule {}
