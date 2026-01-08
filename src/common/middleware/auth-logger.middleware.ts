import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import { LogSanitizer } from '../utils/log-sanitizer';

/**
 * AuthLoggerMiddleware - Logs authentication method for each request
 *
 * Single Responsibility: Only logs auth type, doesn't handle authentication itself
 * Separation of Concerns: Logging separated from authentication logic
 * Modularity: Can be easily enabled/disabled or replaced
 *
 * Reference: NestJS Middleware
 * https://docs.nestjs.com/middleware
 */
@Injectable()
export class AuthLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('AuthLogger');
  private readonly botApiKey: string;

  constructor(private configService: ConfigService) {
    this.botApiKey = this.configService.get<string>('auth.botApiKey', '');
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
      const isBotRequest = authHeader === `Bearer ${this.botApiKey}`;
      if (isBotRequest) {
        this.logger.log(`Bot request: ${method} ${path}`);
      } else {
        this.logger.log(`User request: ${method} ${path}`);
      }
    } else {
      this.logger.log(`Unauthenticated request: ${method} ${path}`);
    }

    next();
  }
}
