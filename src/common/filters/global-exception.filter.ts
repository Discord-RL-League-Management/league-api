import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
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

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);
    
    // Log error
    this.logError(exception, request, errorResponse);

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private buildErrorResponse(exception: unknown, request: Request): ErrorResponse {
    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      return {
        statusCode: status,
        timestamp,
        path,
        method,
        message: typeof exceptionResponse === 'string' 
          ? exceptionResponse 
          : (exceptionResponse as any).message || 'Unknown error',
        code: (exceptionResponse as any).code,
        details: (exceptionResponse as any).details,
        stack: process.env.NODE_ENV === 'development' ? exception.stack : undefined,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp,
      path,
      method,
      message: 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? (exception as Error).stack : undefined,
    };
  }

  private logError(exception: unknown, request: Request, errorResponse: ErrorResponse): void {
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || 'Unknown';

    if (errorResponse.statusCode >= 500) {
      this.logger.error(
        `${method} ${url} - ${errorResponse.statusCode} - ${errorResponse.message}`,
        {
          exception: exception instanceof Error ? exception.stack : exception,
          request: { method, url, ip, userAgent },
          error: errorResponse,
        }
      );
    } else {
      this.logger.warn(
        `${method} ${url} - ${errorResponse.statusCode} - ${errorResponse.message}`,
        { request: { method, url, ip, userAgent }, error: errorResponse }
      );
    }
  }
}
