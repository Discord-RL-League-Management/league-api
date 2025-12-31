import { Injectable, NestMiddleware, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import { ILoggingService } from '../../infrastructure/logging/interfaces/logging.interface';

/**
 * AuthLoggerMiddleware - Logs authentication method for each request
 *
 * Single Responsibility: Only logs auth type, doesn't handle authentication itself
 * Separation of Concerns: Logging separated from authentication logic
 * Modularity: Can be easily enabled/disabled or replaced
 */
@Injectable()
export class AuthLoggerMiddleware implements NestMiddleware {
  private readonly serviceName = 'AuthLogger';
  private readonly botApiKey: string;

  constructor(
    private configService: ConfigService,
    @Inject(ILoggingService)
    private readonly loggingService: ILoggingService,
  ) {
    this.botApiKey = this.configService.get<string>('auth.botApiKey', '');
  }

  use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    const { method, path } = req;

    if (authHeader) {
      if (authHeader === `Bearer ${this.botApiKey}`) {
        this.loggingService.log(
          `Bot request: ${method} ${path}`,
          this.serviceName,
        );
      } else {
        this.loggingService.log(
          `User request: ${method} ${path}`,
          this.serviceName,
        );
      }
    } else {
      this.loggingService.log(
        `Unauthenticated request: ${method} ${path}`,
        this.serviceName,
      );
    }

    next();
  }
}
