import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';

interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string;
  code?: string;
  details?: Record<string, any>;
  stack?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  private readonly isDevelopment: boolean;

  constructor(private configService: ConfigService) {
    this.isDevelopment =
      this.configService.get<string>('app.nodeEnv', 'development') ===
      'development';
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);

    // Log error
    this.logError(exception, request, errorResponse);

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private buildErrorResponse(
    exception: unknown,
    request: Request,
  ): ErrorResponse {
    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Handle both string and object responses from HttpException
      // When InternalServerErrorException is thrown with an object like:
      // new InternalServerErrorException({ message, code, details }),
      // the exceptionResponse will be that object
      const isObjectResponse =
        typeof exceptionResponse === 'object' && exceptionResponse !== null;
      const errorData = isObjectResponse
        ? (exceptionResponse as any)
        : { message: exceptionResponse };

      return {
        statusCode: status,
        timestamp,
        path,
        method,
        message: errorData.message || 'Unknown error',
        code: errorData.code,
        details: errorData.details,
        stack: this.isDevelopment ? exception.stack : undefined,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp,
      path,
      method,
      message: 'Internal server error',
      stack: this.isDevelopment ? (exception as Error).stack : undefined,
    };
  }

  private logError(
    exception: unknown,
    request: Request,
    errorResponse: ErrorResponse,
  ): void {
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || 'Unknown';

    if (errorResponse.statusCode >= 500) {
      this.logger.error(
        `${method} ${url} - ${errorResponse.statusCode} - ${errorResponse.message}`,
        {
          exception: exception instanceof Error ? exception.stack : exception,
          request: { method, url, ip, userAgent },
          error: errorResponse,
        },
      );
    } else {
      this.logger.warn(
        `${method} ${url} - ${errorResponse.statusCode} - ${errorResponse.message}`,
        { request: { method, url, ip, userAgent }, error: errorResponse },
      );
    }
  }
}
