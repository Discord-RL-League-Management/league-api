import { ParseIntPipe, BadRequestException } from '@nestjs/common';

// Provides consistent error messages for integer validation failures across all endpoints
export class ParseIntPipeWithError extends ParseIntPipe {
  constructor() {
    super({
      exceptionFactory: (error) => {
        throw new BadRequestException(`Invalid integer: ${error}`);
      },
    });
  }
}
