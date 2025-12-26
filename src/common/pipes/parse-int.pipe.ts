import { ParseIntPipe, BadRequestException } from '@nestjs/common';

export class ParseIntPipeWithError extends ParseIntPipe {
  constructor() {
    super({
      exceptionFactory: (error) => {
        return new BadRequestException(`Invalid integer: ${error}`);
      },
    });
  }
}
