import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * BaseException - Base class for all custom exceptions
 * Single Responsibility: Provides consistent exception structure
 */
export abstract class BaseException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus,
    public readonly code?: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super({ message, code, details }, status);
  }
}

/**
 * ValidationException - For input validation errors
 */
export class ValidationException extends BaseException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', details);
  }
}

/**
 * NotFoundException - For resource not found errors
 */
export class NotFoundException extends BaseException {
  constructor(resource: string, identifier: string) {
    super(
      `${resource} with identifier '${identifier}' not found`,
      HttpStatus.NOT_FOUND,
      'NOT_FOUND',
      { resource, identifier },
    );
  }
}

/**
 * ConflictException - For resource conflict errors
 */
export class ConflictException extends BaseException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, HttpStatus.CONFLICT, 'CONFLICT', details);
  }
}

/**
 * UnauthorizedException - For authentication errors
 */
export class UnauthorizedException extends BaseException {
  constructor(message: string = 'Unauthorized') {
    super(message, HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED');
  }
}

/**
 * ForbiddenException - For authorization errors
 */
export class ForbiddenException extends BaseException {
  constructor(message: string = 'Forbidden') {
    super(message, HttpStatus.FORBIDDEN, 'FORBIDDEN');
  }
}
