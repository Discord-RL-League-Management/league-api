import { PipeTransform, Injectable, BadRequestException, ArgumentMetadata } from '@nestjs/common';

// Validates enum query/route parameters to prevent invalid enum values from reaching business logic
@Injectable()
export class ParseEnumPipe<T extends object> implements PipeTransform<string | undefined, T[keyof T] | undefined> {
  constructor(private enumObject: T) {}

  transform(value: string | undefined, _metadata: ArgumentMetadata): T[keyof T] | undefined {
    // Optional parameters may be undefined, so we allow them to pass through without validation
    if (value === undefined || value === null) {
      return undefined;
    }
    const enumValues = Object.values(this.enumObject);
    if (!enumValues.includes(value as T[keyof T])) {
      throw new BadRequestException(`Invalid enum value: ${value}`);
    }
    return value as T[keyof T];
  }
}

