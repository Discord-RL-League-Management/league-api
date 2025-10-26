import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout, retry, catchError, of } from 'rxjs';
import { AxiosError } from 'axios';
import { EncryptionService } from '../../common/encryption.service';

@Injectable()
export class TokenManagementService {
  private readonly logger = new Logger(TokenManagementService.name);
  private readonly discordApiUrl: string;
  private readonly requestTimeout: number;
  private readonly retryAttempts: number;

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
    private configService: ConfigService,
    private encryptionService: EncryptionService,
  ) {
    this.discordApiUrl = this.configService.get<string>('discord.apiUrl', 'https://discord.com/api');
    this.requestTimeout = this.configService.get<number>('discord.timeout', 10000);
    this.retryAttempts = this.configService.get<number>('discord.retryAttempts', 3);
  }

  /**
   * Validate Discord access token without storing it
   * Single Responsibility: Token validation
   */
  async validateDiscordToken(accessToken: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.discordApiUrl}/users/@me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }).pipe(
          timeout(this.requestTimeout),
          retry(this.retryAttempts),
          catchError((error: AxiosError) => {
            this.logger.warn(`Discord token validation failed: ${error.message}`);
            throw new UnauthorizedException('Invalid Discord token');
          })
        )
      );

      return response.status === 200;
    } catch (error) {
      this.logger.error('Discord token validation error:', error);
      return false;
    }
  }

  /**
   * Refresh Discord access token using refresh token
   * Single Responsibility: Token refresh logic
   */
  async refreshDiscordToken(userId: string): Promise<string | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { refreshToken: true },
      });

      if (!user?.refreshToken) {
        this.logger.warn(`No refresh token found for user ${userId}`);
        return null;
      }

      // Decrypt refresh token
      const refreshToken = this.encryptionService.decrypt(user.refreshToken);

      const response = await firstValueFrom(
        this.httpService.post('https://discord.com/api/oauth2/token', {
          client_id: this.configService.get<string>('discord.clientId'),
          client_secret: this.configService.get<string>('discord.clientSecret'),
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }).pipe(
          timeout(this.requestTimeout),
          retry(this.retryAttempts),
          catchError((error: AxiosError) => {
            this.logger.error(`Token refresh failed for user ${userId}:`, error);
            throw new UnauthorizedException('Failed to refresh Discord token');
          })
        )
      );

      const { access_token, refresh_token } = response.data;

      // Encrypt new refresh token
      const encryptedRefreshToken = this.encryptionService.encrypt(refresh_token);

      // Update user tokens atomically
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          accessToken: access_token,
          refreshToken: encryptedRefreshToken,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Successfully refreshed token for user ${userId}`);
      return access_token;
    } catch (error) {
      this.logger.error(`Token refresh error for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Get valid access token for user (refresh if needed)
   * Single Responsibility: Token retrieval with automatic refresh
   */
  async getValidAccessToken(userId: string): Promise<string | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { accessToken: true },
      });

      if (!user?.accessToken) {
        return null;
      }

      // Validate current token
      const isValid = await this.validateDiscordToken(user.accessToken);
      if (isValid) {
        return user.accessToken;
      }

      // Try to refresh token
      return await this.refreshDiscordToken(userId);
    } catch (error) {
      this.logger.error(`Error getting valid access token for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Revoke Discord tokens and clear from database
   * Single Responsibility: Token revocation and cleanup
   */
  async revokeTokens(userId: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { accessToken: true },
      });

      if (user?.accessToken) {
        // Revoke token with Discord
        await firstValueFrom(
          this.httpService.post('https://discord.com/api/oauth2/token/revoke', {
            client_id: this.configService.get<string>('discord.clientId'),
            client_secret: this.configService.get<string>('discord.clientSecret'),
            token: user.accessToken,
          }).pipe(
            timeout(this.requestTimeout),
            catchError((error: AxiosError) => {
              this.logger.warn(`Failed to revoke Discord token: ${error.message}`);
              return of(null as any); // Don't throw, continue with cleanup
            })
          )
        );
      }

      // Clear tokens from database
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          accessToken: null,
          refreshToken: null,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Successfully revoked tokens for user ${userId}`);
    } catch (error) {
      this.logger.error(`Token revocation error for user ${userId}:`, error);
      throw error;
    }
  }
}
