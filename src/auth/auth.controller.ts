import { Controller, Get, Req, Res, UseGuards, Logger, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import type { Response } from 'express';
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

      // Redirect to frontend with token
      const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${jwt.access_token}`;
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
  getCurrentUser(@CurrentUser() user) {
    return user;
  }
}
