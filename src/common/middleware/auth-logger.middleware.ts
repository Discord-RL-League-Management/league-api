import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { LogSanitizer } from '../utils/log-sanitizer';

/**
 * AuthLoggerMiddleware - Logs authentication method for each request
 *
 * Single Responsibility: Only logs auth type, doesn't handle authentication itself
 * Separation of Concerns: Logging separated from authentication logic
 * Modularity: Can be easily enabled/disabled or replaced
 *
 * Security: Uses hash-based comparison to prevent API key exposure in logs or memory
 *
 * Reference: NestJS Middleware
 * https://docs.nestjs.com/middleware
 */
@Injectable()
export class AuthLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('AuthLogger');
  private readonly botApiKeyHash: string;
  private readonly apiKeySalt: string;

  constructor(private configService: ConfigService) {
    // Pre-hash API key to enable constant-time comparison and prevent timing attacks
    const botApiKey = this.configService.get<string>('auth.botApiKey', '');
    const apiKeySalt = this.configService.get<string>('auth.apiKeySalt', '');

    if (!botApiKey || !apiKeySalt) {
      throw new Error('BOT_API_KEY and API_KEY_SALT must be configured');
    }

    this.apiKeySalt = apiKeySalt;
    this.botApiKeyHash = this.hashApiKey(botApiKey);
  }

  use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    const { method, path } = req;

    const sanitizedHeaders = LogSanitizer.sanitizeHeaders(
      req.headers as Record<string, unknown>,
    );
    const sanitizedAuthHeader = sanitizedHeaders.authorization as
      | string
      | undefined;

    if (sanitizedAuthHeader) {
      try {
        const isBotRequest = this.isBotRequest(authHeader);
        if (isBotRequest) {
          this.logger.log(`Bot request: ${method} ${path}`);
        } else {
          this.logger.log(`User request: ${method} ${path}`);
        }
      } catch {
        // Error handling that never exposes API key
        this.logger.warn(`Error determining request type: ${method} ${path}`);
        this.logger.log(`User request: ${method} ${path}`);
      }
    } else {
      this.logger.log(`Unauthenticated request: ${method} ${path}`);
    }

    next();
  }

  private isBotRequest(authHeader: string | undefined): boolean {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }

    const providedKey = authHeader.substring(7);
    const providedKeyHash = this.hashApiKey(providedKey);

    // Use timing-safe comparison to prevent timing attacks
    try {
      return timingSafeEqual(
        Buffer.from(this.botApiKeyHash),
        Buffer.from(providedKeyHash),
      );
    } catch {
      // timingSafeEqual throws if buffers have different lengths, indicating keys don't match
      return false;
    }
  }

  private hashApiKey(key: string): string {
    // Use stored salt for consistency (validated at construction)
    // Keep runtime check as defense-in-depth (though config shouldn't change)
    if (!this.apiKeySalt) {
      throw new Error(
        'API_KEY_SALT is not configured - middleware initialization failed',
      );
    }
    return createHmac('sha256', this.apiKeySalt).update(key).digest('hex');
  }
}
