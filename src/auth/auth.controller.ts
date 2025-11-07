import {
  Controller,
  Get,
  Post,
  Res,
  UseGuards,
  Logger,
  Query,
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
import { AuthService } from './auth.service';
import { DiscordOAuthService } from './services/discord-oauth.service';
import { DiscordApiService } from '../discord/discord-api.service';
import { TokenManagementService } from './services/token-management.service';
import { UserGuildsService } from '../user-guilds/user-guilds.service';
import { GuildsService } from '../guilds/guilds.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
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
    private tokenManagementService: TokenManagementService,
    private userGuildsService: UserGuildsService,
    private guildsService: GuildsService,
    private configService: ConfigService,
  ) {}

  @Get('discord')
  @ApiOperation({ summary: 'Initiate Discord OAuth login' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Discord authorization page',
  })
  @ApiExcludeEndpoint()
  discordLogin(@Res() res: Response) {
    // Generate Discord OAuth URL and redirect
    const authUrl = this.discordOAuthService.getAuthorizationUrl();
    this.logger.log('Discord OAuth flow initiated');
    res.redirect(authUrl);
  }

  @Get('discord/callback')
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
    // Check for OAuth errors
    if (error) {
      this.logger.warn(`OAuth error: ${error} - ${errorDescription}`);
      const frontendUrl = this.configService.get<string>('frontend.url', '');
      const errorUrl = `${frontendUrl}/auth/error?error=${encodeURIComponent(error)}&description=${encodeURIComponent(errorDescription || '')}`;
      return res.redirect(errorUrl);
    }

    // Check if code is present
    if (!code) {
      this.logger.error('OAuth callback received without authorization code');
      const frontendUrl = this.configService.get<string>('frontend.url', '');
      const errorUrl = `${frontendUrl}/auth/error?error=no_code&description=${encodeURIComponent('Authorization code missing')}`;
      return res.redirect(errorUrl);
    }

    try {
      // Exchange code for access token
      const tokenResponse = await this.discordOAuthService.exchangeCode(code);

      // Get user information from Discord via DiscordApiService
      const discordUser = await this.discordApiService.getUserProfile(
        tokenResponse.access_token,
      );

      // Validate and create/update user in database
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

      // Fetch user's guilds and sync with roles
      try {
        // Fetch user's guilds from Discord API
        const userGuilds = await this.discordApiService.getUserGuilds(
          tokenResponse.access_token,
        );

        // Get bot's active guild IDs to filter mutual guilds
        const botGuildIds = await this.guildsService.findActiveGuildIds();
        const botGuildIdsSet = new Set(botGuildIds);

        // Filter to mutual guilds and fetch roles for each
        const mutualGuildsWithRoles = await Promise.all(
          userGuilds
            .filter((guild) => botGuildIdsSet.has(guild.id))
            .map(async (guild) => {
              try {
                const memberData = await this.discordApiService.getGuildMember(
                  tokenResponse.access_token,
                  guild.id,
                );
                return {
                  ...guild,
                  roles: memberData?.roles || [],
                };
              } catch (error) {
                this.logger.warn(
                  `Failed to fetch roles for guild ${guild.id}:`,
                  error,
                );
                // Continue with empty roles if fetch fails
                return {
                  ...guild,
                  roles: [],
                };
              }
            }),
        );

        // Sync guild memberships with roles
        await this.userGuildsService.syncUserGuildMembershipsWithRoles(
          user.id,
          mutualGuildsWithRoles,
        );

        this.logger.log(
          `Synced ${mutualGuildsWithRoles.length} guild memberships with roles for user ${user.id}`,
        );
      } catch (error) {
        // Log error but don't fail OAuth callback - role sync is not critical
        this.logger.error(
          `Failed to sync guild memberships with roles for user ${user.id}:`,
          error,
        );
      }

      // Generate JWT token - convert null to undefined for type compatibility
      const jwt = await this.authService.generateJwt({
        id: user.id,
        username: user.username,
        globalName: user.globalName ?? undefined,
        avatar: user.avatar ?? undefined,
        email: user.email ?? undefined,
      });

      // Set JWT in HttpOnly cookie
      const cookieOptions = {
        httpOnly: true,
        secure: this.configService.get('auth.cookieSecure', false),
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

      // Redirect to frontend (no token in URL)
      const frontendUrl = this.configService.get<string>('frontend.url', '');
      const redirectUrl = `${frontendUrl}/auth/callback`;
      res.redirect(redirectUrl);
    } catch (error) {
      this.logger.error('OAuth callback failed:', error);
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
  async getCurrentUser(@CurrentUser() user: AuthenticatedUser) {
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
  async getUserGuilds(@CurrentUser() user: AuthenticatedUser) {
    try {
      return await this.authService.getUserAvailableGuilds(user.id);
    } catch (error) {
      this.logger.error(`Error getting user guilds for ${user.id}:`, error);
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
      // Clear JWT cookie
      res.clearCookie('auth_token', {
        httpOnly: true,
        secure: this.configService.get('auth.cookieSecure', false),
        sameSite: this.configService.get<'strict' | 'lax' | 'none'>(
          'auth.cookieSameSite',
          'lax',
        ) as 'lax',
        path: '/',
      });

      // Revoke Discord tokens
      await this.tokenManagementService.revokeTokens(user.id);

      return res.json({ message: 'Logged out successfully' });
    } catch (error) {
      this.logger.error(`Error during logout for user ${user.id}:`, error);
      throw error;
    }
  }
}
