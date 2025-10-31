import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;

    // Map Prisma error codes to HTTP status and messages
    const errorMap: Record<
      string,
      { status: HttpStatus; message: string; code: string }
    > = {
      P2002: {
        status: HttpStatus.CONFLICT,
        message: 'Unique constraint violation',
        code: 'UNIQUE_CONSTRAINT_VIOLATION',
      },
      P2025: {
        status: HttpStatus.NOT_FOUND,
        message: 'Record not found',
        code: 'RECORD_NOT_FOUND',
      },
      P2003: {
        status: HttpStatus.BAD_REQUEST,
        message: 'Foreign key constraint violation',
        code: 'FOREIGN_KEY_CONSTRAINT_VIOLATION',
      },
      P2014: {
        status: HttpStatus.BAD_REQUEST,
        message: 'Invalid ID provided',
        code: 'INVALID_ID',
      },
      P2005: {
        status: HttpStatus.BAD_REQUEST,
        message: 'Invalid field value',
        code: 'INVALID_FIELD_VALUE',
      },
    };

    const errorInfo =
      errorMap[exception.code] || {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Database error',
        code: 'DATABASE_ERROR',
      };

    response.status(errorInfo.status).json({
      statusCode: errorInfo.status,
      timestamp,
      path,
      method,
      message: errorInfo.message,
      code: errorInfo.code,
      details: exception.meta,
    });
  }
}
