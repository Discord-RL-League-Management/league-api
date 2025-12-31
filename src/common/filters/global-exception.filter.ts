import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import type { ILoggingService } from '../../infrastructure/logging/interfaces/logging.interface';

interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  stack?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly serviceName = GlobalExceptionFilter.name;
  private readonly isDevelopment: boolean;

  constructor(
    private configService: ConfigService,
    @Inject('ILoggingService')
    private readonly loggingService: ILoggingService,
  ) {
    this.isDevelopment =
      this.configService.get<string>('app.nodeEnv', 'development') ===
      'development';
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);

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

      const isObjectResponse =
        typeof exceptionResponse === 'object' && exceptionResponse !== null;
      const errorData = isObjectResponse
        ? (exceptionResponse as Record<string, unknown>)
        : { message: String(exceptionResponse) };

      return {
        statusCode: status,
        timestamp,
        path,
        method,
        message: this.extractErrorMessage(errorData.message),
        code: typeof errorData.code === 'string' ? errorData.code : undefined,
        details:
          typeof errorData.details === 'object' && errorData.details !== null
            ? (errorData.details as Record<string, unknown>)
            : undefined,
        stack: this.isDevelopment ? exception.stack : undefined,
      };
    }

    if (exception === null || exception === undefined) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp,
        path,
        method,
        message: 'Internal server error',
        stack: undefined,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp,
      path,
      method,
      message: 'Internal server error',
      stack: this.isDevelopment ? (exception as Error)?.stack : undefined,
    };
  }

  /**
   * Extract and format error message from various types
   *
   * @param message - The message value to extract (can be string, object, number, boolean, null, or undefined)
   * @returns Formatted string message
   */
  private extractErrorMessage(message: unknown): string {
    if (typeof message === 'string') {
      return message;
    }

    if (typeof message === 'object' && message !== null) {
      return JSON.stringify(message);
    }

    if (typeof message === 'number' || typeof message === 'boolean') {
      return String(message);
    }

    return 'Unknown error';
  }

  private logError(
    exception: unknown,
    request: Request,
    errorResponse: ErrorResponse,
  ): void {
    const { method, url } = request;

    if (errorResponse.statusCode >= 500) {
      const errorMessage =
        exception instanceof Error ? exception.message : String(exception);
      const errorStack =
        exception instanceof Error ? exception.stack : undefined;
      this.loggingService.error(
        `${method} ${url} - ${errorResponse.statusCode} - ${errorResponse.message}: ${errorMessage}`,
        errorStack,
        this.serviceName,
      );
    } else {
      this.loggingService.warn(
        `${method} ${url} - ${errorResponse.statusCode} - ${errorResponse.message}`,
        this.serviceName,
      );
    }
  }
}
