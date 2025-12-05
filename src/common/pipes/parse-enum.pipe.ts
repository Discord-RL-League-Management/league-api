import {
  PipeTransform,
  Injectable,
  BadRequestException,
  ArgumentMetadata,
} from '@nestjs/common';

// Validates enum query/route parameters to prevent invalid enum values from reaching business logic
@Injectable()
export class ParseEnumPipe<T extends object>
  implements PipeTransform<string | undefined, T[keyof T] | undefined>
{
  constructor(private enumObject: T) {}

  transform(
    value: string | undefined,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _metadata: ArgumentMetadata,
  ): T[keyof T] | undefined {
    // Optional parameters may be undefined, so we allow them to pass through without validation
    if (value === undefined || value === null) {
      return undefined;
    }

    const enumValues = Object.values(this.enumObject);

    // Check if value matches as-is (for string enums)
    if (enumValues.includes(value as T[keyof T])) {
      return value as T[keyof T];
    }

    // For numeric enums, try converting string to number
    // This handles the case where HTTP query parameters arrive as strings (e.g., '1')
    // but the enum values are numbers (e.g., NumberEnum.ONE = 1)
    const numericValue = Number(value);
    if (
      !isNaN(numericValue) &&
      enumValues.includes(numericValue as T[keyof T])
    ) {
      return numericValue as T[keyof T];
    }

    throw new BadRequestException(`Invalid enum value: ${value}`);
  }
}
