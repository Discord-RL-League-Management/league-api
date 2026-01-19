import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { UsersModule } from '../users/users.module';
import { DiscordModule } from '../discord/discord.module';
import { UserGuildsModule } from '../user-guilds/user-guilds.module';
import { GuildsModule } from '../guilds/guilds.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DiscordOAuthService } from './services/discord-oauth.service';
import { AuthOrchestrationService } from './services/auth-orchestration.service';
import { RedirectUriValidationService } from './services/redirect-uri-validation.service';
import { TokenManagementModule } from './services/token-management.module';
import { BotApiKeyStrategy } from './strategies/bot-api-key.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { httpModuleOptions } from '../common/config/http.config';
import { cacheModuleOptions } from '../common/config/cache.config';
import { UserOrchestratorService } from '../users/services/user-orchestrator.service';

@Module({
  imports: [
    // INTENTIONAL: Circular dependency with UsersModule is properly handled.
    // - AuthModule needs UsersService and UserOrchestratorService for authentication
    // - UsersModule is part of a cycle: TokenManagementModule → UsersModule → GuildsModule → TokenManagementModule
    // - Using forwardRef() is the NestJS-recommended pattern for module-level circular dependencies
    // Reference: https://docs.nestjs.com/fundamentals/circular-dependency
    // eslint-disable-next-line @trilon/detect-circular-reference
    forwardRef(() => UsersModule),
    DiscordModule,
    UserGuildsModule,
    // INTENTIONAL: Circular dependency with GuildsModule is properly handled.
    // - AuthModule needs GuildsService for OAuth flow
    // - GuildsModule is part of a cycle: TokenManagementModule → UsersModule → GuildsModule → TokenManagementModule
    // - Using forwardRef() is the NestJS-recommended pattern for module-level circular dependencies
    // Reference: https://docs.nestjs.com/fundamentals/circular-dependency
    // eslint-disable-next-line @trilon/detect-circular-reference
    forwardRef(() => GuildsModule),
    // INTENTIONAL: Circular dependency with TokenManagementModule is properly handled.
    // - AuthModule needs TokenManagementService for token operations
    // - TokenManagementModule is part of a cycle: TokenManagementModule → UsersModule → GuildsModule → TokenManagementModule
    // - Using forwardRef() is the NestJS-recommended pattern for module-level circular dependencies
    // Reference: https://docs.nestjs.com/fundamentals/circular-dependency
    // eslint-disable-next-line @trilon/detect-circular-reference
    forwardRef(() => TokenManagementModule),
    PassportModule,
    HttpModule.register(httpModuleOptions), // Required for Discord API calls
    CacheModule.register(cacheModuleOptions),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        privateKey: configService.get<string>('auth.jwtPrivateKey')!,
        signOptions: {
          expiresIn: '7d',
          algorithm: 'RS256',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    DiscordOAuthService,
    AuthOrchestrationService,
    RedirectUriValidationService,
    BotApiKeyStrategy,
    JwtStrategy,
    UserOrchestratorService,
    JwtAuthGuard,
  ],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
