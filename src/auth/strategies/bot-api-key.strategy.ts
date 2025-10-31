import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BotApiKeyStrategy extends PassportStrategy(
  Strategy,
  'bot-api-key',
) {
  private readonly logger = new Logger(BotApiKeyStrategy.name);
  private readonly apiKeyHash: string;

  constructor(private configService: ConfigService) {
    super();
    // Hash the API key for constant-time comparison
    const botApiKey = this.configService.get<string>('auth.botApiKey');
    if (!botApiKey) {
      throw new Error('BOT_API_KEY environment variable is required');
    }
    this.apiKeyHash = this.hashApiKey(botApiKey);
  }

  async validate(req: Request): Promise<{ type: 'bot' }> {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      this.logger.warn('Missing or invalid authorization header', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
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
      this.logger.warn('Invalid API key provided', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      throw new UnauthorizedException('Invalid API key');
    }

    return { type: 'bot' };
  }

  private hashApiKey(key: string): string {
    const salt = this.configService.get<string>('auth.apiKeySalt', 'default-salt');
    return createHmac('sha256', salt)
      .update(key)
      .digest('hex');
  }
}
