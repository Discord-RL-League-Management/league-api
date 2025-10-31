import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

/**
 * AuthLoggerMiddleware - Logs authentication method for each request
 *
 * Single Responsibility: Only logs auth type, doesn't handle authentication itself
 * Separation of Concerns: Logging separated from authentication logic
 * Modularity: Can be easily enabled/disabled or replaced
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

    if (authHeader) {
      // Check which type of auth is being used
      if (authHeader === `Bearer ${this.botApiKey}`) {
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
