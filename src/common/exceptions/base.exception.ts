import { HttpException, HttpStatus } from '@nestjs/common';

export abstract class BaseException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus,
    public readonly code?: string,
    public readonly details?: Record<string, any>
  ) {
    super({ message, code, details }, status);
  }
}

export class UnauthorizedException extends BaseException {
  constructor(message: string = 'Unauthorized') {
    super(message, HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED');
  }
}
