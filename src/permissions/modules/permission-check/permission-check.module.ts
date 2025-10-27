import { Module } from '@nestjs/common';
import { PermissionCheckService } from './permission-check.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { DiscordModule } from '../../../discord/discord.module';
import { RoleParserModule } from '../role-parser/role-parser.module';

@Module({
  imports: [PrismaModule, DiscordModule, RoleParserModule],
  providers: [PermissionCheckService],
  exports: [PermissionCheckService],
})
export class PermissionCheckModule {}

