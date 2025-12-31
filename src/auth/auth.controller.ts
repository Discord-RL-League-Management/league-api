import {
  Controller,
  Get,
  Post,
  Res,
  UseGuards,
  Query,
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import type { ILoggingService } from '../infrastructure/logging/interfaces/logging.interface';
import type { IConfigurationService } from '../infrastructure/configuration/interfaces/configuration.interface';
import { DiscordOAuthService } from './services/discord-oauth.service';
import { DiscordApiService } from '../discord/discord-api.service';
import { AuthOrchestrationService } from './services/auth-orchestration.service';
import { TokenManagementService } from './services/token-management.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from '../common/decorators';
import type { AuthenticatedUser } from '../common/interfaces/user.interface';

@ApiTags('Authentication')
@Controller('auth')
@SkipThrottle()
export class AuthController {
  private readonly serviceName = AuthController.name;

  constructor(
    private authService: AuthService,
    private discordOAuthService: DiscordOAuthService,
    private discordApiService: DiscordApiService,
    private authOrchestrationService: AuthOrchestrationService,
    private tokenManagementService: TokenManagementService,
    @Inject('IConfigurationService')
    private configService: IConfigurationService,
    @Inject('ILoggingService')
    private readonly loggingService: ILoggingService,
  ) {}

  @Get('discord')
  @Public()
  @ApiOperation({ summary: 'Initiate Discord OAuth login' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Discord authorization page',
  })
  @ApiExcludeEndpoint()
  discordLogin(@Res() res: Response) {
    const authUrl = this.discordOAuthService.getAuthorizationUrl();
    this.loggingService.log('Discord OAuth flow initiated', this.serviceName);
    res.redirect(authUrl);
  }

  @Get('discord/callback')
  @Public()
  @ApiOperation({ summary: 'Discord OAuth callback' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to frontend with JWT token or error',
  })
  @ApiExcludeEndpoint()
  async discordCallback(
    @Query('code') code: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Res() res: Response,
  ) {
    if (error) {
      this.loggingService.warn(
        `OAuth error: ${error} - ${errorDescription}`,
        this.serviceName,
      );
      const frontendUrl = this.configService.get<string>('frontend.url', '');
      const errorUrl = `${frontendUrl}/auth/error?error=${encodeURIComponent(error)}&description=${encodeURIComponent(errorDescription || '')}`;
      return res.redirect(errorUrl);
    }

    if (!code) {
      this.loggingService.error(
        'OAuth callback received without authorization code',
        undefined,
        this.serviceName,
      );
      const frontendUrl = this.configService.get<string>('frontend.url', '');
      const errorUrl = `${frontendUrl}/auth/error?error=no_code&description=${encodeURIComponent('Authorization code missing')}`;
      return res.redirect(errorUrl);
    }

    try {
      const tokenResponse = await this.discordOAuthService.exchangeCode(code);

      const discordUser = await this.discordApiService.getUserProfile(
        tokenResponse.access_token,
      );

      const user = await this.authService.validateDiscordUser({
        discordId: discordUser.id,
        username: discordUser.username,
        discriminator: discordUser.discriminator,
        globalName: discordUser.global_name,
        avatar: discordUser.avatar,
        email: discordUser.email,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
      });

      this.loggingService.log(
        `OAuth callback successful for user ${user.id}`,
        this.serviceName,
      );

      // Sync guild memberships during OAuth to ensure user roles are current when they first log in
      try {
        await this.authOrchestrationService.syncUserGuildMemberships(
          user.id,
          tokenResponse.access_token,
        );
      } catch (error) {
        // Log error but don't fail OAuth callback - role sync is not critical
        this.loggingService.error(
          `Failed to sync guild memberships with roles for user ${user.id}: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error.stack : undefined,
          this.serviceName,
        );
      }

      // Convert null to undefined because JWT payload uses optional properties that don't accept null
      const jwt = this.authService.generateJwt({
        id: user.id,
        username: user.username,
        globalName: user.globalName ?? undefined,
        avatar: user.avatar ?? undefined,
        email: user.email ?? undefined,
      });

      const cookieOptions = {
        httpOnly: true,
        secure: this.configService.get<boolean>('auth.cookieSecure', false),
        sameSite: this.configService.get<'strict' | 'lax' | 'none'>(
          'auth.cookieSameSite',
          'lax',
        ) as 'lax',
        maxAge: this.configService.get<number>(
          'auth.cookieMaxAge',
          7 * 24 * 60 * 60 * 1000,
        ),
        path: '/',
      };

      res.cookie('auth_token', jwt.access_token, cookieOptions);

      // Use cookie-based auth instead of URL token to prevent token exposure in browser history and logs
      const frontendUrl = this.configService.get<string>('frontend.url', '');
      const redirectUrl = `${frontendUrl}/auth/callback`;
      res.redirect(redirectUrl);
    } catch (error) {
      this.loggingService.error(
        `OAuth callback failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      const frontendUrl = this.configService.get<string>('frontend.url', '');
      const errorUrl = `${frontendUrl}/auth/error?error=oauth_failed&description=${encodeURIComponent('Authentication failed')}`;
      res.redirect(errorUrl);
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Returns current user information',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '123456789012345678' },
        username: { type: 'string', example: 'testuser' },
        globalName: { type: 'string', example: 'Test User' },
        avatar: { type: 'string', example: 'a_abc123def456' },
        email: { type: 'string', example: 'user@example.com' },
        createdAt: { type: 'string', format: 'date-time' },
        lastLoginAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiBearerAuth('JWT-auth')
  getCurrentUser(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  @Get('guilds')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get user's available guilds" })
  @ApiResponse({
    status: 200,
    description: "User's available guilds with permissions",
  })
  @ApiResponse({ status: 401, description: 'Invalid JWT token' })
  @ApiBearerAuth('JWT-auth')
  async getUserGuilds(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<unknown[]> {
    try {
      return await this.authService.getUserAvailableGuilds(user.id);
    } catch (error) {
      this.loggingService.error(
        `Error getting user guilds for ${user.id}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      throw error;
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Logout user and revoke tokens' })
  @ApiResponse({ status: 200, description: 'User logged out successfully' })
  @ApiResponse({ status: 401, description: 'Invalid JWT token' })
  @ApiBearerAuth('JWT-auth')
  async logout(@CurrentUser() user: AuthenticatedUser, @Res() res: Response) {
    try {
      res.clearCookie('auth_token', {
        httpOnly: true,
        secure: this.configService.get<boolean>('auth.cookieSecure', false),
        sameSite: this.configService.get<'strict' | 'lax' | 'none'>(
          'auth.cookieSameSite',
          'lax',
        ) as 'lax',
        path: '/',
      });

      await this.tokenManagementService.revokeTokens(user.id);

      return res.json({ message: 'Logged out successfully' });
    } catch (error) {
      this.loggingService.error(
        `Error during logout for user ${user.id}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      throw error;
    }
  }
}
