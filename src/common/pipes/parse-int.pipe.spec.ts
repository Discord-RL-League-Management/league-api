/**
 * ParseIntPipeWithError Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ParseIntPipeWithError } from './parse-int.pipe';

describe('ParseIntPipeWithError', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should_parse_valid_integer_string', async () => {
    const pipe = new ParseIntPipeWithError();
    const value = '123';

    const result = await pipe.transform(value, {} as any);

    expect(result).toBe(123);
  });

  it('should_parse_negative_integer_string', async () => {
    const pipe = new ParseIntPipeWithError();
    const value = '-456';

    const result = await pipe.transform(value, {} as any);

    expect(result).toBe(-456);
  });

  it('should_throw_BadRequestException_when_value_is_not_a_number', async () => {
    const pipe = new ParseIntPipeWithError();
    const value = 'not_a_number';

    await expect(pipe.transform(value, {} as any)).rejects.toThrow(
      BadRequestException,
    );
    await expect(pipe.transform(value, {} as any)).rejects.toThrow(
      'Invalid integer',
    );
  });

  it('should_throw_BadRequestException_when_value_is_float', async () => {
    const pipe = new ParseIntPipeWithError();
    const value = '123.45';

    await expect(pipe.transform(value, {} as any)).rejects.toThrow(
      BadRequestException,
    );
  });
});
