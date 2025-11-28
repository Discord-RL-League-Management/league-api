import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { isUUID } from 'class-validator';

// Validates UUID format to prevent invalid ID format errors before database queries
@Injectable()
export class ParseUUIDPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isUUID(value)) {
      throw new BadRequestException(`Invalid UUID format: ${value}`);
    }
    return value;
  }
}
