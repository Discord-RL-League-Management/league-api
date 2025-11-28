import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionCheckModule } from '../permissions/modules/permission-check/permission-check.module';
import { CommonModule } from '../common/common.module';
import { GuildsModule } from '../guilds/guilds.module';
import { GuildMembersModule } from '../guild-members/guild-members.module';
import { DiscordModule } from '../discord/discord.module';
import { TokenManagementModule } from '../auth/services/token-management.module';
import { AuditLogService } from './services/audit-log.service';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { RequestContextService } from '../common/services/request-context.service';
import { AuditLogController } from './audit-log.controller';

/**
 * Audit Module - Modularity: Self-contained audit functionality
 *
 * Encapsulates all audit-related services and controllers.
 * Exports AuditLogService for use in other modules.
 *
 * Note: Imports CommonModule to use AdminGuard in AuditLogController.
 * Also imports GuildsModule so AdminGuard can resolve GuildSettingsService.
 *
 * IMPORTANT: Because AuditModule uses AdminGuard from CommonModule, and due to
 * circular dependencies with forwardRef, we must also import all AdminGuard dependencies
 * here: GuildMembersModule, DiscordModule, and TokenManagementModule.
 */
@Module({
  imports: [
    PrismaModule,
    InfrastructureModule,
    forwardRef(() => PermissionCheckModule),
    forwardRef(() => CommonModule),
    forwardRef(() => GuildsModule),
    forwardRef(() => GuildMembersModule),
    DiscordModule,
    TokenManagementModule,
  ],
  providers: [AuditLogService, RequestContextService],
  controllers: [AuditLogController],
  exports: [AuditLogService], // Export for use in other modules
})
export class AuditModule {}
