import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DiscordModule } from '../discord/discord.module';
import { TokenManagementModule } from '../auth/services/token-management.module';
import { PermissionService } from './permission.service';

@Module({
  imports: [PrismaModule, DiscordModule, TokenManagementModule],
  providers: [PermissionService],
  exports: [PermissionService],
})
export class PermissionsModule {}
