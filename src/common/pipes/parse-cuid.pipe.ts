import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseCUIDPipe implements PipeTransform<string, string> {
  private readonly CUID_PATTERN = /^c[a-z0-9]{24}$/;

  transform(value: string): string {
    if (!this.CUID_PATTERN.test(value)) {
      throw new BadRequestException(`Invalid CUID format: ${value}`);
    }
    return value;
  }
}
