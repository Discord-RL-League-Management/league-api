import { Controller, Get, Post, Req, Res, UseGuards, Logger, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import type { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { DiscordOAuthService } from './services/discord-oauth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private authService: AuthService,
    private discordOAuthService: DiscordOAuthService,
    private configService: ConfigService,
  ) {}

  @Get('discord')
  @ApiOperation({ summary: 'Initiate Discord OAuth login' })
  @ApiResponse({ status: 302, description: 'Redirects to Discord authorization page' })
  @ApiExcludeEndpoint()
  discordLogin(@Res() res: Response) {
    // Generate Discord OAuth URL and redirect
    const authUrl = this.discordOAuthService.getAuthorizationUrl();
    this.logger.log('Discord OAuth flow initiated');
    res.redirect(authUrl);
  }

  @Get('discord/callback')
  @ApiOperation({ summary: 'Discord OAuth callback' })
  @ApiResponse({ status: 302, description: 'Redirects to frontend with JWT token or error' })
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
      const errorUrl = `${process.env.FRONTEND_URL}/auth/error?error=${encodeURIComponent(error)}&description=${encodeURIComponent(errorDescription || '')}`;
      return res.redirect(errorUrl);
    }

    // Check if code is present
    if (!code) {
      this.logger.error('OAuth callback received without authorization code');
      const errorUrl = `${process.env.FRONTEND_URL}/auth/error?error=no_code&description=${encodeURIComponent('Authorization code missing')}`;
      return res.redirect(errorUrl);
    }

    try {
      // Exchange code for access token
      const tokenResponse = await this.discordOAuthService.exchangeCode(code);
      
      // Get user information from Discord
      const discordUser = await this.discordOAuthService.getUserInfo(tokenResponse.access_token);
      
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

      // Generate JWT token
      const jwt = await this.authService.generateJwt(user);

      // Set JWT in HttpOnly cookie
      const cookieOptions = {
        httpOnly: true,
        secure: this.configService.get('auth.cookieSecure', false),
        sameSite: this.configService.get<'strict' | 'lax' | 'none'>('auth.cookieSameSite', 'lax') as 'lax',
        maxAge: this.configService.get<number>('auth.cookieMaxAge', 7 * 24 * 60 * 60 * 1000),
        path: '/',
      };

      res.cookie('auth_token', jwt.access_token, cookieOptions);

      // Redirect to frontend (no token in URL)
      const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback`;
      res.redirect(redirectUrl);
    } catch (error) {
      this.logger.error('OAuth callback failed:', error);
      const errorUrl = `${process.env.FRONTEND_URL}/auth/error?error=oauth_failed&description=${encodeURIComponent('Authentication failed')}`;
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
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiBearerAuth('JWT-auth')
  async getCurrentUser(@CurrentUser() user) {
    try {
      // Get fresh guild data
      const availableGuilds = await this.authService.getUserAvailableGuilds(user.id);
      
      return {
        ...user,
        guilds: availableGuilds,
      };
    } catch (error) {
      this.logger.error(`Error getting current user for ${user.id}:`, error);
      throw error;
    }
  }

  @Get('guilds')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user\'s available guilds' })
  @ApiResponse({ status: 200, description: 'User\'s available guilds with permissions' })
  @ApiResponse({ status: 401, description: 'Invalid JWT token' })
  @ApiBearerAuth('JWT-auth')
  async getUserGuilds(@CurrentUser() user: any) {
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
  async logout(@CurrentUser() user: any, @Res() res: Response) {
    try {
      // Clear JWT cookie
      res.clearCookie('auth_token', {
        httpOnly: true,
        secure: this.configService.get('auth.cookieSecure', false),
        sameSite: this.configService.get<'strict' | 'lax' | 'none'>('auth.cookieSameSite', 'lax') as 'lax',
        path: '/',
      });

      // TODO: Implement token revocation when TokenManagementService is ready
      // await this.authService.logout(user.id);

      return res.json({ message: 'Logged out successfully' });
    } catch (error) {
      this.logger.error(`Error during logout for user ${user.id}:`, error);
      throw error;
    }
  }
}
