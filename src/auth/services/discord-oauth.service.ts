import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  global_name?: string;
  avatar?: string;
  email?: string;
}

@Injectable()
export class DiscordOAuthService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly authorizationUrl = 'https://discord.com/api/oauth2/authorize';
  private readonly tokenUrl = 'https://discord.com/api/oauth2/token';
  private readonly userUrl = 'https://discord.com/api/users/@me';

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.clientId = this.configService.get<string>('discord.clientId')!;
    this.clientSecret = this.configService.get<string>('discord.clientSecret')!;
    this.redirectUri = this.configService.get<string>('discord.callbackUrl')!;

    // Debug logging
    console.log('DiscordOAuthService Config:');
    console.log('  clientId:', this.clientId);
    console.log('  clientSecret:', this.clientSecret ? '***' : 'undefined');
    console.log('  redirectUri:', this.redirectUri);
  }

  /**
   * Generate Discord OAuth2 authorization URL
   * Following: https://discord.com/developers/docs/topics/oauth2#authorization-code-grant
   */
  getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'identify email',
    });

    return `${this.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   * Following: https://discord.com/developers/docs/topics/oauth2#authorization-code-grant-access-token-exchange-example
   */
  async exchangeCode(code: string): Promise<DiscordTokenResponse> {
    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri,
    });

    try {
      const response = await firstValueFrom(
        this.httpService.post<DiscordTokenResponse>(
          this.tokenUrl,
          params.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      return response.data;
    } catch (error: any) {
      throw new HttpException(
        'Failed to exchange authorization code',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  /**
   * Get user information from Discord
   * Following: https://discord.com/developers/docs/resources/user#get-current-user
   */
  async getUserInfo(accessToken: string): Promise<DiscordUser> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<DiscordUser>(this.userUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      );

      return response.data;
    } catch (error: any) {
      throw new HttpException(
        'Failed to fetch user information',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
