import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { UsersModule } from '../users/users.module';
import { DiscordModule } from '../discord/discord.module';
import { CommonModule } from '../common/common.module';
import { GuildsModule } from '../guilds/guilds.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DiscordOAuthService } from './services/discord-oauth.service';
import { TokenManagementModule } from './services/token-management.module';
import { PermissionService } from './services/permission.service';
import { BotApiKeyStrategy } from './strategies/bot-api-key.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AdminGuard } from './guards/admin.guard';

@Module({
  imports: [
    UsersModule,
    DiscordModule,
    CommonModule,
    forwardRef(() => GuildsModule),
    TokenManagementModule,
    PassportModule,
    HttpModule, // Required for Discord API calls
    CacheModule.register({
      ttl: 300000, // 5 minutes in milliseconds
      max: 1000, // Maximum number of items in cache
    }),
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
    PermissionService,
    BotApiKeyStrategy,
    JwtStrategy,
    AdminGuard,
  ],
  exports: [
    AuthService,
    PermissionService,
    AdminGuard,
  ],
})
export class AuthModule {}
