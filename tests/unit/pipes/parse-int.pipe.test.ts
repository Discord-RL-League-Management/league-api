/**
 * ParseIntPipeWithError Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ParseIntPipeWithError } from '@/common/pipes/parse-int.pipe';

describe('ParseIntPipeWithError', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should_parse_valid_integer_string', async () => {
    // ARRANGE
    const pipe = new ParseIntPipeWithError();
    const value = '123';

    // ACT
    const result = await pipe.transform(value, {} as any);

    // ASSERT
    expect(result).toBe(123);
  });

  it('should_parse_negative_integer_string', async () => {
    // ARRANGE
    const pipe = new ParseIntPipeWithError();
    const value = '-456';

    // ACT
    const result = await pipe.transform(value, {} as any);

    // ASSERT
    expect(result).toBe(-456);
  });

  it('should_throw_BadRequestException_when_value_is_not_a_number', async () => {
    // ARRANGE
    const pipe = new ParseIntPipeWithError();
    const value = 'not_a_number';

    // ACT & ASSERT
    await expect(pipe.transform(value, {} as any)).rejects.toThrow(
      BadRequestException,
    );
    await expect(pipe.transform(value, {} as any)).rejects.toThrow(
      'Invalid integer',
    );
  });

  it('should_throw_BadRequestException_when_value_is_float', async () => {
    // ARRANGE
    const pipe = new ParseIntPipeWithError();
    const value = '123.45';

    // ACT & ASSERT
    await expect(pipe.transform(value, {} as any)).rejects.toThrow(
      BadRequestException,
    );
  });
});
