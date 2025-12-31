import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import type { IConfigurationService } from '../../infrastructure/configuration/interfaces/configuration.interface';
import type { ILoggingService } from '../../infrastructure/logging/interfaces/logging.interface';
import { firstValueFrom, timeout, retry, catchError, of } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';
import { UsersService } from '../../users/users.service';

@Injectable()
export class TokenManagementService {
  private readonly serviceName = TokenManagementService.name;
  private readonly discordApiUrl: string;
  private readonly requestTimeout: number;
  private readonly retryAttempts: number;

  constructor(
    private usersService: UsersService,
    private httpService: HttpService,
    @Inject('IConfigurationService')
    private configService: IConfigurationService,
    @Inject('ILoggingService')
    private readonly loggingService: ILoggingService,
  ) {
    this.discordApiUrl =
      this.configService.get<string>(
        'discord.apiUrl',
        'https://discord.com/api',
      ) || 'https://discord.com/api';
    this.requestTimeout =
      this.configService.get<number>('discord.timeout', 10000) || 10000;
    this.retryAttempts =
      this.configService.get<number>('discord.retryAttempts', 3) || 3;
  }

  /**
   * Validate Discord access token without storing it
   * Single Responsibility: Token validation
   */
  async validateDiscordToken(accessToken: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService
          .get(`${this.discordApiUrl}/users/@me`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          })
          .pipe(
            timeout(this.requestTimeout),
            retry(this.retryAttempts),
            catchError((error: AxiosError) => {
              this.loggingService.warn(
                `Discord token validation failed: ${error.message}`,
                this.serviceName,
              );
              throw new UnauthorizedException('Invalid Discord token');
            }),
          ),
      );

      return response.status === 200;
    } catch (error) {
      this.loggingService.error(
        `Discord token validation error: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      return false;
    }
  }

  /**
   * Refresh Discord access token using refresh token
   * Single Responsibility: Token refresh logic
   */
  async refreshDiscordToken(userId: string): Promise<string | null> {
    try {
      const tokens = await this.usersService.getUserTokens(userId);

      if (!tokens.refreshToken) {
        this.loggingService.warn(
          `No refresh token found for user ${userId}`,
          this.serviceName,
        );
        return null;
      }

      const response = await firstValueFrom(
        this.httpService
          .post('https://discord.com/api/oauth2/token', {
            client_id: this.configService.get<string>('discord.clientId'),
            client_secret: this.configService.get<string>(
              'discord.clientSecret',
            ),
            grant_type: 'refresh_token',
            refresh_token: tokens.refreshToken,
          })
          .pipe(
            timeout(this.requestTimeout),
            retry(this.retryAttempts),
            catchError((error: AxiosError) => {
              this.loggingService.error(
                `Token refresh failed for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined,
                this.serviceName,
              );
              throw new UnauthorizedException(
                'Failed to refresh Discord token',
              );
            }),
          ),
      );

      const { access_token, refresh_token } = response.data as {
        access_token: string;
        refresh_token: string;
      };

      // Update user tokens
      await this.usersService.updateUserTokens(userId, {
        accessToken: access_token,
        refreshToken: refresh_token,
      });

      this.loggingService.log(
        `Successfully refreshed token for user ${userId}`,
        this.serviceName,
      );
      return access_token;
    } catch (error) {
      this.loggingService.error(
        `Token refresh error for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      return null;
    }
  }

  /**
   * Get valid access token for user (refresh if needed)
   * Single Responsibility: Token retrieval with automatic refresh
   */
  async getValidAccessToken(userId: string): Promise<string | null> {
    try {
      const tokens = await this.usersService.getUserTokens(userId);

      if (!tokens.accessToken) {
        return null;
      }

      // Validate current token
      const isValid = await this.validateDiscordToken(tokens.accessToken);
      if (isValid) {
        return tokens.accessToken;
      }

      // Try to refresh token
      return await this.refreshDiscordToken(userId);
    } catch (error) {
      this.loggingService.error(
        `Error getting valid access token for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      return null;
    }
  }

  /**
   * Revoke Discord tokens and clear from database
   * Single Responsibility: Token revocation and cleanup
   */
  async revokeTokens(userId: string): Promise<void> {
    try {
      const tokens = await this.usersService.getUserTokens(userId);

      if (tokens.accessToken) {
        // Revoke token with Discord
        await firstValueFrom(
          this.httpService
            .post<unknown>('https://discord.com/api/oauth2/token/revoke', {
              client_id: this.configService.get<string>('discord.clientId'),
              client_secret: this.configService.get<string>(
                'discord.clientSecret',
              ),
              token: tokens.accessToken,
            })
            .pipe(
              timeout(this.requestTimeout),
              catchError((error: AxiosError) => {
                this.loggingService.warn(
                  `Failed to revoke Discord token: ${error.message}`,
                  this.serviceName,
                );
                return of({ data: undefined } as AxiosResponse<unknown>); // Don't throw, continue with cleanup
              }),
            ),
        );
      }

      // Clear tokens from database
      await this.usersService.updateUserTokens(userId, {
        accessToken: undefined,
        refreshToken: undefined,
      });

      this.loggingService.log(
        `Successfully revoked tokens for user ${userId}`,
        this.serviceName,
      );
    } catch (error) {
      this.loggingService.error(
        `Token revocation error for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.serviceName,
      );
      throw error;
    }
  }
}
