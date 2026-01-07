import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
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

@Injectable()
export class DiscordOAuthService {
  private readonly logger = new Logger(DiscordOAuthService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly authorizationUrl =
    'https://discord.com/api/oauth2/authorize';
  private readonly tokenUrl = 'https://discord.com/api/oauth2/token';

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.clientId = this.configService.get<string>('discord.clientId')!;
    this.clientSecret = this.configService.get<string>('discord.clientSecret')!;
    this.redirectUri = this.configService.get<string>('discord.callbackUrl')!;

    this.logger.debug('DiscordOAuthService Config', {
      clientId: this.clientId,
      redirectUri: this.redirectUri,
      hasClientSecret: !!this.clientSecret,
    });
  }

  /**
   * Generate Discord OAuth2 authorization URL
   * Following: https://discord.com/developers/docs/topics/oauth2#authorization-code-grant
   * @param state - Optional OAuth state parameter for CSRF protection
   */
  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'identify email guilds guilds.members.read',
    });

    if (state) {
      params.append('state', state);
    }

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
    } catch {
      throw new HttpException(
        'Failed to exchange authorization code',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
