import {
  PipeTransform,
  Injectable,
  BadRequestException,
  ArgumentMetadata,
} from '@nestjs/common';

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
    if (value === undefined || value === null) {
      return undefined;
    }

    const enumValues = Object.values(this.enumObject);

    if (enumValues.includes(value as T[keyof T])) {
      return value as T[keyof T];
    }

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
