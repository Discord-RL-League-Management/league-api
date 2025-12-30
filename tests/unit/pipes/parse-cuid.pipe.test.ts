/**
 * ParseCuidPipe Unit Tests
 *
 * Demonstrates TDD methodology with Vitest.
 * Focus: Functional core, state verification, fast execution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ParseCUIDPipe } from '@/common/pipes/parse-cuid.pipe';

describe('ParseCUIDPipe', () => {
  let pipe: ParseCUIDPipe;

  beforeEach(() => {
    pipe = new ParseCUIDPipe();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should_return_valid_cuid', () => {
    const value = 'clx1234567890abcdefghijkl';

    const result = pipe.transform(value);

    expect(result).toBe(value);
  });

  it('should_throw_BadRequestException_when_cuid_too_short', () => {
    const value = 'clx123';

    expect(() => pipe.transform(value)).toThrow(BadRequestException);
    expect(() => pipe.transform(value)).toThrow('Invalid CUID format');
  });

  it('should_throw_BadRequestException_when_cuid_too_long', () => {
    const value = 'clx1234567890abcdefghijklmnop';

    expect(() => pipe.transform(value)).toThrow(BadRequestException);
  });

  it('should_throw_BadRequestException_when_cuid_does_not_start_with_c', () => {
    const value = 'xlx1234567890abcdefghijkl';

    expect(() => pipe.transform(value)).toThrow(BadRequestException);
  });

  it('should_throw_BadRequestException_when_cuid_contains_invalid_characters', () => {
    const value = 'clx1234567890ABCDEFGHIJKL';

    expect(() => pipe.transform(value)).toThrow(BadRequestException);
  });

  it('should_throw_BadRequestException_when_cuid_contains_special_characters', () => {
    const value = 'clx1234567890-abcdefghijkl';

    expect(() => pipe.transform(value)).toThrow(BadRequestException);
  });
});
