import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { HttpModule } from '@nestjs/axios';
import { UserGuildsService } from './user-guilds.service';
import { PrismaModule } from '../prisma/prisma.module';
import { DiscordModule } from '../discord/discord.module';
import { TokenManagementModule } from '../auth/services/token-management.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [
    PrismaModule,
    DiscordModule,
    TokenManagementModule,
    PermissionsModule,
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    CacheModule.register({
      ttl: 300000, // 5 minutes in milliseconds
      max: 1000, // Maximum number of items in cache
    }),
  ],
  providers: [UserGuildsService],
  exports: [UserGuildsService],
})
export class UserGuildsModule {}

