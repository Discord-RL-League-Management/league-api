import {
  Controller,
  Get,
  Post,
  Res,
  Logger,
  Query,
  Inject,
  BadRequestException,
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
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';
import { DiscordOAuthService } from './services/discord-oauth.service';
import { DiscordApiService } from '../discord/discord-api.service';
import { AuthOrchestrationService } from './services/auth-orchestration.service';
import { RedirectUriValidationService } from './services/redirect-uri-validation.service';
import { TokenManagementService } from './services/token-management.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from '../common/decorators';
import type { AuthenticatedUser } from '../common/interfaces/user.interface';

@ApiTags('Authentication')
@Controller('auth')
@SkipThrottle()
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private authService: AuthService,
    private discordOAuthService: DiscordOAuthService,
    private discordApiService: DiscordApiService,
    private authOrchestrationService: AuthOrchestrationService,
    private redirectUriValidationService: RedirectUriValidationService,
    private tokenManagementService: TokenManagementService,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Generate a cryptographically secure state token for OAuth CSRF protection
   * Following OAuth 2.0 Security Best Practices: https://oauth.net/2/oauth-best-practice/
   * @returns Base64url-encoded state token
   */
  private generateStateToken(): string {
    const randomBytes = crypto.randomBytes(32);
    const base64 = randomBytes.toString('base64');
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  @Get('discord')
  @Public()
  @ApiOperation({ summary: 'Initiate Discord OAuth login' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Discord authorization page',
  })
  @ApiExcludeEndpoint()
  async discordLogin(@Res() res: Response) {
    try {
      const stateToken = this.generateStateToken();

      const stateCacheKey = `oauth:state:${stateToken}`;
      await this.cacheManager.set(
        stateCacheKey,
        { timestamp: Date.now() },
        600000,
      );

      const authUrl = this.discordOAuthService.getAuthorizationUrl(stateToken);
      this.logger.log('Discord OAuth flow initiated with state parameter');
      res.redirect(authUrl);
    } catch (error) {
      this.logger.error('Failed to initiate OAuth flow:', error);
      const frontendUrl = this.configService.get<string>('frontend.url', '');
      const errorUrl = `${frontendUrl}/auth/error?error=oauth_init_failed&description=${encodeURIComponent('Failed to initiate authentication')}`;
      res.redirect(errorUrl);
    }
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
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Query('redirect_uri') redirectUri: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.configService.get<string>('frontend.url', '');
    const allowedRedirectUris = this.configService.get<string[]>(
      'oauth.redirectUris',
      [],
    );

    let validatedRedirectUri: string;
    try {
      validatedRedirectUri =
        this.redirectUriValidationService.validateRedirectUri(
          redirectUri,
          allowedRedirectUris,
          frontendUrl,
        );
    } catch (error) {
      if (error instanceof BadRequestException) {
        this.logger.warn(
          `OAuth callback received with invalid redirect URI - potential open redirect attack. URI: ${redirectUri}`,
        );
        const errorUrl = `${frontendUrl}/auth/error?error=invalid_redirect_uri&description=${encodeURIComponent('Invalid redirect URI')}`;
        return res.redirect(errorUrl);
      }
      throw error;
    }

    if (error) {
      this.logger.warn(`OAuth error: ${error} - ${errorDescription}`);
      const errorUrl = `${validatedRedirectUri}/auth/error?error=${encodeURIComponent(error)}&description=${encodeURIComponent(errorDescription || '')}`;
      return res.redirect(errorUrl);
    }

    if (!state) {
      this.logger.warn(
        'OAuth callback received without state parameter - potential CSRF attempt',
      );
      const errorUrl = `${validatedRedirectUri}/auth/error?error=invalid_state&description=${encodeURIComponent('State parameter missing')}`;
      return res.redirect(errorUrl);
    }

    const stateCacheKey = `oauth:state:${state}`;
    const cachedState = await this.cacheManager.get<{ timestamp: number }>(
      stateCacheKey,
    );

    if (!cachedState) {
      this.logger.warn(
        `OAuth callback received with invalid/expired state parameter - potential replay attack. State: ${state?.substring(0, 8) || 'empty'}...`,
      );
      const errorUrl = `${validatedRedirectUri}/auth/error?error=invalid_state&description=${encodeURIComponent('Invalid or expired state parameter')}`;
      return res.redirect(errorUrl);
    }

    await this.cacheManager.del(stateCacheKey);

    if (!code) {
      this.logger.error('OAuth callback received without authorization code');
      const errorUrl = `${validatedRedirectUri}/auth/error?error=no_code&description=${encodeURIComponent('Authorization code missing')}`;
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

      this.logger.log(`OAuth callback successful for user ${user.id}`);

      try {
        await this.authOrchestrationService.syncUserGuildMemberships(
          user.id,
          tokenResponse.access_token,
        );
      } catch (error) {
        this.logger.error(
          `Failed to sync guild memberships with roles for user ${user.id}:`,
          error,
        );
      }

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

      const redirectUrl = `${validatedRedirectUri}/auth/callback`;
      res.redirect(redirectUrl);
    } catch (error) {
      this.logger.error('OAuth callback failed:', error);
      const errorUrl = `${validatedRedirectUri}/auth/error?error=oauth_failed&description=${encodeURIComponent('Authentication failed')}`;
      res.redirect(errorUrl);
    }
  }

  @Get('me')
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
      this.logger.error(`Error getting user guilds for ${user.id}:`, error);
      throw error;
    }
  }

  @Post('logout')
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
      this.logger.error(`Error during logout for user ${user.id}:`, error);
      throw error;
    }
  }
}
