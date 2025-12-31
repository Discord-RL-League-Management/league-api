import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import type { IConfigurationService } from '../../infrastructure/configuration/interfaces/configuration.interface';
import type { ILoggingService } from '../../infrastructure/logging/interfaces/logging.interface';

@Injectable()
export class BotApiKeyStrategy extends PassportStrategy(
  Strategy,
  'bot-api-key',
) {
  private readonly serviceName = BotApiKeyStrategy.name;
  private readonly apiKeyHash: string;

  constructor(
    @Inject('IConfigurationService')
    private configService: IConfigurationService,
    @Inject('ILoggingService')
    private readonly loggingService: ILoggingService,
  ) {
    super();
    // Pre-hash API key to enable constant-time comparison and prevent timing attacks
    const botApiKey = this.configService.get<string>('auth.botApiKey');
    if (!botApiKey) {
      throw new Error('BOT_API_KEY environment variable is required');
    }
    const apiKeySalt = this.configService.get<string>('auth.apiKeySalt');
    if (!apiKeySalt) {
      throw new Error('API_KEY_SALT environment variable is required');
    }
    this.apiKeyHash = this.hashApiKey(botApiKey);
  }

  validate(req: Request): { type: 'bot' } {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      this.loggingService.warn(
        `Missing or invalid authorization header - IP: ${req.ip}, User-Agent: ${req.get('User-Agent')}`,
        this.serviceName,
      );
      throw new UnauthorizedException('Missing authorization header');
    }

    const providedKey = authHeader.substring(7);
    const providedKeyHash = this.hashApiKey(providedKey);

    // Use timing-safe comparison to prevent timing attacks
    if (
      !timingSafeEqual(
        Buffer.from(this.apiKeyHash),
        Buffer.from(providedKeyHash),
      )
    ) {
      this.loggingService.warn(
        `Invalid API key provided - IP: ${req.ip}, User-Agent: ${req.get('User-Agent')}`,
        this.serviceName,
      );
      throw new UnauthorizedException('Invalid API key');
    }

    return { type: 'bot' };
  }

  private hashApiKey(key: string): string {
    const salt = this.configService.get<string>('auth.apiKeySalt');
    if (!salt) {
      throw new Error('API_KEY_SALT environment variable is required');
    }
    return createHmac('sha256', salt).update(key).digest('hex');
  }
}
