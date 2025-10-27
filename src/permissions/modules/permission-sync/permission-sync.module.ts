import { Module } from '@nestjs/common';
import { PermissionSyncService } from './permission-sync.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { DiscordModule } from '../../../discord/discord.module';
import { TokenManagementModule } from '../../../auth/services/token-management.module';

@Module({
  imports: [PrismaModule, DiscordModule, TokenManagementModule],
  providers: [PermissionSyncService],
  exports: [PermissionSyncService],
})
export class PermissionSyncModule {}

