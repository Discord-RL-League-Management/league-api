import { Injectable, NestMiddleware, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ILoggingService } from '../../infrastructure/logging/interfaces/logging.interface';
import { IConfigurationService } from '../../infrastructure/configuration/interfaces/configuration.interface';

/**
 * AuthLoggerMiddleware - Logs authentication method for each request
 */
@Injectable()
export class AuthLoggerMiddleware implements NestMiddleware {
  private readonly serviceName = 'AuthLogger';
  private readonly botApiKey: string;

  constructor(
    @Inject(IConfigurationService)
    private configService: IConfigurationService,
    @Inject(ILoggingService)
    private readonly loggingService: ILoggingService,
  ) {
    this.botApiKey = this.configService.get<string>('auth.botApiKey', '') ?? '';
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
