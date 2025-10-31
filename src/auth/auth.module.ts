import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { UsersModule } from '../users/users.module';
import { DiscordModule } from '../discord/discord.module';
import { CommonModule } from '../common/common.module';
import { UserGuildsModule } from '../user-guilds/user-guilds.module';
import { PermissionCheckModule } from '../permissions/modules/permission-check/permission-check.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DiscordOAuthService } from './services/discord-oauth.service';
import { TokenManagementModule } from './services/token-management.module';
import { BotApiKeyStrategy } from './strategies/bot-api-key.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AdminGuard } from './guards/admin.guard';
import { httpModuleOptions } from '../common/config/http.config';
import { cacheModuleOptions } from '../common/config/cache.config';
import { UserOrchestratorService } from '../users/services/user-orchestrator.service';

@Module({
  imports: [
    UsersModule,
    DiscordModule,
    CommonModule,
    UserGuildsModule,
    PermissionCheckModule,
    TokenManagementModule,
    PassportModule,
    HttpModule.register(httpModuleOptions), // Required for Discord API calls
    CacheModule.register(cacheModuleOptions),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('auth.jwtSecret')!,
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    DiscordOAuthService,
    BotApiKeyStrategy,
    JwtStrategy,
    AdminGuard,
    UserOrchestratorService,
  ],
  exports: [AuthService, AdminGuard],
})
export class AuthModule {}
